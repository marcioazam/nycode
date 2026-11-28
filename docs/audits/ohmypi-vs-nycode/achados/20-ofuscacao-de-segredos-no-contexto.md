# 20 — Ofuscação bidirecional de segredos em trânsito (`secrets/obfuscator`)

- **Classe**: **B** (transforma strings de mensagens enviadas ao provedor e argumentos de ferramentas na volta; tem risco não-nulo de falsos positivos e quebra de prefix cache — exige eval e testes rigorosos).
- **Prioridade**: **P2** (defesa em profundidade para usuários com chaves reais no `process.env` ou `.env`, complementando o bloqueio de leitura por arquivo em `core/permissions/`).

## O que o `omp` faz

O `omp` coleta valores sensíveis de `secrets.yml`, variáveis de `process.env` compatíveis com `SECRET_ENV_PATTERNS`, senhas em URLs de conexão e padrões `CREDENTIAL_PATTERNS` (`omp:packages/coding-agent/src/secrets/index.ts:166-293`), constrói um `SecretObfuscator` (`omp:packages/coding-agent/src/secrets/obfuscator.ts:216-350`) acoplado à transformação de mensagens (`sdk.ts:4981,5130`):

```ts
   /** Reverse lookup for LIVE deobfuscation (provider output, tool-call args):
    *  keyed placeholder → secret plus recursion policy. Only placeholders this
    *  obfuscator generated under the per-install key (and their friendly-name-
    *  independent aliases) live here, so a prompt-injected model cannot synthesize
    *  one without the key. */
   #deobfuscateMap = new TrackedMap<string, { secret: string; recursive: boolean }>(this.#revision);
```

- **Ida (antes do LLM)**: substitui ocorrências reais por placeholders determinísticos gerados com HMAC por instalação (`secret-placeholder.key`) para que um ataque de prompt injection não consiga adivinhar nem fabricar um placeholder.
- **Volta (antes da execução da tool)**: `deobfuscateToolArguments` restaura os valores originais nos argumentos de `edit`/`bash`/etc., permitindo até que o modelo edite código usando `oldText` com placeholder sem corromper o arquivo real.
- **Ancestralidade Pi**: ausente em `pi0.9.4` e `pibase`. Criação original do `omp`.

## Como o `nycode` faz

- O `nycode` possui controle de acesso por **caminho de arquivo** no motor de permissões (`packages/coding-agent/src/core/permissions/`, impedindo ler `.env`/chaves privadas quando configurado/restrito) e filtro de ambiente em algumas extensões/subagentes (`docs/MEMORY.md` e nota em `decisoes-nucleo-harness-pessoal-2026-11-24.md:19`).
- **Não há ofuscação bidirecional em memória/trânsito**: se um comando `bash env` ou erro de conexão HTTP imprimir `Bearer sk-...` ou `postgres://user:pass@...` no `toolResult`, essa string segue em claro para o provedor LLM (e é gravada no transcript JSONL se não filtrada).

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Proteção preventiva | `secrets/index.ts` + `SecretObfuscator` (`obfuscator.ts:216-350`) mascara strings antes do LLM e restaura nos args | `core/permissions/` bloqueia acesso a caminhos/ferramentas sensíveis antes da execução |
| Vazamento via stdout de `bash` | Substituído por token HMAC antes de deixar o processo | Vai em texto claro no `toolResult` do `bash` se o comando o imprimir |

## Benefício

- **Problema**: mesmo bloqueando `read(".env")`, scripts ou logs de depuração via `bash` frequentemente imprimem tokens de `process.env`, URLs JDBC/Postgres com senha ou chaves `sk-...`/`ghp_...`/`AKIA...` no `stdout`; uma vez no histórico, a string vaza para a API externa do provedor de LLM.
- **Solução**: um interceptor opcional (ativado para chaves reais de alta entropia/prefixo conhecido como `sk-`, `ghp_`, `xoxb-`, `AKIA`, credenciais em URL `scheme://user:pass@host` e variáveis `process.env` explícitas `>= 12` chars de entropia mínima) que mascara antes de chamar `streamFn` e desmascara argumentos de entrada em `tool_call`.

## Custo

- **Tokens / turno**: **0** fixo no prompt; placeholders têm tamanho similar ao original. Se um segredo aparecer no meio da conversa *depois* de já ter aparecido sem máscara ou mudar a lista, não altera mensagens passadas imutáveis se o mapa for estável por sessão.
- **Latência**: **< 2–5 ms** por varredura de contexto (exige atenção se houver milhares de mensagens; `#revision` / memoização por mensagem evita re-escanear histórico antigo).
- **Manutenção**: ~400–550 LOC TS puro (`obfuscator` + geração/persistência de chave HMAC em `~/.nycode/agent/`), zero dependências nativas.

## Riscos

- **Falsos positivos em fixtures/testes**: se o usuário tiver `TEST_TOKEN=test` ou `SECRET=123456` no ambiente, substituir `"test"` ou `"123456"` pelo código inteiro quebrará raciocínio e edições! Exigir comprimento mínimo (ex.: `>= 16` chars + checagem de prefixo conhecido ou entropia de Shannon para `process.env`) e **nunca** ofuscar palavras curtas/comuns.
- **Descasamento no `edit` / `bash`**: se o modelo ver o placeholder `[SECRET_...]` e escrever um teste literal ou `bash` contando caracteres, o comportamento muda; além disso, se `edit` tiver `newText` com parte literal diferente, precisa desmascaramento exato sem afetar falsos positivos.
- **Quebra de prefix cache**: se um novo segredo for adicionado dinamicamente em `secrets` mid-session e re-aplicado retroativamente a mensagens antigas, invalida todo o prefixo em cache! O conjunto de segredos precisa ser congelado no início da sessão (ou aplicar apenas sobre mensagens novas sem reescrever mensagens anteriores em cache).
- Docs: complementar a `docs/ADR.md` e `core/permissions/` (opt-in primeiro até provar zero falso positivo no `bench/`).

## Licença

**MIT** (`omp:LICENSE:1-23`).

## Proposta

- **`packages/coding-agent/src/extensions/secrets-obfuscator/`** (nova extensão opt-in inicialmente, <= 7 arquivos, <= 800 linhas cada conforme `AGENTS.md`):
  - Coleta conservadora no `session_start` (`CREDENTIAL_PATTERNS` de alta confiança + URLs `user:pass@` + `process.env` com chave sensível e valor `>= 16` chars de alta entropia — **excluindo** tokens curtos e fixtures comuns).
  - Hook `before_provider_request` / `context` transformando mensagens sem mutar mensagens antigas já estabilizadas; hook `tool_call` desmascarando placeholders gerados com HMAC antes de executar a tool.

## Testes

- `packages/coding-agent/test/harness/extensions/secrets-obfuscator/`:
  1. Tokens com prefixo conhecido (como chaves Anthropic `sk-ant-...`) e URLs com usuario e senha embutidos (esquema de banco com credencial em URL) sao substituidos antes da API e restaurados em argumentos de `edit`/`bash`.
  2. Placeholder forjado pelo modelo sem HMAC válido **não** resolve para segredo algum.
  3. Valores curtos (`SECRET=foo`, `PORT=5432`) **nunca** são tocados.

## Plano de eval

- **Base e candidato**: `nycode` vs `nycode + secrets-obfuscator` via `bench/run.py` + `bench/gate.py` em `suite.s1` (`pr_cases`, que possui vários testes de segurança `sec-*` em `bench/suites.toml:34-52`) e `suite.s2` (`tasks/tb2.json`), medindo especificamente taxa de falsos positivos (nenhuma quebra em código/testes com tokens simulados em `env`) e impacto em `cacheRead`/custo. Não reexecutar `cc-vanilla`/`pi-vanilla`.

## Critérios de aceite

1. Zero vazamento de credenciais de alta confiança nas requisições simuladas ao provedor.
2. Zero falsos positivos em `suite.s1`/`suite.s2` (`MARGIN = -0.10`, `PARITY_COST_MAX = 1.10`).

## Rollback

Desligar a extensão em `extensions/index.ts` (ou flag `secrets.obfuscate: false`).
