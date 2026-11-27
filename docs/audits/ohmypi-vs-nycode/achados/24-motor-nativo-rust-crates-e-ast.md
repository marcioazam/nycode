# 24 — Avaliação do motor nativo Rust (`crates/*`, `packages/natives`), `ast_grep`/`ast_edit` e orçamento de imagem

- **Classe**: **B** (**regra explícita da auditoria**: todo porte de código Rust ou dependência nativa é **sempre Classe B**; além disso `ast_grep`/`ast_edit` adicionam novas ferramentas/prompts e `provider-image-budget` altera filtragem de imagens na conversa).
- **Prioridade**: **P3** (rejeitar a stack Rust/Bazel/Nix e portar em TS puro apenas o controle preventivo `provider-image-budget` + `model-compaction-threshold` caso necessário; deixar `ast_grep`/`ast_edit` para experimento separado de baixo acoplamento).

## O que o `omp` faz

O `omp` consolida 13 crates Rust (~800k+ linhas com vendoring/fontes/dados em `omp:crates/*`) numa única `cdylib` N-API (`pi_natives`, 65 submódulos em `omp:crates/natives/src/lib.rs:25-93,334-373`) compilada com Rust `nightly-2026-11-08` (`omp:rust-toolchain.toml:1-4`), Bazel `9.2.0` (`omp:MODULE.bazel:19-120`), Zig cc e Nix (`flake.nix`) para 9 binários por arquitetura:

```rust
#[module_init]
fn install_native_crash_handler() {
	crash_handler::install();
}
```

```toml
default = ["wasm"]
# Grammars outside the linked set load as WebAssembly (src/language/grammar.rs).
# Pulls wasmtime + cranelift (and cmake at build time); off, such grammars report
# `GrammarError::Invalid` and the 17 linked grammars work unchanged.
wasm = ["tree-sitter/wasm", "dep:semver"]
```

Destaques de capacidades expostas ao agente ou controle fino:
1. **`ast_grep` / `ast_edit`** (`omp:crates/ast/Cargo.toml:14-49`, `omp:packages/coding-agent/src/tools/ast-{grep,edit}.ts`): busca e codemod estrutural AST (`ast-edit.md` = **305 tok** como comando discoverable; `ast_grep` vem desligada por default!).
2. **`provider-image-budget.ts`** (`omp:packages/coding-agent/src/session/provider-image-budget.ts:245-690`) + **`model-compaction-threshold.ts`** (`omp:packages/coding-agent/src/session/model-compaction-threshold.ts:26-75`): garantem teto de contagem e bytes de imagens por provedor descartando as mais antigas antes do HTTP 400, e permitem thresholds específicos por `provider/id`.
3. **Demais crates** (`shell`, `builtins`, `edit`, `diff`, `vcs`, `iso`, `vfs`, `xfs`, `predict`, `voice`, `snapcompact`, `utok`): avaliados caso a caso em [09](09-minimizador-de-saida-de-bash-em-ts.md), [10](10-snapcompact-vs-compaction-e-handoff.md), [13](13-hashline-edit-e-benchmark-de-edicao.md), [22](22-omp-commit-seletivo-e-conflitos.md) e [rejeitados.md](../rejeitados.md).

- **Ancestralidade Pi**: `pi0.9.4` tinha 0 código nativo; `pibase` tinha apenas 3 mini addons C/ObjC (~centenas de linhas) em `packages/tui/native/` para clipboard e teclas/VT.

## Como o `nycode` faz

- O `nycode` preserva integralmente o runtime **Node.js `>=22.19.0` + TS** (`packages/coding-agent/package.json:100`) com build de binário único simples (`:36`), binários CLI externos baixados sob demanda pelo `tools-manager.ts:42-91` (`rg` e `fd`), WASM leve (`@vscode/tree-sitter-wasm` em `extensions/syntax-check/index.ts`, `photon-node`, `quickjs-wasi`), e os 3 mini helpers C/ObjC em `packages/tui/native/`.
- Não possui `ast_grep`/`ast_edit`, não possui Rust/Bazel/Nix, e não possui descarte preventivo `provider-image-budget` nem thresholds por modelo.

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Stack nativa | 13 crates Rust nightly + Bazel 9.2 + Zig cc + Nix + `uluru` MPL-2.0 (`crates/*`) | Zero Rust; `rg`/`fd` upstream + WASM pontual + 3 mini C/ObjC TUI |
| AST estrutural para o modelo | `AstEditTool` (on, discoverable) / `AstGrepTool` (off) via `crates/ast` + `wasmtime` | `@vscode/tree-sitter-wasm` apenas para erro de sintaxe pós-edição (`syntax-check`) |
| Orçamento de imagens & threshold/modelo | `clampProviderContextImages`/`Bytes` + `modelThresholds` | Apenas globais (`compaction/threshold.ts`, `core/tools/read.ts` imagem individual) |
| Evidência de ganho do Rust no `omp` | Benches em `packages/natives/bench/` e `crates/xfs/examples/` medem **apenas ns/ms** (zero evals de acerto) | Foco explícito de produto em acerto/custo antes de velocidade (`docs/PRD.md:27`) |

## Benefício

- **Veredicto sobre a stack Rust em si**: **não compensa**. Requer Rust nightly (`alloc_error_hook`, `process_setsid`), 7 crates vendored em `crates/vendor/`, Bazel + Zig + 28 tarballs nightly, `uluru` MPL-2.0, `CDDL-1.0`/`WTFPL`, e os próprios micro-benchmarks do `omp` admitem `~150 ns` de penalidade por chamada N-API (`omp:packages/natives/bench/text.ts:18-22`, levando o próprio `omp` a deixar `visibleWidth` em JS!), sem **nenhuma** evidência no repositório de que trocar `rg`/`fd`/`diff`/`fs` por Rust eleve taxa de resolução de tarefas.
- **Onde há valor real sem portar Rust**:
  1. **`provider-image-budget.ts` (em TS puro)**: sessões longas com dezenas de screenshots/imagens anexadas estouram o limite da API Anthropic/OpenAI (ex.: max 20–100 imagens ou 20 MB/request) causando HTTP 400 irrecuperável até compactar; descartar imagens mais antigas na projeção mantendo as mais recentes resolve isso em ~80 LOC TS.
  2. **`modelThresholds` em `compaction/threshold.ts`**: já existe `threshold.ts` global; mapear exceções por modelo/janela em TS leva ~30 LOC.
  3. **`ast_grep`/`ast_edit` via `@vscode/tree-sitter-wasm`**: se um dia houver demanda de refatoração estrutural em massa, o `nycode` **já carrega** `@vscode/tree-sitter-wasm` em `syntax-check` — dispensando `crates/ast` + `wasmtime` + `cmake`!

## Custo

- **Portar `crates/natives`**: altíssimo (inviabiliza build simples e introduz múltiplos binários pré-compilados + 700 KB de notices).
- **Portar apenas `provider-image-budget` + `modelThresholds` em TS**: **0 tokens no prompt**, ~110 LOC TS puro, zero deps novas.

## Riscos

- **Rust N-API**: crashes de `dlopen`/loader/commit-limit no Windows (`omp:crates/natives/src/lib.rs:170-184`), ABI drift de glibc, dependência de Rust nightly.
- **`provider-image-budget` vs cache**: podar imagens antigas no meio do histórico quebra prefix cache na posição da imagem removida; portanto só deve disparar **quando ultrapassar o teto do provedor** (evitando erro 400 certo!).
- **`ast_edit` concorrendo com `edit`**: se exposto sem modo discoverable/`tool-search`, adiciona ~305+ tokens fixos e compete com `edit.ts`.
- Docs: `docs/PRD.md:27,31-33` (velocidade depois de custo/acerto; núcleo enxuto) e `docs/ADR.md:65-77` (ADR-0004).

## Licença

Workspace `omp` é **MIT** (`omp:Cargo.toml:33`), mas a árvore de dependências nativas inclui `uluru@3.1.0` (**MPL-2.0**, `omp:deny.toml:42-47`), `inferno` (**CDDL-1.0**) e `terminfo` (**WTFPL**, `omp:about.toml:9-34`). Recortes em TS puro (`provider-image-budget`, `modelThresholds`) evitam integralmente essas dependências.

## Proposta

1. **Não portar `crates/*` nem `packages/natives`**.
2. **Recorte TS opcional (`provider-image-budget`)**: em `packages/coding-agent/src/core/agent-session.ts` (na projeção pré-requisição) + `core/compaction/threshold.ts`, adicionar guarda preventiva que só atua quando a soma/contagem de blocos `image` na conversa ultrapassar o teto seguro do catálogo do modelo (`model.input.includes("image")`), removendo as imagens mais antigas e substituindo por nota curta `[image omitted due to provider request limit]`.

## Testes

- `packages/coding-agent/test/`: simular conversa com 25/105 imagens acima do teto de bytes/contagem do provedor -> abaixo do teto retorna 100% inalterado (preservando cache!); acima do teto preserva a imagem mais recente do usuário e último `toolResult` removendo as mais antigas.

## Plano de eval

- **Base e candidato**: (1) para `provider-image-budget`, validação offline determinística de limites + `bench/run.py` em `suite.s1` (`pr_cases`) confirmando impacto zero em sessões normais (`MARGIN = -0.10`, `PARITY_COST_MAX = 1.10`); (2) caso futuramente alguém proponha `ast_grep`/`ast_edit` em WASM, exigir eval pareado em `suite.s3` (`swebenchpro`) provando que o ganho compensa os ~305 tokens da tool. Não reexecutar `cc-vanilla`/`pi-vanilla`.

## Critérios de aceite

1. Zero dependência Rust/Bazel/Nix adicionada ao `nycode`.
2. Sessões abaixo do limite de imagens não sofrem nenhuma mutação no array de mensagens.

## Rollback

Remover a filtragem de excesso de imagens da projeção de turno.
