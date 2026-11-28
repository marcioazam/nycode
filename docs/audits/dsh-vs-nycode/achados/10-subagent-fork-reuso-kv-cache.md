# Achado 10: Subagente `subagent_fork` com herança de prefixo conversacional para reuso de KV cache

## O que o `dsh` faz

O `dsh` oferece dois provedores nativos distintos para subagentes in-process: `spawn` (contexto limpo) e `fork` (`packages/subagent/subagent-fork-in-process/src/index.ts:46-83`). No modo `fork`, o filho herda exatamente o prefixo dos turnos completos do pai até o último `'turn/end'` (excluindo o turno aberto com tool calls em andamento para manter o pareamento válido) como histórico inicial, travando `inheritedEventCount` e trocas de rota:

```ts
// packages/subagent/subagent-fork-in-process/src/index.ts:46-53,68
function completedTurnPrefix(parent: Agent): SessionEvent[] {
  const events = parent.session.snapshotEvents()
  const lastEnd = events.findLast(e => e.type === 'turn/end')
  if (lastEnd === undefined) return []
  return events.slice(0, lastEnd.seq + 1)
}
...
readonly inheritsParentContext = true
```

Em `packages/subagent/subagent/src/manager.ts:366,392-395`, o filho recebe `{ seed, parentSource: { sessionId, endSeq }, inheritedEventCount, delegatedPolicies }` e bloqueia seleção arbitrária de modelo/preset diferente por padrão (`tool-subagent/src/index.ts:86,215-217`, alertando na descrição se ativado que mudar a rota impede reuso do prefixo em cache no provedor). Como `systemPrompt`, `tools` (salvo subconjunto compatível), e todas as mensagens até o turno anterior já estão aquecidas no KV cache da API pelo agente pai, múltiplos filhos `subagent_fork` disparados em paralelo leem o contexto completo do projeto via `cacheRead` (~`0.1x` em Anthropic / cache hit em DeepSeek) em vez de re-explorar o repositório do zero.

## Como o `nycode` faz hoje

Em `packages/coding-agent/src/extensions/subagent/core/run.ts:204-234` (e `fleet/`), cada subagente é lançado como um **processo filho OS isolado** (`spawn(command, ["nycode", "--mode", "json", "-p", "--no-session", ...])`), iniciando com **histórico zero** (`messages: []`). Mesmo quando o agente pai já leu 40.000 tokens de código e decisões arquiteturais relevantes para uma tarefa paralela de verificação ou implementação, o `nycode` precisa resumir tudo manualmente dentro do campo `task` da tool `subagent` (`873` tokens só o schema da tool) ou o subagente gasta dezenas de turnos de `read`/`grep` redescobrindo o mesmo código sem aproveitar o KV cache já aquecido pelo pai. O flag `--fork-session` / `fork` no `nycode` atua apenas em persistência/sessão do usuário, nunca como ferramenta de delegação paralela herdeira de prefixo.

## Diferença concreta

- `dsh`: possui `subagent_fork` herdando o prefixo de turnos completos do pai (`completedTurnPrefix`), reusando o KV cache do provedor (`~0.1x` input cost) com `agent_id` continuável (`send_message`/`wait_agent`), enquanto mantém `subagent` limpo para tarefas independentes.
- `nycode`: toda delegação de subagente inicia em processo filho sem mensagens herdadas (contexto zero além de `systemPrompt` + `AGENTS.md` + `task`), sem aproveitar os turnos já aquecidos do pai no cache do provedor.

## Classificação

**Classe B** — Exige opção ou extensão visível ao modelo (ex.: parâmetro `forkContext?: boolean` em `subagent` ou tool `subagent_fork` opt-in), altera radicalmente o contexto visto pelo subagente (vê histórico do pai antes da tarefa) e impacta tanto consumo de tokens quanto assertividade em tarefas paralelas de código/revisão. Exige eval rigoroso.

## Benefício esperado

- Corte drástico no número de turnos exploratórios duplicados quando 2–4 subagentes executam revisão, testes ou edições independentes após longa fase de leitura do agente principal.
- Aproveitamento direto de `cacheRead` (especialmente em conjunto com `prefix-cache-1h` na Anthropic e prompt caching no DeepSeek) sobre todo o histórico pai até o turno anterior.
- Permite delegar tarefas complexas com prompts curtíssimos (`"Implemente a parte B mantendo os contratos discutidos acima"`), sem perder nuances de arquitetura discutidas anteriormente.

## Custo

- **Tokens/turno**: adicionar `forkContext?: boolean` no schema de `subagent` custa apenas ~`+15–25` tokens `o200k_base` (ou `+230` tokens se exposto como tool separada como faz o `dsh` com `subagent_fork`); cada filho em fork paga `cacheRead` (~`0.1x`) sobre `M` tokens herdados do pai + `output` próprio. **Atenção**: se o pai estiver perto do teto de contexto (`> 70%`), herdar o histórico inteiro reduz a janela livre do filho!
- **Latência**: neutra ou menor (menos turns no filho), desde que o pai dispare os filhos logo após o turno de leitura aquecer o cache.
- **Manutenção**: alta se feito in-process com `Scope` estilo `dsh`; **média** se aproveitando `--fork` / `SessionManager` efêmero em arquivo passado ao subagente OS existente (`--session <tempForkedSession>`), mantendo a mesma isolação de processo do `nycode` (inclusive com isolamento de env/worktree)!

## Riscos e modos de falha

- **Efeito manada no cache (cache miss frio)**: se o pai disparou 4 `subagent_fork` antes de a resposta do pai ter aquecido o cache no provedor ou usando um modelo roteado diferente (`routing/` do `nycode` muitas vezes roteia subagentes para Haiku/Flash/mini em vez do modelo do pai!), **0 tokens vêm do cache** e todos os filhos pagam `4 × 1.0x` input completo! Regra obrigatória de projeto: só permitir/sugerir `forkContext` herdando o mesmo `(provider, modelId)` + `systemPrompt` + `tools` (exatamente como o `dsh` faz ao desligar `modelSelection` em `subagent_fork`), garantindo hit real de KV cache.
- **Poluição de atenção ("lost in the middle")**: se o histórico pai contiver muitas falhas/tentativas antigas, o subagente limpo (`spawn`) tende a performar melhor do que o `fork`.

## Licença

Código-fonte de referência `dsh` sob licença **MIT** (`LICENSE:1-21`).

## Proposta para o `nycode`

Em vez de portar o kernel de escopos Cordis in-process (`dsh`), implementar `forkContext` sobre a arquitetura atual de subprocesso isolado de `extensions/subagent`:
1. Na extensão `extensions/subagent/`, ao receber `forkContext: true` em uma delegação:
   - forçar herança estrita do mesmo `model` e `thinkingLevel` do pai (sem downgrade por tabela de roteamento, preservando a chave de prefixo do provedor);
   - serializar um JSONL temporário contendo as mensagens até o último turno completo (`user` -> `assistant` + `toolResult`s fechados, exatamente como `completedTurnPrefix` em `subagent-fork-in-process/src/index.ts:46-53`) + mesmo `SystemMessage` inicial;
   - iniciar o subprocesso filho com `--session <tmp-fork.jsonl>` mantendo `tools` compatíveis para maximizar `cacheRead` na Anthropic/DeepSeek.
2. Bloquear `forkContext` se o contexto pai já ultrapassar um teto configurável (ex.: `60%` da janela), fazendo fallback seguro para subagente limpo ou erro explícito.

## Testes necessários

- Teste em `packages/coding-agent/test/suite/`:
  - `completedTurnPrefix` exclui `toolCall` do turno atual aberto mantendo JSONL válido sem erro `tool_use without tool_result`;
  - subagente `forkContext` usando mesmo modelo `faux` atinge `cacheRead > 0` na primeira requisição;
  - mudança de modelo ou `NYCODE_PLAN_READONLY` incompatível rejeita ou ignora roteamento conforme regra de segurança.

## Plano de eval

- **Baseline**: `subagent` padrão atual (`contexto limpo` + resumo manual no campo `task`).
- **Candidato**: `subagent` com `forkContext: true` disponível e instruído seletivamente para sub-tarefas após exploração compartilhada.
- **Onde rodar**: `packages/evals` (tarefas multi-arquivo com divisão em 2–3 sub-tarefas paralelas após leitura inicial) e `bench/` (medindo custo total USD = `input + cacheRead + cacheWrite + output`, turnos totais e taxa de sucesso). Nunca re-executar `cc-vanilla` nem `pi-vanilla`.
- **Critérios**: IC pareado BCa 90% >= `-0.10` e redução líquida na mediana de custo/turnos (mediana `<= 1.00`, limite máximo `<= 1.10`).

## Critérios de aceite e rollback

- **Aceite**: cacheRead comprovado no filho, zero quebra de pareamento de tools no prefixo, melhoria ou empate de custo x benefício no eval.
- **Rollback**: remover opção `forkContext` do schema de `subagent` mantendo 100% de execução em processo filho limpo.

## Prioridade

**Média-Alta (P3 entre itens Classe B)** — alto valor em arquiteturas multi-subagente, mas exige implementação cuidadosa de replay de prefixo idêntico e eval econômico rigoroso.
