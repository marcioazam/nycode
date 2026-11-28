# Achado 08: Isolamento estrito de prefixo KV cache nas injeções dinâmicas (`memory`, instruções aninhadas e `plan-mode`)

## O que o `dsh` faz

O `dsh` aplica quatro disciplinas para manter o bloco `system[0]` e o catálogo inicial de ferramentas byte-idênticos entre turnos até uma compactação:

1. **System prompt congelado + admissões incrementais**: `packages/core/system-prompt/src/index.ts:833-859` só reescreve o nó 0 na criação da sessão ou após `compaction/summary`; seções adicionadas ou retiradas entram via `systemUpdates()` sem invalidar o passado já gravado.
2. **Instruções aninhadas e contexto volátil na cauda (`user/message`)**: `packages/context/agent-instructions/src/index.ts:348-374` não edita resultados de `read`/`edit`/`write` já gravados; registra toques em `tools/result` e insere um `UserMessage` novo no próximo `agent/pre-step`. Em `files.ts:430-446` e `config.ts:11-14`, para de subir na árvore de diretórios no marcador raiz `.git` e aplica deduplicação por hash SHA-1 de conteúdo normalizado (evitando duplicar `AGENTS.md` e `CLAUDE.md` idênticos no mesmo diretório):

   ```ts
   // packages/context/agent-instructions/src/files.ts:430-446
   export function dedupInstructionFilesByCandidateGroup(files: LoadedInstructionFile[]): LoadedInstructionFile[] {
     const keptDigestsByGroup = new Map<string, Set<string>>()
     const kept: LoadedInstructionFile[] = []
     for (const file of files) {
       const group = instructionCandidateGroup(scopeForDisplayPath(file.displayPath))
       ...
       const digest = trimmedInstructionDigest(file.content)
       if (digests.has(digest)) continue
       digests.add(digest)
       kept.push(file)
     }
     return kept
   }
   ```

3. **Contextos de runtime deduplicados**: `time-context/src/index.ts:209-214` (throttle de 10 min) e `agent-loop/src/runtime-context.ts:76-92` (`deepEqualJson(previous, sections)`) suprimem reemissões redundantes e preservam cada snapshot como bloco `user/message` na cauda.
4. **Catálogo estável em `plan-mode`**: `packages/plan/plan-mode/src/index.ts:400` mantém `exit_plan_mode` no catálogo depois que `plan-mode` foi entrado (`this.selectedActive(agent.session) || this.planState(agent.session).entered`), declarando no texto (`presets/standard.patch.yml:65`) que todas as tools continuam declaradas para preservar o cache do provedor.

## Como o `nycode` faz hoje

O `nycode` já possui `diffSystemPromptSections` e `SystemMessage.toolsAdded` (`core/system-prompt.ts:226-238`, `core/agent-session.ts:1879-1891`) além do split de `<cwd>` no `headless-lean` (`extensions/headless-lean/index.ts:67-84`). Contudo, três pontos quebram o prefixo em sessões interativas:

1. **`memory` reescreve o `systemPrompt` no meio da sessão**: `packages/coding-agent/src/extensions/memory/index.ts:524-531` injeta o índice de `MEMORY.md` (`INDEX_MAX_LINES=200`, `INDEX_MAX_BYTES=25_000`) dentro de `before_agent_start` via `addPromptSection(event, "memory", text)`. Se o modelo salvar ou editar uma memória durante a conversa, o texto da seção `"memory"` muda na chamada seguinte, alterando o início do prefixo em Anthropic/DeepSeek.
2. **Injeção de regras/imports aninhados muta `tool_result` recém-criado vs cauda**: `extensions/claude-rules/index.ts:544-580` e `extensions/context-imports/index.ts:558-595` anexam `<system-reminder>` ao final do `content` de `tool_result` (o que mantém o passado anterior intacto, mas altera o bloco `tool_result` recém-produzido; além disso, `context-imports` reescreve `<project_instructions>` no prompt via `prompt-blocks.ts` quando o usuário adiciona diretórios ou regras).
3. **`resource-loader.ts` sobe até `/` sem deduplicação SHA-1**: `packages/coding-agent/src/core/resource-loader.ts:210-300` caminha até `/` (em vez de parar em `.git`, salvo shadowing de worktree) e escolhe apenas o 1º arquivo encontrado por diretório sem deduplicar conteúdo igual entre hierarquias.
4. **`plan-mode` troca `setActiveTools`**: `packages/coding-agent/src/extensions/plan-mode/index.ts:186-209` substitui ativamente o conjunto de tools declaradas (`enterPlanTools()` -> `restoreTools()`). Em provedores sem suporte a `toolsAdded` incremental no histórico (DeepSeek `openai-completions`, onde `supportsMidConvoToolAdditions: false` no catálogo `packages/ai/src/providers/deepseek.models.ts`), trocar a lista de `tools` invalida 100% do prefix cache na entrada e na saída do `plan-mode`.

## Diferença concreta

- **Prefixo de `systemPrompt`**: `nycode` muta `sections.memory` no bloco de sistema quando a memória muda; `dsh` isola contexto mutável na cauda (`user/message`) congelando o nó 0.
- **Descoberta de `AGENTS.md`/`CLAUDE.md`**: `dsh` limita busca ao `.git` root (mais global do usuário) e deduplica por digest SHA-1 entre `AGENTS.md` e `CLAUDE.md`; `nycode` sobe até `/` e confia só em ordem de preferência por diretório.
- **`plan-mode` x cache de tools**: `nycode` garante bloqueio duro removendo ferramentas de escrita das declarações (`planActiveTools`), mas invalida cache em modelos `openai-completions`/DeepSeek; `dsh` mantém o catálogo estável e paga menos cache write ao custo de não filtrar tools na API (só instrução).

## Classificação

**Classe B** — Alterar onde `memory` é injetada (de `<memory>` no system prompt para mensagem `user` na cauda na turnagem em que mudar), limitar subida de `AGENTS.md` ao root do projeto/SHA-1 dedup ou alterar troca de tools em `plan-mode` muda tokens declarados, ordem de contexto e potencialmente a atenção/aderência do modelo. Requer eval pareado antes de alterar comportamento padrão.

## Benefício esperado

- Preservação de ~`100%` de `cacheRead` mesmo quando `memory` salva fatos no meio da sessão (sem re-escrever todo o prefixo de `systemPrompt` + `tools` + histórico até aquele turno).
- Redução de tokens redundantes em repositórios com `AGENTS.md` e `CLAUDE.md` espelhados ou pastas ancestrais fora do projeto até `/`.
- Opcionalmente, redução de `cacheWrite` ao alternar para `plan-mode` em modelos DeepSeek (`supportsMidConvoToolAdditions: false`), mantendo enforcement local no hook `tool_call`.

## Custo

- **Tokens/turno**: `0` tokens adicionais quando `memory` não muda no meio da sessão; se movida da seção de sistema para uma mensagem de cauda emitida apenas quando `MEMORY.md` muda ou no início da sessão, economia líquida de `cacheWrite` (`1.25x -> 0.1x` em Anthropic / cache hit em DeepSeek) em todos os turnos seguintes após escrita de memória. Deduplicação SHA-1 economiza tokens de instruções duplicadas.
- **Manutenção**: baixa para mover `memory` e adicionar SHA-1 dedup; média para `plan-mode` porque `nycode` precisa continuar garantindo o bloqueio duro de escrita via `tool_call` (não abrir mão da segurança de `plan-mode/utils.ts`).

## Riscos e modos de falha

- Mover `memory` para `user`/`custom` message pode diminuir o peso de instrução em comparação a `<memory>` no system prompt se ficar muito longe do turno atual após longas conversas.
- Em `plan-mode`, deixar tools de edição declaradas no schema (mesmo bloqueando no `tool_call` quando chamado) pode fazer modelos mais fracos desperdiçarem turns tentando chamar `edit`/`bash` bloqueados se `supportsMidConvoToolAdditions` não exigir estabilidade de cache; por isso, manter `plan-mode` com ferramentas filtradas na Anthropic (`INLINE_TOOLS_BETA` já suporta) e só avaliar preservação de catálogo em DeepSeek/`openai-completions` como política dependente de `model.compat`.

## Licença

Código-fonte de referência `dsh` sob licença **MIT** (`LICENSE:1-21`).

## Proposta para o `nycode`

1. **`memory` cache-friendly (`packages/coding-agent/src/extensions/memory/index.ts:524-531`)**: congelar o snapshot inicial do índice na seção `memory` durante a vida do prefixo (ou emitir apenas o delta como mensagem `custom`/`user` quando `memory` tool alterar `MEMORY.md`), sincronizando a versão completa apenas após `session_compact`.
2. **Deduplicação SHA-1 e respeito a `.git` root em `core/resource-loader.ts:210-300` e `extensions/context-imports/`**: parar subida no root `.git` quando configurado (ou marcar ancestrais fora do repo como explícitos) e deduplicar conteúdo idêntico (`sha256` trimado) entre `AGENTS.md` e `CLAUDE.md`.
3. **`plan-mode` para provedores sem mid-convo tool deltas (`extensions/plan-mode/index.ts:186-209`)**: testar via eval uma opção em `plan-mode` condicionada a `!model.compat?.supportsMidConvoToolAdditions` que preserve as tools declaradas (para cache) e aplique a recusa estritamente no `tool_call` gate que já existe (`plan-mode/index.ts:519-562`), devolvendo erro educativo curto caso o modelo tente editar.

## Testes necessários

- Testes em `packages/coding-agent/test/suite/`:
  - salvar uma memória via tool `memory` no turno 2 não altera o texto de `systemPrompt` nem quebra o `commonPromptPrefixLength` no `faux` até a próxima compactação;
  - `AGENTS.md` e `CLAUDE.md` com mesmo conteúdo após `trim()` são carregados uma única vez;
  - `plan-mode` com flag de catálogo estável bloqueia todas as tools de escrita no hook `tool_call` mantendo zero erro de execução.

## Plano de eval

- **Baseline**: `nycode` padrão atual.
- **Candidato**: cada sub-proposta isolada (`memory` snapshot congelado + delta; `plan-mode` catálogo estável sob modelo DeepSeek/OpenAI).
- **Onde rodar**: `packages/evals` para aderência de memória/plan-mode + `bench/` (medindo `cacheRead`/`cacheWrite` tokens e razão de custo total por sessão). Nunca re-executar referências guardadas `cc-vanilla` nem `pi-vanilla`.
- **Critérios**: taxa de sucesso com IC BCa 90% >= `-0.10`, nenhuma regressão de adesão ao `plan-mode` (zero tentativas repetidas de escrita em loop) e redução mensurável de `cacheWrite` > `30%` em sessões com escrita de memória ou entrada/saída de plano.

## Critérios de aceite e rollback

- **Aceite**: eval sem perda de assertividade, `cacheRead` contínuo após salvar memória e todos os testes de `memory` / `plan-mode` verdes.
- **Rollback**: restaurar injeção direta de `addPromptSection(event, "memory", ...)` em `memory/index.ts` e `setActiveTools(planActiveTools())` incondicional em `plan-mode/index.ts`.

## Prioridade

**Alta (P1 entre itens Classe B)** — a trava de cache de `memory` e deduplicação de instruções atacam vazamentos diretos de cache write sem sacrificar segurança.
