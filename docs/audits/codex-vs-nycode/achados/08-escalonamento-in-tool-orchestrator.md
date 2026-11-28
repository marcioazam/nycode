# Achado 08 — Escalonamento In-Turn no Estilo `ToolOrchestrator`

- **Classificação**: **Classe B** (altera o pipeline de execução do tool loop, fluxo de confirmação e comportamento visível ao modelo em casos recuperáveis).
- **Prioridade no backlog**: #8 (Classe B — **P1**).

## 1. Como o Codex faz

O Codex **não bloqueia preventivamente por suposição** quando a sandbox já está ativa: `ToolOrchestrator::run` executa a tentativa inicial sob restrição (`initial_attempt`) e intercepta `CodexErrorDetails::Sandbox(SandboxErr::Denied { output, network_policy_decision })`. Se a política permitir escalonamento, pede aprovação humana/automática e **re-executa a mesma chamada dentro do mesmo turno** (`codex-rs/core/src/tools/orchestrator.rs:395-475`), poupando um turno completo de ida ao LLM:

```rust
// codex-rs/core/src/tools/orchestrator.rs:395-445
        let (first_result, first_deferred_network_approval) =
            Self::run_attempt(tool, req, tool_ctx, &initial_attempt, network_approval_spec).await;
        let initial_duration = initial_attempt_start.elapsed();
        match first_result {
            Ok(out) => {
                // We have a successful initial result
                Ok(OrchestratorRunResult {
                    output: out,
                    deferred_network_approval: first_deferred_network_approval,
                })
            }
            Err(ToolError::Codex(err)) => {
                let CodexErrorDetails::Sandbox(SandboxErr::Denied {
                    output,
                    network_policy_decision,
                }) = err.details()
                else {
                    ...
                    return Err(err);
                };
```

## 2. Como o `nycode` faz

Em `packages/coding-agent/src/core/permissions/gate.ts:59-81`, todo julgamento ocorre **apenas antes** da execução da ferramenta em `gateToolCall`: se um comando parecer suspeito na heurística (`ask`) e estiver sem UI (`-p`), retorna `{ block: true, reason: outcome.reason }`; e se um comando aprovado pela heurística falhar em runtime por permissão/sandbox/escrita em diretório protegido (quando combinarmos com o [Achado 06](06-sandbox-os-bwrap-seccomp-seatbelt.md)), o `bash` apenas devolve o erro de texto ao LLM, exigindo outro turno de raciocínio + nova chamada de ferramenta para pedir ajuste ou alternativa.

## 3. Diferença Concreta

O modelo "Executa restrito -> falha por contenção -> escala in-turn (se política permite) -> re-executa sem voltar ao LLM" evita que o agente desperdice 1+ turno completo (com todo o prefixo reprocessado) repetindo comandos ou tentando contornos desnecessários. Sem UI (`Never` / `-p`), o `orchestrator` falha concisamente de volta ao modelo com o diagnóstico da negação.

## 4. Benefício e Custo

- **Benefício**: reduz turnos desperdiçados em falhas recuperáveis de permissão/sandbox em modo interativo (e prepara o terreno direto para o sandbox de OS do Achado 06 e auto-revisor do Achado 14).
- **Custo em tokens**: `0` tokens adicionais quando funciona na primeira tentativa; economiza ~`1` turno completo (~`1k–50k` tokens de contexto re-lido) sempre que recupera in-turn.
- **Custo em latência**: `-1` RTT de API LLM por recuperação; apenas latência da confirmação/re-execução local.
- **Custo de manutenção**: médio (~150 linhas encapsulando política de retry/escalation ao redor da execução de `bash`/`run`).

## 5. Riscos e Licença

- **Riscos**: efeitos colaterais parciais caso o comando falhe *no meio* antes de bater na sandbox e seja re-executado com privilégio maior sem idempotência. Mitigação: escalar automaticamente apenas quando detectada negação de sandbox/rede/guard antes de mutação destrutiva, exibindo exatamente o código de erro + saída da 1a tentativa ao usuário antes de confirmar.
- **Licença**: Codex (`Apache-2.0`, `LICENSE:1-201`); padrão clássico try-restricted-then-escalate implementado nativamente em TypeScript.

## 6. Proposta Técnica e Plano de Eval (Obrigatório — Classe B)

- **Arquivos a tocar no `nycode`**:
  - `packages/agent/src/agent-loop.ts` ou camada executora de `packages/coding-agent/src/core/tools/bash.ts`: introduzir erro tipado `SandboxDeniedError` (tagged union) capturável pelo wrapper de execução.
  - `packages/coding-agent/src/core/permissions/gate.ts`: adicionar função `handleSandboxEscalation(ctx, call, denied)` que em modo interativo (`ctx.hasUI`) exibe a negação e solicita confirmação única para re-executar sem a restrição específica (respeitando denylist absoluta sem jamais oferecer override para regras `deny`).
- **Testes unitários**:
  - Comando barrado por sandbox simulada com UI confirmando -> 2 execuções no mesmo turno sem nova chamada ao modelo; usuário recusando -> erro estruturado devolvido sem segunda execução; `-p` sem UI -> erro devolvido direto sem loop.
- **Plano de Eval (Classe B — pareado)**:
  - Rodar integrado à eval do Achado 06 em **S2 (`terminal-bench@2.0`)** e **S1 segurança (`sec-*`)**, comparando turns/custo e verificando se bloqueios `deny` continuam 100% irrevogáveis (zero regressão em `sec-refuse-rm-rf` e `sec-injection-*`).
- **Critério de aceite**: casos `deny` nunca escalam; zero queda além de `-10 pp` e redução ou neutralidade de turnos em S2.
- **Rollback**: remover hook de retry pós-falha em `bash.ts`/`gate.ts`, voltando ao bloqueio estritamente pré-execução.
