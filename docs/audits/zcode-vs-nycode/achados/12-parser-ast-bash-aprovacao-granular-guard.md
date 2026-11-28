# Achado 12: Parser AST Real para Comandos Bash (`unbash`) no Guard e Aprovacao Pontual `guardedSingleUseAsk`

- **Classe**: **B** (altera classificacao de seguranca de comandos `bash` entre `allow` e `ask`, mudando o comportamento de execucao/aprovacao; exige eval antes)
- **Prioridade**: **P2 (Alta seguranca + ergonomia)**

## Problema

Lexers ad-hoc baseados em regexes e conjuntos estaticos de caracteres proibidos (`FORBIDDEN_CHARS` contendo `` ` $ < > \n \r \ { } ! ( ) ``) sofrem dois problemas opostos em producao:
1. Falso-positivo ergonomico: bloqueiam/pedem confirmacao em comandos compostos read-only perfeitamente seguros (ex.: redirecionamento `2>/dev/null`, pipelines simples com `grep -E '(foo|bar)'` entre aspas simples quando algum caractere ou quebra de linha aparece no script);
2. Risco lexico em construcoes nao previstas (subshells aninhados, atribuicoes env inline, variacoes de `cmd` / wrappers `env` / `timeout`).

## O que o ZCode faz (`~/source/zcode-ref`)

- **Arquivos e linhas**: `apps/zcode-cli/packages/core/src/tool/handlers/bash-command-parser.ts:1-97`, `apps/zcode-cli/packages/core/src/tool/handlers/bash-readonly-policy.ts`, `apps/zcode-cli/packages/core/src/permission/service.ts:495-500` (`~/source/zcode-ref`).
- **Traco concreto**:
  1. `analyzeBashCommand(command)` (`bash-command-parser.ts:54-93`) impoe teto `MAX_BASH_PARSE_LENGTH = 10_000`, invoca `parse(command)` do parser AST shell **`unbash`** (`bash-command-parser.ts:2`) e caminha por `AndOr`, `Pipeline` e `Statement`, isolando cada invocacao com `argv`, `envAssignments`, `redirects` e `hasDynamicWords` (`$()` / backticks / expansoes).
  2. `isBashCommandPermissionSafe(analysis)` (`bash-command-parser.ts:95-97`) falha fechado sempre que houver `hasParseErrors || hasUnsupportedSyntax || hasDynamicWords`.
  3. No modo `guarded`, `PermissionService.guardedSingleUseAsk` (`apps/zcode-cli/packages/core/src/permission/service.ts:495-500`) oferece confirmacao de uso unico sem gravar regra permanente `"always allow"` para comandos de risco.

```typescript
// ~/source/zcode-ref/apps/zcode-cli/packages/core/src/tool/handlers/bash-command-parser.ts:95-97
export function isBashCommandPermissionSafe(analysis: BashCommandAnalysis): boolean {
  return !analysis.hasParseErrors && !analysis.hasUnsupportedSyntax && !analysis.hasDynamicWords;
}
```

## Como o nycode faz hoje (`~/source/nycode-audit-zcode`)

- **Arquivos e linhas**: `packages/coding-agent/src/core/permissions/guard/modes/classify.ts:1-100`, `packages/coding-agent/src/core/permissions/guard/modes/decide.ts:71-83`, e `packages/coding-agent/src/core/permissions/guard/bash/rules.ts:186-205`.
- `nycode` tem um excelente modulo proprio de classificacao conservadora (`classify.ts` com `READONLY`, `BANNED_ARGS`, `FORBIDDEN_CHARS`, `SED_S`, `RG_FLAGS` e `DIFF_FLAGS`) herdado do port Python, mais regras dedicadas em `packages/coding-agent/src/core/permissions/guard/bash/rules.ts` (`checkBash`) e `bash-main-guard`.
- Porem, `classify.ts` ainda usa splitting proprio (`shlexSplit`) + veto global de caracteres (`FORBIDDEN_CHARS`), sem AST formal capaz de distinguir com certeza literais entre aspas simples de operadores shell ou de extrair `envAssignments` / `redirects` estruturados.

## Diferenca concreta

- **Necessario**: manter integralmente a politica enxuta de comandos e flags do `nycode` (`READONLY`, `BANNED_ARGS`, `packages/coding-agent/src/core/permissions/guard/bash/rules.ts`), substituindo ou validando a quebra de segmentos `shlexSplit` por um parser AST shell deterministico (fail-closed em erro de parse, expansao dinamica ou no nao suportado).
- **Complexidade opcional a rejeitar**: **NAO importar `bash-command-registry.ts`** (1,9 MB gerados de `@withfig/autocomplete`, classificado como Classe C em `rejeitados.md`). As tabelas concisas ja existentes em `classify.ts` + `packages/coding-agent/src/core/permissions/guard/bash/rules.ts` sao menores e mais seguras.

## Beneficio esperado

- Menor friccao (`ask` spurios) em comandos read-only legitimos com operadores seguros/citados (ex.: regex entre `'...'` dentro de `rg`), mantendo ou aumentando rigor contra redirecionamentos perigosos e substituicoes dinamicas.

## Custo

- **Tokens/turno**: **0** (`o200k_base`, roda em pre-tool hook/guard local).
- **Latencia**: ~1–3 ms de parse por chamada `bash` (apenas strings <=10 KB).
- **Manutencao**: media (~150 linhas + revisao de dependencia `unbash` conforme regras de seguranca do repo, ou AST parser minimo em TS sem deps externas).

## Riscos e armadilhas

- Divergencia semantica entre AST `unbash` (POSIX bash) e execucao em Windows PowerShell/CMD caso o shell do host nao seja bash/zsh.
- Adicionar dependencia npm externa requer auditoria de licenca e `install-lock` (`AGENTS.md`). Alternativa segura: validar primeiro contra corpus adversarial antes de trocar o parser.

## Licenca e proveniencia

- Logica AST wrapper em `~/source/zcode-ref/apps/zcode-cli/packages/core/src/tool/handlers/bash-command-parser.ts` (**Apache-2.0**, `~/source/zcode-ref/LICENSE:1-202`). Nota: `bash-command-registry.ts` (MIT/ISC Fig) esta explicitamente **excluido** desta proposta.

## Proposta de desenho no nycode

- `packages/coding-agent/src/core/permissions/guard/modes/classify.ts`: evoluir analisador para devolver AST simplificada (`CommandInvocation[]` com redirects/env separados) preservando falha fechada (`undefined`) em nos nao suportados/expansao dinamica.
- `packages/coding-agent/src/core/permissions/guard/modes/decide.ts`: adicionar opcao de pergunta de uso unico (`guardedSingleUse`) equivalente ao `guarded` do ZCode.

## Testes previstos

- `packages/coding-agent/test/harness/guard/` com corpus adversarial de bypasses (`foo $(rm -rf /)`, `ENV=bad cmd`, heredocs, `find -exec`, redirections `>file`, aspas simples `'a|b'` dentro de `rg`).

## Plano de eval (`packages/evals` / `bench/`)

- **Baseline vs Candidato**: executar suite `bench/suites.toml` (`plan` e `behavior` com modo `default`/`acceptEdits`) + replay offline dos comandos `bash` extraidos de logs reais das sessoes `nycode`, medindo:
  1. Falso-positivos de `ask` em comandos comprovadamente read-only;
  2. Taxa de bloqueio 100% em casos adversariais de injecao/escrita;
  3. Tempo extra por chamada `bash` (<5 ms p99). Nao reexecutar referencia vanilla (`docs/bench/RUNBOOK.md`).

## Criterios de aceite e rollback

- **Aceite**: 0 escapadas no corpus adversarial, reducao de asks spurios nos traces read-only e aprovacao de dependencia se `unbash` for escolhido.
- **Rollback**: restaurar `classify.ts` usando exclusivamente `shlexSplit`.
