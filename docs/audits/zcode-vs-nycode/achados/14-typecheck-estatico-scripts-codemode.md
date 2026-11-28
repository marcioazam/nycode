# Achado 14: Licoes do Compilador `dynamic-workflow` (Typecheck Estático Sem `noUncheckedIndexedAccess` em Scripts `codemode`)

- **Classe**: **B** (altera erro/feedback retornado ao modelo na tool `codemode`, exigindo eval para medir taxa de sucesso vs custo do compilador TS)
- **Prioridade**: **P3 (Medio — ganho empirico interessante, porem traz peso de compiler em memoria se mal empacotado)**

## Problema

Quando o modelo escreve scripts JavaScript/TypeScript na tool `codemode` que encadeiam 3–10 chamadas a ferramentas (ou transformam JSON de respostas MCP), erros simples de propriedade inexistente ou API errada em `tools.*` / `models.*` so aparecem durante a execucao no QuickJS WASM, desperdicando toda uma chamada de ferramenta (e as chamadas aninhadas ja executadas antes da linha com bug).

## O que o ZCode faz (`~/source/zcode-ref`)

- **Arquivos e linhas**: `apps/zcode-cli/packages/dynamic-workflow/src/compiler/compile.ts:31-100`, `apps/zcode-cli/packages/dynamic-workflow/src/facade/dts.ts:1-100`, e `apps/zcode-cli/packages/dynamic-workflow/src/analysis/analyze.ts:32-100` (`~/source/zcode-ref`).
- **Mecanismo concreto e achado empirico**:
  1. Em `compile.ts:47-59`, o ZCode compila o codigo gerado pelo LLM contra uma facade `.d.ts` minima (`FACADE_DTS`) e `lib.es2022.d.ts` em memoria (`TS_LIBS`) com **`strict: true`** e **`types: []`** (proibindo `process`, `fetch`, `require` ja em tempo de compilacao), mas desliga explicitamente **`noUncheckedIndexedAccess: false`** porque:
     > "Models write TS as if the flag were off — with it on, TS2532/TS18048 on `items[i]` was the single largest source of compile failures (96% of the undefined-family diagnostics in local runs)." (`compile.ts:47-53`)
  2. Em `analyze.ts:63-100`, valida uso de facade e comandos literais **antes** de aprovar ou gastar chamadas subagentes caras.

## Como o nycode faz hoje (`~/source/nycode-audit-zcode`)

- **Arquivos e linhas**: `packages/coding-agent/src/extensions/codemode/tool.ts:1-90`, `packages/codemode/src/index.ts`, e `packages/chord/src/index.ts:1-52`.
- `nycode` ja tem `@nycode/codemode` (sandbox QuickJS WASM seguro + geracao de declaracoes `.d.ts` em `@nycode/codemode/declarations` exibidas na descricao do `codemode`, 364 tokens bare) e `@nycode/chord` (runtime duravel com contratos e SQLite journal).
- Porem, `codemode` hoje avalia o script direto no runtime JS sem etapa previa de validacao sintatica/typecheck contra as assinaturas `.d.ts` geradas por `@nycode/codemode/declarations`.

## Diferenca concreta

- **O que aproveitar (leve e opcional)**:
  1. Caso se queira reduzir erros de script multi-step em `codemode`, rodar um check opcional rapido sobre o script contra a `.d.ts` ja gerada por `@nycode/codemode/declarations` com `strict: true` e `noUncheckedIndexedAccess: false` (falhando rapido *antes* de disparar efeitos aninhados em `ctx.executeTool`);
  2. Validar ao menos a sintaxe JS/AST leve em `codemode` antes de alocar worker WASM, e anotar claramente a recomendacao empirica sobre `noUncheckedIndexedAccess: false` caso `@nycode/chord` ou `codemode` aceitem scripts TS gerados por LLM.
- **Complexidade a REJEITAR**: nao importar os 5 passos de grafo causal/taint/handoff/holes de `dynamic-workflow/src/analysis/` nem o prompt de habilidade de **22.555 tokens** (`apps/zcode-cli/packages/bundled-skills/skills/dynamic-workflows/SKILL.md`) nem embutir 1 MB+ de `typescript` no caminho quente de inicializacao do CLI (ver nota do proprio ZCode em `apps/zcode-cli/packages/node-repl-host/src/server.ts:8-11`, onde puxar `typescript` inflamou o bundle para 21,7 MB!).

## Beneficio esperado

- Impede scripts `codemode` com chamadas erradas a `tools.<nome>` de executarem os primeiros efeitos colaterais e falharem na metade, devolvendo erro tipado em 1 passo antes da execucao.

## Custo

- **Tokens/turno**: 0 tokens extras em prompts normais (usa declaracoes que `@nycode/codemode/declarations` ja produz), porem **pode gastar turnos extras se o checker rejeitar codigo JS valido por tipagem estrita** (por isso e Classe B e exige eval!).
- **Peso de bundle**: carregar compilador `typescript` completo em memoria adiciona dezenas de MB de grafo de modulos se nao for lazy-loaded apenas sob demanda (`execute.lazy.ts`).
- **Manutencao**: media (~150 linhas + lazy-load estrito testado por `scripts/check-entry-graphs.mjs`).

## Riscos e armadilhas

- **Risco real documentado pelo proprio ZCode**: typechecking estrito demais (`noUncheckedIndexedAccess`) reprova scripts validos em 96% dos acessos `arr[i]` gerados por LLMs, piorando latencia e custo! E `codemirror`/`typescript` no startup do CLI violaria a disciplina de startup e `check-entry-graphs.mjs` do `nycode` se nao for 100% lazy.

## Licenca e proveniencia

- Licao empirica e configuracao de `~/source/zcode-ref/apps/zcode-cli/packages/dynamic-workflow/src/compiler/compile.ts` (**Apache-2.0**, `~/source/zcode-ref/LICENSE:1-202`).

## Proposta de desenho no nycode

- Somente em modo experimental atras de `codemode.typecheck` (desligado por padrao): carregar verificador lazy no worker de `packages/coding-agent/src/extensions/codemode/execute.lazy.ts` quando o script usar ferramentas aninhadas com efeitos colaterais (`edit`, `write`, `bash`), respeitando `strict: true` e `noUncheckedIndexedAccess: false`.

## Testes previstos

- `packages/coding-agent/test/suite/agent-session-codemode.test.ts` + verificacao obrigatoria em `scripts/check-entry-graphs.mjs` garantindo que `coding-agent` startup nao carregue `typescript` eager.

## Plano de eval (`packages/evals` / `bench/`)

- **Baseline vs Candidato**: avaliar especificamente em tarefas `codemode`-intensivas de `packages/evals` e `bench/suites.toml` (`agent-session-codemode` / MCP multi-tool workflows), medindo:
  1. Numero de chamadas falhas de `codemode` que abortaram apos efeitos colaterais parciais;
  2. Taxa de falso-bloqueio em scripts JS perfeitamente validos;
  3. Tempo extra por script e taxa de conclusao final (AHEAD_P >= baseline). Sem reexecutar referencia vanilla (`docs/bench/RUNBOOK.md`).

## Criterios de aceite e rollback

- **Aceite**: reducao real de erros de execucao parcial sem falso-bloqueio de scripts validos e impacto zero no tamanho do grafo estatico de `check-entry-graphs.mjs`.
- **Rollback**: remover a flag `codemode.typecheck`.
