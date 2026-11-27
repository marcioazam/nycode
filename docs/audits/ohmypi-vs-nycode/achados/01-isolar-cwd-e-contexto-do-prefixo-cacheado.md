# 01 — Isolar `<cwd>` e contexto volátil do prefixo em cache

- **Classe**: **A** (zero tokens extras, preserva comportamento do modelo, melhoria pura de taxa de cache hit).
- **Prioridade**: **P0** (impacto direto no custo de `cacheWrite` vs `cacheRead` entre diretórios/worktrees e retomada de sessões).

## O que o `omp` faz

O `omp` ancora os breakpoints `cache_control` do bloco de sistema da Anthropic **antes** dos segmentos voláteis por sessão/diretório, definidos em `VOLATILE_SYSTEM_SEGMENT_MARKERS` (`omp:packages/ai/src/providers/anthropic.ts:4666-4673`) e usados por `applyHeadCaching` (`omp:packages/ai/src/providers/anthropic.ts:4709-4740`), além de manter `<project-context>` no fim de `buildSystemPrompt` (`omp:packages/coding-agent/src/system-prompt.ts:1190-1196`):

```ts
const VOLATILE_SYSTEM_SEGMENT_MARKERS = ["<memories>", "<project-context>"];

function volatileSystemSuffixStart(systemBlocks: readonly AnthropicSystemBlock[]): number {
	const start = systemBlocks.findIndex(block =>
		VOLATILE_SYSTEM_SEGMENT_MARKERS.some(marker => block.text.startsWith(marker)),
	);
	return start === -1 ? systemBlocks.length : start;
}
```

- **Ancestralidade Pi**: em `pi0.9.4:packages/ai/src/providers/anthropic.ts:346,355,366`, todos os blocos de sistema recebiam `cache_control` fixo; no `pibase`, tudo ia num bloco único `initialSystemText`. O `omp` separou os blocos estáticos dos voláteis em **todas** as sessões.

## Como o `nycode` faz

- Em `packages/ai/src/api/anthropic-messages.ts:1490-1514`, `initialSystemText` é enviado em um único bloco `{ type: "text", text: sanitizeSurrogates(initialSystemText), cache_control }`.
- O `cwd` entra no último bloco construído em `packages/coding-agent/src/core/system-prompt.ts:192-201` (`promptSections.cwd = cwd.replace(/\\/g, "/")`).
- Apenas o modo headless (`-p`) aplica `splitCwd` em `packages/coding-agent/src/extensions/headless-lean/index.ts:67-81` (movendo `<cwd>` para fora do bloco com `cache_control`), ao passo que sessões interativas e subagentes mantêm `<cwd>`, `<project_context>`, `<memory>` e `<skills>` dentro do bloco com `cache_control` (`packages/coding-agent/src/extensions/prefix-cache-1h/index.ts:26-40` marca `ttl: "1h"` em `tools` + `system`).

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Isolamento em sessão interativa | `volatileSystemSuffixStart` exclui `<memories>` e `<project-context>` antes do breakpoint (`omp:packages/ai/src/providers/anthropic.ts:4666-4740`) | Só `headless-lean` extrai `<cwd>` (`extensions/headless-lean/index.ts:67-80`); sessões TUI mantêm tudo no bloco cacheado (`anthropic-messages.ts:1498-1513`) |
| Reuso de prefixo entre worktrees | Prefixo base (tools + instruções estáticas) atinge `cacheRead` (0,1×) em qualquer diretório | Qualquer mudança de `cwd` (worktree novo) invalida o bloco `system` inteiro e cobra `cacheWrite` (2× em TTL 1h) |

## Benefício

- **Problema**: sessões interativas abertas em worktrees distintos (ex.: `~/source/nycode` vs `~/source/nycode-wt-123`) ou projetos com `<cwd>` diferente têm exatamente as mesmas declarações de ferramentas e regras base (`prompt4` = 539 tok + `tools` + `contract`), mas perdem o cache do bloco `system` porque `<cwd>` está dentro do bloco anotado com `cache_control` em `packages/ai/src/api/anthropic-messages.ts:1500-1513`.
- **Rastro**: ao trocar `cwd` com cache de 1h ativo (`extensions/prefix-cache-1h/index.ts:26-40`), o bloco inteiro passa de `cacheRead` para `cacheWrite` 1h (20× mais caro que leitura em cache).
- **Solução**: separar os blocos voláteis de diretório/contexto (no mínimo `<cwd>`, em bloco separado após o marcador `cache_control` quando `splitSystemBlocks` ou marcador explícito estiver presente, generalizando `splitCwd` para fora de `headless-lean`), mantendo intacta a compatibilidade de TTL 1h antes de 5m.

## Custo

- **Tokens / turno**: **0** (mesmos caracteres totais enviados à API).
- **Latência**: **0 ms** (divisão simples de array de blocos de sistema).
- **Manutenção**: ~30–50 LOC em TypeScript puro, zero dependências externas.

## Riscos

- **Ordem de TTL no Anthropic**: blocos com `ttl: "1h"` precisam vir antes de blocos sem `cache_control` ou com `ttl: "5m"` (`extensions/prefix-cache-1h/index.ts:6-7`); se o bloco volátil ficar *sem* `cache_control` ao final de `params.system`, respeita a ordenação da API.
- **Mínimo de tokens por bloco cacheável**: Anthropic exige mínimo de 1024/2048/4096 tokens no prefixo até o breakpoint conforme o modelo. Quando `tools + system base` juntos atingem o mínimo (breakpoint está no último tool + fim do bloco estático do system), dividir `<cwd>` mantém o prefixo de `tools + base` somado no cache; apenas quando o prefixo total for menor que o mínimo do modelo o breakpoint de sistema deixaria de cachear `tools + base` juntos (verificável no payload de teste).
- **Docs do repo**: revisar relação com `docs/specs/0002-headless-lean.md` e `docs/ADR.md` (cópia não rastreada no checkout principal).

## Licença

Código de referência no `omp` sob licença **MIT** (`omp:LICENSE:1-23`). Nenhuma dependência externa copiada; apenas padrão arquitetural.

## Proposta

- **`packages/ai/src/api/anthropic-messages.ts`**: permitir que `params.system` receba blocos estáveis com `cache_control` seguidos por um bloco final volátil sem `cache_control` (ou dividir no marcador de seção `<cwd>` / `<memory>` se configurável), mantendo inalterado o comportamento OAuth (`You are Claude Code...`).
- **`packages/coding-agent/src/core/system-prompt.ts`** (e **`packages/coding-agent/src/extensions/headless-lean/index.ts`**): manter `<cwd>` no final de `buildSystemPromptSections` e reutilizar o helper único de separação sem duplicar regex entre `headless-lean` e `anthropic-messages`.
- **`packages/coding-agent/src/extensions/prefix-cache-1h/index.ts`**: garantir que apenas os blocos estáveis do sistema recebam `ttl: "1h"`.

## Testes

- Estender `packages/ai/test/anthropic-cache-write-1h-cost.test.ts` e `packages/coding-agent/test/headless-lean.test.ts` (ou criar teste unitário específico) verificando:
  1. Duas chamadas com `tools` + `system base` idênticos e `<cwd>` diferentes geram blocos `system[0..k]` byte-idênticos com `cache_control` e `<cwd>` fora do bloco cacheado.
  2. Ordem de TTL (`1h` -> sem `cache_control` -> `5m` em mensagens) nunca gera bloco `1h` após `5m`.

## Plano de eval

Não aplicável (Classe A: nenhum token novo, mesmo texto semântico de system prompt e mesmo comportamento do modelo; opcionalmente confirmável por inspeção de payload com provider `faux`).

## Critérios de aceite

1. Em sessões interativas e headless Anthropic, alterar apenas `<cwd>` preserva hash idêntico dos blocos `tools` e `system` com `cache_control`.
2. Zero mudança na string final visível pelo modelo concatenando `params.system`.
3. Todos os testes de cache em `packages/ai/test/` passam via `vitest`.

## Rollback

Reverter o split de `<cwd>` no `params.system` mantendo apenas `headless-lean/index.ts:67-81`.
