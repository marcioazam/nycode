# 02 — Congelar o índice `<memory>` durante a sessão para preservar prefix cache

- **Classe**: **A** (zero tokens extras, mantém exatamente a mesma memória na abertura da sessão, apenas evita invalidação destrutiva de cache no meio da conversa).
- **Prioridade**: **P1** (afeta diretamente sessões longas com TTL 1h onde o agente ou usuário salva uma memória com `memory({action:"save"})`).

## O que o `omp` faz

O `omp` congela o bloco de memórias injetado no início da sessão e registra um marcador `memory_recall` via `findPersistedRecall` / `persistRecall` (`omp:packages/coding-agent/src/memory-backend/recall-entry.ts:106-147`). Como documentado no comentário literal de `MnemopiSessionState.beforeAgentStartPrompt` (`omp:packages/coding-agent/src/mnemopi/state.ts:819-833`), em turnos seguintes ou retomadas de sessão (`resume`), o bloco inicial do system prompt é reenviado **inalterado** para preservar o prefix cache do provedor:

```ts
	async beforeAgentStartPrompt(
		promptText: string,
		signal?: AbortSignal,
		budget: (block: string) => string = block => this.budgetRecallBlock(block),
	): Promise<MemoryPromptPreparation | undefined> {
		if (!this.config.autoRecall || this.hasRecalledForFirstTurn) return undefined;
		const latestPrompt = promptText.trim();
		if (!latestPrompt) return undefined;
		const generation = ++this.#recallGeneration;
		// The transcript's recall is history: a resumed session sends it unchanged, so the
		// prompt cache still matches, and reports what changed since as a new message.
		const scope = getMnemopiRecallScope(this.config);
		const persisted = findPersistedRecall(this.session.sessionManager, scope);
```

- **Ancestralidade Pi**: ausente em `pi0.9.4` e `pibase`. Criação original do `omp` para evitar que atualizações em memória invalidem todo o cache da conversa.

## Como o `nycode` faz

Em `packages/coding-agent/src/extensions/memory/index.ts:485-531`, a extensão `memory` calcula um `statToken` do arquivo `MEMORY.md` a **cada** evento `before_agent_start` e injeta o conteúdo atual em `sections.memory` (`addPromptSection(event, "memory", text)` em `:524-531`):

```ts
	nycode.on("before_agent_start", (event) => {
		if (inSubagent() || !enabled) return;
		const index = readIndexCached();
		if (!index.trim()) return;
		const text = `Persistent memories from earlier sessions (index):\n\n${capIndexForPrompt(index)}\nUse the memory tool with action "read" to load a memory's full content when relevant.`;
		if (addPromptSection(event, "memory", text)) return;
		return { systemPrompt: `${event.systemPrompt}\n\n## Memory\n\n${text}` };
	});
```

Quando o agente chama `memory({ action: "save" })` ou `memory({ action: "delete" })` no turno 4 de uma sessão longa (ou quando outra sessão grava em `MEMORY.md`), `MEMORY.md` muda no disco, `readIndexCached()` devolve um texto diferente e o bloco `systemPrompt` muta imediatamente antes da chamada à API.

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Atualização de `<memory>` durante a sessão | Congelado após o 1º turno (`hasRecalledForFirstTurn` em `mnemopi/state.ts:824`, `recall-entry.ts:106-147`) | Re-lido via `statToken` em **todo** `before_agent_start` (`extensions/memory/index.ts:495-531`) |
| Impacto de `memory save` no prefixo | Zero quebra no `systemPrompt`; mudanças pós-turno ficam implícitas na própria resposta da tool ou em delta final | Quebra o `systemPrompt` no turno seguinte e força re-escrita total (`cacheWrite`) do histórico acumulado |

## Benefício

- **Problema**: em uma conversa com 60k–150k tokens de histórico em cache (`ttl: "1h"` no system prompt via `prefix-cache-1h/index.ts`), salvar uma única nota em `MEMORY.md` muda o prefixo `<memory>` do `systemPrompt` no turno seguinte e invalida **todo** o prefix cache da conversa até o tail.
- **Rastro**: a resposta da própria chamada `memory({ action: "save" })` já permanece no histórico de `toolResult` da conversa atual — o modelo já sabe o que acabou de salvar sem precisar reescrever o `<memory>` do `systemPrompt`.
- **Solução**: capturar o snapshot de `<memory>` uma única vez no primeiro `before_agent_start` da sessão (ou no `session_start`, resetando apenas em troca explícita de sessão/compactação se desejado) e mantê-lo constante pelo resto da sessão ativa. (Opcionalmente, se outra sessão externa mudar `MEMORY.md`, manter inalterado o bloco de sistema e não reescrever `sections.memory`).

## Custo

- **Tokens / turno**: **0** (economia líquida ao evitar `cacheWrite` integral no turno após `memory save`).
- **Latência**: **0 ms** (inclusive elimina `statSync` repetido a cada turno em `before_agent_start`).
- **Manutenção**: ~15 LOC em `packages/coding-agent/src/extensions/memory/index.ts` sem dependências.

## Riscos

- Se o usuário editar `MEMORY.md` manualmente num editor externo *durante* a mesma sessão interativa, a sessão ativa não refletirá a edição no `systemPrompt` até um novo turno com `/memory` ou nova sessão (comportamento aceitável e preferível à invalidação silenciosa do cache; caso o usuário rode `/new` ou `/session`, `session_start` já reinicializa o estado).
- Em `packages/coding-agent/src/core/system-prompt.ts:226-238`, `diffSystemPromptSections` deixará de emitir patches de `<memory>` mid-session — exatamente o efeito desejado.
- Docs: `docs/ADR.md:54-63` e `docs/MEMORY.md:14` (cópias não rastreadas no checkout principal) reforçam estabilidade de prefixo.

## Licença

Padrão arquitetural inspirado em código **MIT** (`omp:LICENSE:1-23`). Implementação própria enxuta no `nycode`.

## Proposta

- **`packages/coding-agent/src/extensions/memory/index.ts`**: guardar `sessionMemorySnapshot: string | null = null` e `snapshotCaptured = false` (resetados em `session_start`); em `before_agent_start`, congelar na primeira captura da sessão (incluindo o caso vazio, para que uma sessão que começou sem `MEMORY.md` não passe a injetar `<memory>` no meio da conversa e quebrar o cache).

## Testes

- Adicionar caso em `packages/coding-agent/test/harness/memory/` verificando que após `before_agent_start` capturar `MEMORY.md` inicial, chamar `memory({ action: "save", ... })` altera o arquivo no disco mas mantém `sections["memory"]` (ou `systemPrompt`) idêntico nas chamadas seguintes da mesma sessão, enquanto um novo `session_start` lê a versão atualizada.

## Plano de eval

Não aplicável (Classe A: zero mudança de ferramenta, schema ou instrução inicial; preserva o mesmo `systemPrompt` entre turnos da mesma sessão).

## Critérios de aceite

1. `systemPrompt` permanece byte-idêntico entre turnos antes e depois de `memory({ action: "save" })` na mesma sessão.
2. Sessão nova (`session_start`) passa a enxergar a memória recém-salva.
3. Testes unitários de `extensions/memory` passam.

## Rollback

Remover o flag `snapshotCaptured` em `packages/coding-agent/src/extensions/memory/index.ts`, retornando à leitura via `readIndexCached()` por turno.
