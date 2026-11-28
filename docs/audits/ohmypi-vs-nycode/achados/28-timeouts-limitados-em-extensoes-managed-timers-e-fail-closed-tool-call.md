# 28 — Guardião fail-closed + timeout em `emitToolCall`, `ManagedTimers` e atraso anti-tecla em vôo

- **Classe**: **A** (zero tokens extras; atua exclusivamente na confiabilidade do barramento de extensões e segurança da UI de aprovação).
- **Prioridade**: **P2** (corrige lacuna assimétrica onde `emitToolCall` do `nycode` não tem `try/catch` nem timeout e previne aprovações acidentais).

## O que o `omp` faz

1. **`emitToolCall` fail-closed com timeout pausável durante diálogos (`omp:packages/coding-agent/src/extensibility/extensions/runner.ts:204-265,2480-2545`)**: toda execução de handler `tool_call` roda dentro de `#runHandlerWithTimeout` com teto configurável (padrão 30s), pausando o relógio enquanto `ui.confirm`/`ui.select`/`ui.input` aguarda decisão humana (`runDialog`), e convertendo exceção ou timeout em `{ block: true, reason: ... }` (**fail-closed** — extensão travada jamais autoriza execução silenciosa da tool).
2. **`ManagedTimers` isolados para trabalho em background de extensões (`omp:packages/coding-agent/src/extensibility/extensions/managed-timers.ts:22-83`)**: expõe `setInterval`/`setTimeout` encapsulados em `try/catch` + captura de Promise rejeitada, marcados `.unref?.()` e limpos integralmente em `clearAll()` no teardown da sessão, evitando que um timer com exceção derrube o processo Node inteiro (`uncaughtException`).
3. **Janela `APPROVE_ARM_MS` contra digitação em vôo no diálogo de aprovação (`omp:packages/coding-agent/src/ui/overlays/panels/approval-dialog.tsx:9,117,150`)**: ignora `Enter` e teclas de aprovação pelos primeiros milissegundos após abrir o modal, redirecionando teclas digitadas para rascunho de recusa caso o usuário estivesse terminando uma digitação no composer.

## Como o `nycode` faz

- **`packages/coding-agent/src/core/extensions/runner.ts:1260-1278`**: embora `emit()` (`lines 1113-1131`), `emitMessageEnd()` (`lines 1169-1195`) e `emitToolResult()` (`lines 1208-1244`) envolvam cada handler em `try/catch`, **`emitToolCall()` não possui `try/catch` nem timeout** (`const handlerResult = await handler(event, ctx)` na linha 1266). Uma extensão de terceiros ou regra que lance exceção ou fique pendurada em rede trava ou derruba o dispatch da ferramenta sem política fail-closed.
- **`packages/coding-agent/src/core/extensions/`**: extensões que agendam `setInterval`/`setTimeout` brutos dependem de controle manual de lifecycle no `session_shutdown`.
- **`packages/coding-agent/src/core/permissions/gate.ts:72`**: delega confirmação para `ctx.ui.confirm(...)`, que encaminha diretamente ao prompt padrão do runner (`runner.ts:585`) sem proteção contra Enter em vôo imediatamente após o diálogo surgir na tela.

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| `emitToolCall` | Timeout 30s (pausável em diálogos) + fail-closed `{ block: true }` em erro/timeout (`omp:packages/coding-agent/src/extensibility/extensions/runner.ts:2497-2545`) | Sem `try/catch` nem timeout em `packages/coding-agent/src/core/extensions/runner.ts:1260-1278` |
| Timers em extensões | `ManagedTimers` isolados, `.unref()` e `clearAll()` no shutdown (`omp:packages/coding-agent/src/extensibility/extensions/managed-timers.ts:22-83`) | Apenas timers Node crus por extensão |
| Aprovação TUI rápida | Guarda temporal `APPROVE_ARM_MS` evita Enter acidental (`omp:packages/coding-agent/src/ui/overlays/panels/approval-dialog.tsx:9,150`) | Sem janela de proteção no `confirm` de permissão (`gate.ts:72`) |

## Benefício

- **Problema**: um único handler `tool_call` travado ou com exceção não tratada trava toda a execução da ferramenta ou quebra a assimetria fail-closed já garantida em `permissions/gate.ts:77-80`; usuários digitando no terminal podem aprovar um comando sem querer se `Enter` chegar no mesmo frame de abertura do diálogo.
- **Solução**: espelhar o padrão fail-closed + timeout com pausa durante `ui.*` em `emitToolCall`, oferecer `ctx.managedTimers` opcional no teardown de `ExtensionRunner`, e adicionar delay mínimo configurável (`>= 200ms`) apenas nos prompts de permissão críticos.

## Custo

- **Tokens / turno**: **0**.
- **Latência**: **0 ms** para handlers rápidos e timeouts só disparam quando travados.
- **Manutenção**: ~120 LOC TS puro.

## Riscos

- Em testes automatizados síncronos com mock de terminal, `APPROVE_ARM_MS` pode causar flakiness se enviar `Enter` no mesmo tick: injetar clock `now = () => Date.now()` testável ou aplicar apenas a UI real de aprovação (não em testes headless).
- Limpar o `timer` de timeout via `clearTimeout` sempre no `finally` para não vazar handles no `vitest`.

## Licença

Padrão de referência **MIT** (`omp:LICENSE:1-23`).

## Proposta

- **`packages/coding-agent/src/core/extensions/runner.ts`**: envolver `emitToolCall` em `try/catch` + `Promise.race` com timeout configurável (pausado enquanto `ui.confirm`/`select`/`input` estiver ativo), retornando `{ block: true, reason: ... }` em exceção ou timeout.
- **`packages/coding-agent/src/core/extensions/managed-timers.ts`** (helper opcional): encapsular `setTimeout`/`setInterval` ligados ao `ExtensionRunner.shutdown()`.
- **`packages/coding-agent/src/modes/interactive/` (diálogo `confirm` de gate)**: ignorar `Enter` nos primeiros ~200 ms quando explicitamente armado para permissão destrutiva.

## Testes

- `packages/coding-agent/test/extensions/runner-tool-call-fail-closed.test.ts`: handler `tool_call` que lança erro ou nunca resolve é bloqueado (`block: true`) após timeout sem vazar unhandled rejection; diálogo `confirm` pausado não consome o budget de timeout.

## Plano de eval

Não aplicável (Classe A: zero impacto em tokens, prompts ou trajetória nominal do agente; apenas isolamento de erros de extensões e ergonomia de aprovação).

## Critérios de aceite

1. Handler `tool_call` com exceção ou Promise pendente retorna `{ block: true }`.
2. Diálogos de aprovação humana não expiraram pelo relógio do timeout enquanto aguardam o usuário.

## Rollback

Remover timeout/`ManagedTimers` mantendo o `try/catch` mínimo em `emitToolCall`.
