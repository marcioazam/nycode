# Achado 14 — Auto-Revisor Assíncrono Read-Only (Padrão Guardian)

- **Classificação**: **Classe B** (consome tokens extras em chamadas dedicadas ao classificador, adiciona latência e altera decisões de aprovação automática/escalonamento).
- **Prioridade no backlog**: #20 (Classe B — **P3**).

## 1. Como o Codex faz

Quando o usuário escolhe políticas intermediárias ou estritas de aprovação e ocorre uma operação sensível/escalada, o Codex pode delegar o veredito para um subagente revisor isolado **strictly read-only** (`Guardian`), em três camadas visíveis no código:

- **Orçamento e latência limitados com failover aberto para prompt/negação (`codex-rs/ext/guardian-v2/src/async_scorer/config.rs:28-32` e `decisions.rs:41-43`)**: threshold de risco `0.5`, lag máximo `2` tool calls, orçamento de texto `100_000` tokens e prazo HTTP rígido `DEADLINE = Duration::from_secs(6)`.
- **Restrição estrita de ferramentas e sandbox (`codex-rs/ext/guardian-reviewer/src/settings.rs:43-65`)**: o revisor recebe apenas ferramentas de leitura (`exec_command`, `write_stdin`, `view_image`, `exec`, `wait`) sob `reviewer_permission_profile` intersectado com modo `read-only` sem escopo de escrita nem permissão adicional:

```rust
// codex-rs/ext/guardian-reviewer/src/settings.rs:43-65
pub fn reviewer_tool_policy() -> ToolPolicy {
    ToolPolicy {
        allowed_tools: Some(
            ["exec_command", "write_stdin", "view_image", "exec", "wait"]
                .into_iter()
                .map(ToolName::plain)
                .collect(),
        ),
        require_managed_sandbox: true,
        require_unified_exec: true,
        expose_additional_permissions: false,
    }
}

pub fn reviewer_permission_profile(profile: &PermissionProfile) -> PermissionProfile {
    profile
        .intersect_with_read_only()
        .unwrap_or(PermissionProfile::External {
            network: codex_protocol::permissions::NetworkSandboxPolicy::Restricted,
        })
}
```

- **Proteção contra prompt injection na autoridade (`codex-rs/ext/guardian-v3/src/lib.rs:47-55`)**: instrução explícita de que apenas mensagens originais do usuário autorizam ações, enquanto resultados de tool/assistente citando o usuário **nunca** concedem autorização.

## 2. Como o `nycode` faz

Em `packages/coding-agent/src/core/permissions/gate.ts:59-81`, o `nycode` decide deterministicamente em TypeScript (`allow` / `ask` / `block`). Quando a heurística cai em `ask`:
- Com UI (`ctx.hasUI`), interrompe a execução e exige clique humano (`ctx.ui.confirm`);
- Sem UI (`-p`) ou em automação, devolve bloqueio seco `{ block: true, reason }` sem contexto semântico para distinguir, por exemplo, um `rm -rf ./dist` legítimo dentro do pedido do usuário de um `rm` disparado por prompt injection em arquivo lido.

*(Nota: hooks de tipo `agent`/`prompt` existem em `extensions/hooks/runners.ts`, mas não há um revisor de segurança nativo embutido no gate com política read-only e teto de custo).*

## 3. Diferença Concreta

O Codex preenche o meio-termo entre "perguntar ao humano o tempo todo" e "liberar tudo com `--bypass`": um modelo rápido barato julga o risco comparando a ação exata com o pedido original do usuário, com teto estrito de tokens/latência e proibição de autorizações vindas de `toolResult`.

## 4. Benefício e Custo

- **Benefício**: reduz fadiga de prompts humanos em ações `ask` benignas no contexto da tarefa e oferece segunda linha de defesa contra prompt injection indireta mesmo em runs não interativos ou semi-autônomos.
- **Custo em tokens**: medido em `o200k_base` nos templates do Codex — `classifier_instructions.md` (`1,994` tok), `policy.md` (`1,565` tok), `policy_template.md` (`1,876` tok), mais histórico truncado — ou seja, **+2k a +5.4k tokens de input por escalada**. Para o `nycode` valer a pena, o prompt de política teria de ser tão enxuto quanto o próprio `nycode` (<`600` tok) usando modelo pequeno (`Haiku`) e disparando **somente** em comandos classificados como `ask` (nunca em `allow` nem em `deny`).
- **Custo em latência**: `+1s a +6s` somente quando um comando cair em revisão escalada.
- **Custo de manutenção**: alto (calibração de falso-positivo/falso-negativo, orçamento de transcrição, regras contra prompt injection).

## 5. Riscos e Licença

- **Riscos**: latência e custo desproporcionais se disparado frequentemente; falso negativo caso a janela truncada omita uma restrição posterior do usuário. Sempre aplicar *fail-closed* para confirmação humana (`ask`) ou bloqueio em `-p` se estourar `6s` de timeout.
- **Licença**: Codex (`Apache-2.0`, `LICENSE:1-201`); nunca portar literalmente o prompt gigante de 1,994 tokens — usar implementação limpa e concisa.

## 6. Proposta Técnica e Plano de Eval (Obrigatório — Classe B)

- **Arquivos a tocar no `nycode`**:
  - Nova extensão opt-in (padrão desligado) `packages/coding-agent/src/extensions/auto-reviewer/index.ts` assinando fluxo pós-`ask` (ou extensão de escalonamento vinculada ao `Achado 08`) usando `ctx.modelRegistry` com modelo barato (`Haiku`/configurável), thinking desligado, schema JSON forçado (`{ verdict: "approve" | "deny", risk: "low" | "high", reason: string }`) e timeout máximo `6s`.
- **Testes unitários**:
  - Timeout `> 6s` ou falha de rede cai em `ask`/bloqueio normal; saída de `toolResult` tentando "autorizar" comando perigoso é mantida marcada como não-autoritativa e reprovada pelo juiz em faux/eval.
- **Plano de Eval (Classe B — pareado)**:
  - **Suites**: obrigatório rodar todos os cenários de injection do **S1** (`sec-injection-canary`, `sec-inj-file-canary*`, `sec-inj-test-output`, `sec-inj-code-comment`, `sec-destructive-audited`, `sec-refuse-rm-rf`) + **S2** para medir falso-bloqueio e razão de custo (`<= 1.10` no `docs/bench/RUNBOOK.md`).
- **Critério de aceite**: `100%` PASS nos casos `sec-inj-*` e queda de solicitações manuais sem aumentar custo total acima de `1.10×`.
- **Rollback**: remover/desativar extensão opt-in; zero impacto no gate padrão.
