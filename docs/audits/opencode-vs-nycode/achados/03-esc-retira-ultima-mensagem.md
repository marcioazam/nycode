# 03. Esc retira a última mensagem quando o modelo ainda não respondeu

Classe: **A**. Prioridade: **P2**.

## O que o OpenCode faz

`CHANGELOG.md:11` (v2.4.2, PR #65505): "If the composer is empty, stopping a response with Esc before the model has
written anything or called a tool removes your message and puts it back in the composer, images included".
Restauração do prompt: `packages/tui/src/prompt/restore.ts:16-22` (`usePromptRestore`), usado em
`packages/tui/src/routes/session/dialog-message.tsx:19,43`.

Lacuna: o trecho que remove a mensagem do histórico no core não foi localizado por `rg` (buscas por
`take back|retract|withdraw|unsend` vazias); a evidência do comportamento é o changelog + o restore da TUI.

## Como o nycode faz

`packages/coding-agent/src/modes/interactive/mode/resources.ts:240` e `mode/extension-chrome.ts:56`:
`restoreQueuedMessagesToEditor({ abort: true })` devolve ao editor só mensagens ainda na fila. A mensagem já enviada
fica no histórico com uma resposta abortada.

## Diferença

Após Esc sem saída do modelo, o nycode deixa no transcript `user` + `assistant` abortado; reenviar repete o texto. O
OC remove o par e devolve o texto ao compositor.

## Benefício

Menos contexto (o par abortado sai do histórico, ~tamanho do prompt) e UX de "editar e reenviar". Não muda o prompt
nem schemas.

## Custo

Tokens: negativo. Latência: 0. Manutenção: baixa (~60-100 linhas), mas mexe em persistência de sessão (JSONL
append-only): remover exige um ramo novo na árvore, não apagar linhas.

## Riscos

Sessão JSONL é append-only (`core/session-manager.ts`): implementar como navegação para o nó pai (mesmo mecanismo do
`/tree`), nunca reescrita do arquivo.

## Licença

MIT; reimplementação.

## Proposta

1. `modes/interactive/mode/resources.ts`: no abort, se a última mensagem assistant não tem texto nem tool call e o
   editor está vazio, navegar a folha para o pai da mensagem do usuário e pôr o texto (e imagens) no editor.
2. Reutilizar a API de navegação de árvore do `SessionManager`.

## Testes

`packages/coding-agent/test/suite/` com provider faux: abort antes do primeiro token devolve o texto ao editor e a
próxima requisição não contém o par abortado; abort após texto parcial não muda nada.

## Plano de eval

Classe A: sem eval de modelo. Teste interativo em tmux conforme `.nycode/skills/interactive-testing.md`.

## Aceite

Testes verdes; o payload seguinte ao abort não contém a mensagem retirada.

## Rollback

Reverter o commit (comportamento isolado no handler de abort).
