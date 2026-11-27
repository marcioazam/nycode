# 13 — `hashline` edit vs `edit` atual e `typescript-edit-benchmark`

- **Classe**: **B** (altera formato de `read` e `edit`, schema, prompts e depende de motor Rust `crates/edit` de 28,9k LOC ou reescrita substancial em TS — exige eval dedicado antes de qualquer adoção).
- **Prioridade**: **P2** (**adotar o benchmark offline estilo `typescript-edit-benchmark` primeiro**; **não** adotar `hashline` sem provar que supera `oldText`/`newText` nos modelos-alvo do `nycode` pagando o custo extra de `N#TAG` em toda leitura).

## O que o `omp` faz

O `omp` substituiu `edit-diff.ts` por um motor Rust (`omp:crates/edit`, 28.941 LOC + `crates/edit/tests/*.rs` 8.826 LOC + `src/edit/*.ts` 3.519 LOC), usando por padrão o formato **`hashline`** (`omp:packages/coding-agent/src/edit/index.ts:383-930`, `omp:crates/edit/src/modes/hashline/patcher.rs:661-683`):
- Toda saída de `read`/`grep`/`write` prefixa linhas com `N#TAG` (hash `xxh32` de 4 chars hex da linha sem trailing whitespace, `omp:crates/edit/src/store.rs:88-104`).
- As edições referenciam âncoras (`PUT N.=M:`, `<N`, `>N`, `>$`, `N*` bloco AST, `CUT`, `MV`, `REM`) e passam por `assert_seen_lines` (recusa editar linhas não exibidas ao modelo):

```rust
	if live_matches {
		if let Some(max_columns) = seen_line_guard {
			assert_seen_lines(
				section,
				&block_resolutions,
				expected,
				canonical,
				store,
				normalized,
				None,
				max_columns,
			)?;
		}
		let mut result = apply_edits(normalized, &resolved, ApplyOptions {
			clipboard:      Some(clipboard),
			path:           Some(canonical.to_string_lossy().as_ref()),
			on_empty_paste: EmptyPaste::Throw,
		})?;
```

- Porém, em `omp:packages/coding-agent/src/utils/edit-mode.ts:23-48`, o próprio `omp` desliga `hashline` e volta para `replace` em 8 famílias (`kimi`, `mimo`, `minimax`, `deepseek`, `stepfun`, `codex-spark`, `glm flash 5.3.0`, `qwen 3.8.0`) porque modelos menores erram a DSL customizada.
- Além disso, mantém o benchmark dedicado `omp:packages/typescript-edit-benchmark/` (`3.168` LOC) e `omp:scripts/rate-edit-tool.py` para testar formatos de edição sobre mutações de código reais.

- **Ancestralidade Pi**: `pi0.9.4:packages/coding-agent/src/tools/edit.ts:115-219` era `{ path, oldText, newText }` simples; `pibase` evoluiu para `edits[]` batch com `fuzzyFindText`, preservação BOM/CRLF e `file-mutation-queue.ts`.

## Como o `nycode` faz

Em `packages/coding-agent/src/core/tools/edit.ts:138-217`, `edit-diff.ts:343-406` (`745` LOC) e `file-mutation-queue.ts:32-61` (`1.027` LOC no total, verificados byte-a-byte idênticos ao `pibase` `073b0ba`):

```ts
				const { bom, text: content } = splitBom(rawContent);
				const normalizedContent = normalizeToLF(content);
				const { baseContent, newContent, replacements } = applyEditsToNormalizedContent(
					normalizedContent,
					edits,
					path,
				);
				// Diff before writing, so diff computation cannot fail after the write.
				const editDiff = generateEditDiff(path, baseContent, newContent, replacements);
				throwIfAborted();

				const finalContent =
					bom + (content === normalizedContent ? newContent : applyReplacementsToOriginal(content, replacements));
				await ops.writeFile(absolutePath, finalContent);
```

- `edit.ts` retorna diff em janelas de `32` linhas (`generateEditDiff`), preserva BOM/CRLF e usa `constrainedSampling` (`json_schema`, `strict: "prefer"`). O `read.ts` do `nycode` retorna texto limpo **sem** prefixos `N#TAG` por linha.

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Formato padrão de `edit` | `hashline` (`PUT N.=M:` + `#TAG` + blocos AST + `CUT`/`MV`/`REM`), fallback `replace` em 8 famílias | `edits: [{ oldText, newText }]` + `fuzzyFindText` + JSON Schema |
| Formato de saída do `read` | Prefixa toda linha com `N#TAG` (`omp:crates/edit/src/modes/hashline/format.rs:103-105`) | Texto limpo sem prefixo por linha (`core/tools/read.ts:250-344`) |
| Guarda de linhas lidas | `EditStore` + `assert_seen_lines` exige que linhas tenham sido lidas | Sem rastreamento de linhas lidas (`oldText` único basta) |
| Multi-arquivo em 1 chamada | Sim (`*** Begin Patch` com múltiplos `[PATH#TAG]`) | 1 `path` por chamada (`edits[]` múltiplos no mesmo arquivo) |
| Complexidade | **32.5k LOC** (TS + Rust + tree-sitter + gramáticas Lark) | **1.027 LOC** TS puro |

## Benefício

- **Dados e contraponto da web**: o blog do autor (`blog.can.ac`) reporta grandes ganhos de `hashline` em relação a `patch`/unified-diff (ex.: +15 pts médios, e salto extremo de `6,7% -> 68,3%` no `Grok Code Fast 1` com `-61%` em tokens de saída em edições), mas análise independente (`future-seems-so-good.com`, lida via Exa em `fontes.md`) contra `str_replace` em frontier models observou ganho médio bem mais modesto (`+3,4 pp`).
- **Custo escondido em tokens no `nycode`**: adicionar `N#TAG` em toda linha lida em `read.ts` inflaciona **~2–3 tokens por linha** na **entrada** (~600–900 tokens extras em um arquivo de 300 linhas). No `nycode`, onde `read.ts` retorna texto puro, o benefício em `output_tokens` precisa pagar essa inflação recorrente de `input_tokens` + descrição `hashline.md` (**563 tok** vs **239 tok** total de `edit` no `nycode`) + risco de retries por `#TAG` obsoleto / linha não vista.
- **Onde o `omp` dá uma ideia imediatamente aproveitável (B)**: ter um **eval/benchmark específico de edição** (`typescript-edit-benchmark`) e testar isoladamente uma guarda leve de `seenLines` / hash por arquivo *ou* operações de substituição por faixa de linhas opcional, **antes** de cogitar trocar `oldText`/`newText`.

## Custo

- **Tokens / turno**: `hashline.md` custa **563 tok** (`hashline-compact.md` **445 tok**) apenas de descrição vs **239 tok** (descrição+schema completos) no `nycode`; mais `+2–3` tokens por linha retornada em **toda** chamada `read`/`grep`.
- **Manutenção**: portar `crates/edit` custa 28,9k LOC Rust + 8,8k testes + tree-sitter; mesmo um protótipo `hashline` em TS puro exigiria acoplar `read.ts`, `grep.ts`, `write.ts`, `edit.ts` e `agent-session.ts`. Apenas importar o protocolo de benchmark de edição (`typescript-edit-benchmark`) é leve (~1k LOC de harness offline).

## Riscos

- **Regressão em modelos não treinados no DSL**: conforme `omp:packages/coding-agent/src/utils/edit-mode.ts:32-46`, 8 famílias de modelos falham no `hashline`.
- **Contrariar `docs/PRD.md:19-27`**: inflar todas as leituras com `N#TAG` pode subir o custo total líquido por tarefa mesmo economizando tokens de saída em edições grandes.
- Docs: qualquer mudança no protocolo de `read`/`edit` exige nova ADR em `docs/ADR.md` (checkout principal) e passagem rigorosa no gate `bench-pr`.

## Licença

**MIT** (`omp:LICENSE:1-23`; `omp:packages/typescript-edit-benchmark/package.json:1-40` MIT).

## Proposta

1. **Passo 1 (baixo risco)**: construir em `packages/evals/` um eval dedicado de edição inspirado em `omp:packages/typescript-edit-benchmark` (usando modelos-alvo configurados no `nycode`, ex.: Claude Sonnet / Opus / Haiku e modelos open-weight do catálogo) comparando `edit` atual (`oldText`/`newText`) vs protótipo leve em TS puro (`line-range + hash4` ou `seen-file check`) medindo **acerto + `total_cost_usd` incluindo tokens extras de `read`**.
2. **Passo 2 (condicional aos números do eval)**: só avançar para implementação no `core/tools/` se o candidato provar ganho líquido de acerto **e** redução/paridade de `total_cost_usd` no `bench/`. (Rejeitar porte Rust `crates/edit`).

## Testes

- Caso um protótipo TS avance após o eval: estender `packages/coding-agent/test/edit-*.test.ts` e `packages/coding-agent/test/tools.test.ts` mantendo 100% da suíte atual (`edit-diff-window`, `edit-tool-diff-before-write`, `edit-tool-legacy-input`).

## Plano de eval

- **Fase 1 (micro-eval de edição em `packages/evals/`)**: rodar mutações determinísticas AST estilo `typescript-edit-benchmark` sobre pares `(edit atual vs candidato)` medindo taxa de sucesso na 1ª tentativa, retries, `input_tokens` (incluindo `read` com e sem `N#TAG`) e `output_tokens`.
- **Fase 2 (`bench/run.py` + `bench/gate.py`)**: antes de qualquer merge no core, rodar `suite.s3` (`swebenchpro`) e `suite.s2` (`tb2`) comparando **`nycode` baseline vs `nycode + candidato`**, exigindo `AHEAD_P >= 0.80` ou `MARGIN = -0.10` com `total_cost_usd <= 1.10×`. Nunca reexecutar `cc-vanilla`/`pi-vanilla`.

## Critérios de aceite

1. Eval controlado demonstra que o ganho de acerto/economia de saída compensa 100% os tokens extras em `read` + descrição da ferramenta.
2. Zero dependência Rust/N-API.

## Rollback

Manter `edit.ts` (`edits: [{ oldText, newText }]`) inalterado até prova empírica em `packages/evals/` e `bench/`.
