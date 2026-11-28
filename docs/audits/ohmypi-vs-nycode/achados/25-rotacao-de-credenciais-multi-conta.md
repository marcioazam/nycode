# 25 — Rotação local multi-conta de credenciais e afinidade de sessão (`credential_pin`)

- **Classe**: **B** (altera `CredentialStore`, resolução de auth em runtime, interação com cache Anthropic ao trocar contas e exige substituir `bun:sqlite` por armazenamento compatível com Node `>=22.19` — *já `auth-broker`, `auth-gateway` e 27 scrapers `/usage` ficam rejeitados em [rejeitados.md](../rejeitados.md#r07---auth-broker-auth-gateway-27-scrapers-usage-e-bunsqlite-de-auth)*).
- **Prioridade**: **P3** (necessário apenas para usuários com múltiplas contas/assinaturas do mesmo provedor batendo em limites de taxa; sem retorno em benchmarks de chave única).

## O que o `omp` faz

O `omp` substituiu `auth.json` por SQLite (`agent.db` via `bun:sqlite`, `omp:packages/ai/src/auth/sqlite-credential-store.ts:7`), armazena N credenciais por provedor, fixa a conta escolhida na sessão com hash SHA-256 para não derrubar o prompt cache ao retomar (`omp:packages/coding-agent/src/session/credential-pin.ts:63-98`) e executa `RateLimits.rotate` (`omp:packages/ai/src/auth/rotation.ts:77-200`) + `withAuth`/`withOAuthAccess` (`omp:packages/ai/src/auth-retry.ts:333-638`) em erros 401/403/429:

```ts
export function recordCredentialPin(
   authStorage: AuthStorage,
   sessionManager: SessionManager,
   sessionId: string,
   provider: string,
): void {
   const identity = authStorage.oauth.identity(provider, sessionId);
   if (!identity) return;
   const hash = credentialPinHash(provider, identity);
   if (!hash || sessionManager.getCredentialPins().get(provider)?.hash === hash) return;
   sessionManager.appendCredentialPin(provider, hash);
}
```

- **Ancestralidade Pi**: `pi0.9.4:packages/coding-agent/src/oauth/storage.ts` e `pibase:packages/coding-agent/src/core/auth-storage.ts` armazenam estritamente **1 credencial por `providerId`**.

## Como o `nycode` faz

Em `packages/ai/src/auth/credential-store.ts:1-67`, `resolve.ts:33-217` e `packages/coding-agent/src/core/auth-storage.ts:1-508`:
- Armazena `auth.json` (`0o600`) protegido por `proper-lockfile` (`staleMs = 30_000`) com chave única por `providerId` e refresh OAuth com double-checked locking.
- Não suporta lista de contas alternativas no mesmo provedor, rotação em 429/quota, pools de contas por subagente nem `credential_pin`.
- Regra crítica de benchmark em `docs/bench/RUNBOOK.md:42-48`: tokens OAuth em runs paralelos nunca podem sofrer refresh/rotação concorrente entre containers para não revogar tokens compartilhados.

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Credenciais por provedor | N contas/chaves por provedor (`pool.ts`, `rotation.ts`) | 1 credencial por `providerId` (`core/auth-storage.ts:17`) |
| Storage | `bun:sqlite` (`sqlite-credential-store.ts:7`, `2.330` LOC) | `auth.json` + `proper-lockfile` (`508` LOC Node-compatível) |
| Preservação de cache entre contas | `credential_pin` na sessão + `SessionAffinity` (`credential-pin.ts:63-98`) | N/A (conta única por provedor) |

## Benefício

- **Problema**: usuários individuais com duas assinaturas/chaves (ex.: conta pessoal + conta secundária no mesmo provedor) que batem em janela de rate limit/cota de 5h precisam editar manualmente `~/.nycode/agent/auth.json` ou trocar variáveis de ambiente no meio do trabalho.
- **Solução enxuta (sem `bun:sqlite`, sem broker/gateway e sem 27 scrapers `/usage`)**: estender `auth.json` (com `proper-lockfile` já existente) para suportar opcionalmente múltiplas entradas por provedor (`accounts[]` + cooldown em memória/arquivo por erro 429/403) + `credential_pin` simples na sessão para manter afinidade com a mesma conta enquanto saudável — preservando compatibilidade direta com Node `>=22.19.0`.

## Custo

- **Tokens / turno**: **0** no prompt; **atenção ao cache**: trocar de conta no meio de uma sessão ativa derruba o prefix cache por conta (quando isolado por org/conta no provedor) — motivo exato pelo qual `credential_pin` precisa acompanhar qualquer suporte multi-conta.
- **Latência**: **< 1 ms** em leitura do `auth.json` já cacheado por revisão.
- **Manutenção**: ~350–450 LOC TS puro em `packages/ai/src/auth/` + `core/auth-storage.ts` (vs ~24k LOC no `omp`).

## Riscos

- **`bun:sqlite` incompatível**: o código original do `omp` usa `bun:sqlite`, `Bun.hash.xxHash32` e `Bun.CryptoHasher`, quebrando `packages/coding-agent/package.json:100` (`engines.node >= 22.19.0`) e a suíte Vitest em Node.
- **Refresh paralelo em `bench/` (`docs/bench/RUNBOOK.md:42-48`)**: rotação/refresh automático em ambiente headless de benchmark pode invalidar refresh tokens copiados entre containers; desligar rotação/refresh automático em `NYCODE_BENCH` / containers.
- **Privacidade / confusão de cobrança**: trocar automaticamente entre chave pessoal e chave corporativa sem visibilidade pode cobrar na conta errada; exibir claramente qual apelido de conta está ativo e exigir opt-in na configuração de contas múltiplas.

## Licença

**MIT** (`omp:LICENSE:1-23`).

## Proposta

- **`packages/ai/src/auth/{types.ts,credential-store.ts,resolve.ts}`**: permitir formato opcional multi-conta em `CredentialStore` (retrocompatível 100% com a entrada simples atual `{ type, ... }`), mantendo bloqueio temporário por cooldown local em 403/429 quando houver conta irmã configurada (sem raspar `/usage`).
- **`packages/coding-agent/src/core/auth-storage.ts` & `session-manager.ts`**: persistir opcionalmente `credential_pin` (hash SHA-256 por `node:crypto`) quando houver >1 conta configurada para manter prefix cache quente no resume.

## Testes

- `packages/coding-agent/test/auth-storage.test.ts` & `packages/ai/test/`: usando `InMemoryCredentialStore` / `mkdtemp`, testar formato único legado intacto, failover `conta1 (429) -> conta2 (200)`, cooldown e restauração de afinidade no resume da sessão via hash (`node:crypto`).

## Plano de eval

- **Base e candidato**: auth não altera prompts, schemas nem comportamento do modelo em conta única. Validar 100% offline via testes Vitest (`MockCredentialStore` + servidor HTTP loopback simulando 401/403/429), mais execução de sanidade em `suite.s1` (`pr_cases`) com `bench/run.py --dry-run` confirmando que o modo de conta única / benchmark não sofre rotação nem variação de custo. Não reexecutar `cc-vanilla`/`pi-vanilla`.

## Critérios de aceite

1. Retrocompatibilidade 100% com `auth.json` de conta única e execução limpa em Node `>=22.19.0`.
2. Rotação automática só ocorre quando o usuário cadastrou múltiplas contas explícitas (e nunca sob flag de benchmark offline/container).
3. `credential_pin` preserva a conta original quando disponível e saudável no resume.

## Rollback

Manter resolução singular de `auth.json` revertendo o array de contas irmãs e `credential_pin`.
