# Achado 14: Grafo acíclico (`blockedBy`) e trava otimista CAS no quadro de tarefas de `team`

## O que o `dsh` faz

Em `packages/team/agent-team/src/task-graph.ts:26-69` e `task-board.ts:118-233`, o quadro compartilhado de tarefas do `dsh` (`agent-team`) oferece duas garantias ausentes no `team` do `nycode`:

1. **Validação completa de DAG (`assertTaskGraphCandidate`)**: toda tarefa aceita campo `blocked_by: string[]`; ao criar ou atualizar dependências, o validador verifica auto-referência (`blockerId === task.id`), duplicatas (`duplicate`), bloqueadores ausentes/deletados (`missing`) e ciclos transitivos com DFS colorido (`visiting` / `visited`, `cycle`) antes de gravar o evento no log:

   ```ts
   // packages/team/agent-team/src/task-graph.ts:54-68
   const visiting = new Set<TeamTaskId>()
   const visited = new Set<TeamTaskId>()
   const visit = (id: TeamTaskId): void => {
     if (visiting.has(id)) {
       throw new TeamTaskGraphError(`task dependency cycle includes "${id}"`, 'cycle')
     }
     if (visited.has(id)) return
     const task = tasks.get(id)
     if (task === undefined || task.status === 'deleted') return
     visiting.add(id)
     for (const blockerId of task.blockedBy) visit(blockerId)
     visiting.delete(id)
     visited.add(id)
   }
   ```

2. **Controle otimista por revisão (CAS `expected_revision`)**: cada atualização exige `revision`, rejeitando edições concorrentes obsoletas com `TEAM_TASK_STALE_REVISION` (em contraste com `write_scopes`, que no `dsh` são apenas avisos consultivos sem trava real).

## Como o `nycode` faz hoje

Em `packages/coding-agent/src/extensions/subagent/team/tasks.ts:80-147` (extensão opt-in via `NYCODE_TEAMS=1` ou `/team on`), o quadro usa arquivos atômicos (`O_EXCL`) `task-N.json` / `claim-N.json` / `done-N.json` em diretório compartilhado e já implementa algo **superior** ao `dsh` em prevenção de colisões de edição: **trava dura de sobreposição de arquivos (`fileConflict`, linhas `100,117-147`)**, recusando e revertendo (com desempate por menor número de tarefa) qualquer `claimTask` que reserve arquivo/diretório sobreposto a outro `claim` ativo.

Contudo, o `nycode` `team`:
- **não possui grafo de dependências (`blockedBy`)**: se a tarefa `t2` ("rodar integração após `t1`") for adicionada ao quadro em paralelo com `t1`, nada impede outro teammate ocioso de dar `claim` em `t2` antes de `t1` terminar;
- **não tem versão/CAS explícito para edições de tarefa**, apenas `O_EXCL` na criação/claim/done binários.

## Diferença concreta

- `dsh`: modelo rico de planejamento em `team` (grafo acíclico `blockedBy` + CAS `revision`), mas prevenção fraca de conflito de arquivos (apenas warning em `write_scopes`).
- `nycode`: trava forte e determinística de conflito de arquivos (`O_EXCL` + `fileConflict`), mas sem `blockedBy` / ordenação DAG entre tarefas no quadro.

## Classificação

**Classe B** — Adiciona campo opcional `blockedBy?: string[]` na sub-ação `tasks` da tool `team` (pequeno aumento no schema da tool quando `/team on` ou `NYCODE_TEAMS=1` estiver habilitado) e altera quais tarefas os agentes podem assumir em paralelo (`claimTask` bloqueia enquanto houver bloqueador aberto). Exige eval quando `team` está ativo.

## Benefício esperado

- Combina o melhor dos dois mundos: mantém a trava dura `fileConflict` do `nycode` **mais** bloqueio automático por dependência (`blockedBy`) com detecção de ciclo no momento de criação da tarefa, evitando que teammates comecem testes ou refatorações dependentes antes da etapa pré-requisito concluir.

## Custo

- **Tokens/turno**: `0` tokens quando `team` não está habilitado (opt-in por `NYCODE_TEAMS=1` / `/team on`); quando ativo, `+15–30` tokens no schema da tool `team` (`extensions/subagent/team/index.ts`).
- **Latência**: `< 1 ms` (DFS sobre dezenas de `task-N.json`).
- **Manutenção**: baixa — ~80 linhas puras adicionadas a `extensions/subagent/team/tasks.ts`.

## Riscos e modos de falha

- Tarefa bloqueadora removida/falha permanentemente pode travar dependentes indefinidamente se não houver limpeza ao cancelar/deletar: exigir remoção automática ou aviso claro caso bloqueador ainda aberto seja cancelado/ignorado, ou explicitar lista de bloqueadores abertos no erro retornado por `claimTask`.
- Manter compatibilidade com a corrida `O_EXCL` de arquivos sem precisar de processo servidor central: ler estado dos arquivos `done-N.json` no momento do `claimTask` (o próprio filesystem garante monotonicidade uma vez que `done-N.json` é escrito via `O_EXCL`!).

## Licença

Código-fonte de referência `dsh` sob licença **MIT** (`LICENSE:1-21`).

## Proposta para o `nycode`

1. Em `packages/coding-agent/src/extensions/subagent/team/tasks.ts:80-147`:
   - estender `task-N.json` com campo opcional `blockedBy?: string[]`;
   - em `addTask(...)` (e eventual atualização), portar validação estilo `assertTaskGraphCandidate` (`missing`, `duplicate`, `cycle`) contra `listTasks(dir)`;
   - em `claimTask(...)`, verificar antes de criar `claim-N.json` se todo id em `task.blockedBy` possui `done-N.json` (`done === true`); se algum estiver aberto, recusar com `team: ${id} is blocked by ${openBlockers.join(", ")}`.
   - opcionalmente adicionar `revision` incremental em mutações se `team` passar a suportar edição de descrição/deps após criação.
2. Atualizar o schema em `packages/coding-agent/src/extensions/subagent/team/index.ts` apenas para `NYCODE_TEAMS=1` / `/team on`.

## Testes necessários

- Teste unitário em `packages/coding-agent/test/`:
  - ciclo direto (`t1 -> t1`), ciclo indireto (`t1 -> t2 -> t1`), duplicata e bloqueador inexistente são rejeitados em `addTask` (ou edição);
  - `claimTask` falha enquanto bloqueador não estiver concluído via `doneTask`, e passa imediatamente após `doneTask` do bloqueador;
  - combinação de `blockedBy` + `fileConflict` preservada.

## Plano de eval

- **Baseline**: `team` com `NYCODE_TEAMS=1` atual (sem `blockedBy`, agentes coordenando ordem via `send` manual).
- **Candidato**: `team` com `blockedBy` validado por DAG + bloqueio no `claimTask`.
- **Onde rodar**: cenário multi-agente em `packages/evals` com 3 fases encadeadas e trabalho paralelo em 2 módulos disjuntos (medindo falhas por execução fora de ordem, mensagens de coordenação trocadas e custo total). Nunca re-executar `cc-vanilla` nem `pi-vanilla`.
- **Critérios**: IC BCa 90% >= `-0.10`, mediana de custo/turnos <= `1.10`, redução de falhas de corrida lógica entre teammates.

## Critérios de aceite e rollback

- **Aceite**: cobertura completa de DAG + `O_EXCL` sem corrida entre `claimTask` e `doneTask`, zero impacto de tokens quando `team` está desligado.
- **Rollback**: remover `blockedBy` de `tasks.ts` e `team/index.ts`.

## Prioridade

**Baixa (P6 entre itens Classe B)** — recurso opt-in útil para `team`, mas `team` já está desabilitado por padrão no `nycode`.
