# 09 — Minimizador semântico de saída do `bash` (em TypeScript puro, sem VM Rust)

- **Classe**: **B** (altera o texto de `toolResult` do `bash` entregue ao modelo e adiciona diretriz/spill; exige eval pareado em `bench/`. Portar a VM `crates/shell` inteira é também B/C e desaconselhado; o recorte alvo aqui é um pós-processador **TS puro**).
- **Prioridade**: **P0** (corrige falha concreta do `truncateTail`: erros de compilação no topo de `cargo`/`tsc`/`pytest`/`mvn` são cortados fora enquanto linhas de resumo final sobrevivem).

## O que o `omp` faz

O `omp` captura saídas de comandos elegíveis >= `1.000` caracteres (`MIN_MINIMIZE_CHARS`, `omp:crates/shell/src/minimizer/engine.rs:16-20`), aplica filtros específicos por ferramenta (`cargo`, `git`, `mvn`, `gradle`, `npm`/`pnpm`/`yarn`/`bun`, `pytest`, `go`, `docker`, etc. em `omp:crates/shell/src/minimizer/filters/*.rs` + `defs/*.toml`) e, **apenas se o spill em disco for gravado com sucesso** (`onMinimizedSave` em `omp:packages/coding-agent/src/exec/bash-executor.ts:1106-1131`), devolve a saída comprimida com aviso `[raw output: local://<id>.log]`:

```rust
/// Captured outputs shorter than this are returned verbatim without filtering.
pub const MIN_MINIMIZE_CHARS: usize = 1_000;
fn is_below_minimize_threshold(captured: &str) -> bool {
	captured.chars().take(MIN_MINIMIZE_CHARS).count() < MIN_MINIMIZE_CHARS
}
```
```ts
		const minimized = winner.result.minimized;
		let minimizedMeta: MinimizedMeta | undefined;
		if (minimized && minimized.text !== minimized.originalText) {
			const info = {
				filter: minimized.filter,
				inputBytes: minimized.inputBytes,
				outputBytes: minimized.outputBytes,
			};
			const artifactId = options?.onMinimizedSave
				? await options.onMinimizedSave(minimized.originalText, info)
				: undefined;
			if (artifactId) {
				minimizedMeta = { ...info, artifactId };
```

- **Ancestralidade Pi**: `pi0.9.4:packages/coding-agent/src/tools/bash.ts:69-160` apenas bufferizava até 10 MB; `pibase:packages/coding-agent/src/core/bash-executor.ts:48-148` trouxe `truncateTail` (`50 KB`). O `omp` construiu `crates/shell` (377k LOC) + `crates/builtins` (320k LOC) + minimizer inspirado no RTK (`omp:crates/shell/NOTICE:1-15`).

## Como o `nycode` faz

Em `packages/coding-agent/src/core/bash-executor.ts:48-150` e `packages/coding-agent/src/core/tools/truncate.ts:172-250`, o `nycode` remove sequências ANSI, salva o log completo em arquivo temporário se passar de `DEFAULT_MAX_BYTES = 50 KB` e aplica `truncateTail` genérico (últimas `2.000` linhas / `50 KB`). Não há resumo semântico para saídas verbosas entre 1 KB e 50 KB, nem preservação inteligente de diagnósticos no topo do log.

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Execução do shell | VM bash 5.3 + zsh + 50 builtins in-process em Rust (~697k LOC) | `child_process.spawn` do shell real do SO (`core/tools/bash.ts:118-202`) |
| Saídas de `1 KB` a `50 KB` | Filtros por CLI comprimem progresso/passagens mantendo erros (`engine.rs:87-125`) | Retorna **100% bruto** até `50 KB` / `2.000 L` (`truncate.ts:11-12`) |
| Saídas > `50 KB` | Minimiza antes e aponta spill; `\| cat` desabilita filtro | `truncateTail` cego descarta o começo (onde ficam erros iniciais de `tsc`/`cargo`/`pytest`) |

## Benefício

- **Problema**: ao rodar `npm test`, `pytest -vv`, `cargo test`, `git diff` ou `npm install` com 800 linhas de progresso/passes e 3 erros no começo, o `nycode` injeta até ~12k–15k tokens inteiros na janela do modelo (se < 50 KB) ou apaga os erros reais do topo pelo `truncateTail` (se > 50 KB), forçando o modelo a rodar `read` no arquivo temporário ou `2>&1 | head`.
- **Rastro**: em `packages/coding-agent/src/core/bash-executor.ts:132-149`, o output completo já está disponível após o término do processo filho antes da entrega ao `AgentToolResult`, sendo um único ponto de encaixe sem precisar trocar o `spawn` do shell por uma VM Rust.
- **Solução**: rejeitar a VM Rust (`crates/shell`/`builtins`) e portar apenas uma camada enxuta (~300–450 LOC) de pós-processamento em TS puro (para os 6–8 comandos mais verbosos em dev/bench: `git status/log/diff`, `npm/pnpm/yarn/bun test/install`, `pytest`, `cargo build/test`, `mvn/gradle`, `vitest`/`jest`), ativada apenas acima de `1.000` chars, **sempre gravando o arquivo bruto em `/tmp` e anexando o caminho** para recuperação exata, e desabilitando quando o comando usa pipes explícitos (`|`) ou redirecionamentos.

## Custo

- **Tokens / turno**: **0** fixo no prompt (opcional: menção curta só no rodapé quando comprimido). Redução esperada em `toolResult` de builds/testes verbosos (as 20 fixtures em `omp:crates/shell/tests/minimizer_fixtures.rs:27-120` exigem `<= 40%` do tamanho bruto; não medido em runtime aqui).
- **Latência**: **< 5 ms** em regex/linhas TS sobre saída já capturada.
- **Manutenção**: ~350–450 LOC TS puro em módulo isolado; zero Rust/N-API. (Portar `crates/shell` custaria 697k LOC + Rust nightly).

## Riscos

- **Ocultação de linha diagnóstica rara**: se um filtro agressivo resumir uma linha crucial (ex.: erro de fixture customizada), o agente precisa gastar 1 chamada `read` no log salvo ou re-executar (`| cat`). Mitigação: só resumir saídas `exitCode === 0` ou preservar integralmente blocos com `error`, `Error`, `FAIL`, `traceback`, `AssertionError` e números de linha; desabilitar se saída < 1.500 chars ou se o comando termina com `| cat` / `| head` / `| grep`.
- **Diferença de ambiente em `bench/`**: no `swebenchpro` / `tb2`, manter o caminho bruto salvo e impresso no rodapé `[raw: <tmp>]` preserva 100% da recuperabilidade.
- Docs: alinhado a `docs/PRD.md:19-27` (custo×benefício primeiro, zero dependência nativa extra).

## Licença

**MIT** (`omp:LICENSE:1-23`; algoritmos inspirados em RTK declarados MIT em `omp:crates/shell/NOTICE:1-15`). Implementação escrita em TS próprio do zero.

## Proposta

- **`packages/coding-agent/src/core/bash-minimizer.ts`** (novo módulo TS puro, <= 500 LOC): detector de família de comando simples (sem pipes) + filtros determinísticos para `git`, `pytest`, `vitest`/`jest`, `npm`/`pnpm`, `cargo`, preservando cabeçalhos, contagens, diffs curtos e 100% das linhas de falha/traceback.
- **`packages/coding-agent/src/core/bash-executor.ts:132-149`**: aplicar o minimizer opcional antes de `truncateTail` **somente após salvar a saída bruta no arquivo temporário**, anexando o caminho exato no aviso final.

## Testes

- Criar `packages/coding-agent/test/bash-minimizer.test.ts` com fixtures reais (capturadas de `pytest`, `vitest`, `cargo test`, `git status`, `tsc`) verificando:
  1. Comandos < 1.000 chars ou com `|` voltam 100% inalterados.
  2. `tsc`/`pytest`/`cargo` com erros no topo + 500 linhas verdes depois preservam os erros do topo (onde `truncateTail` perderia!).
  3. Arquivo temporário sempre contém 100% do bruto sem perdas.

## Plano de eval

- **Base e candidato**: `nycode` (`origin/main`) vs `nycode + bash-minimizer (TS)` via `bench/run.py` + `bench/gate.py` em `suite.s2` (`tasks/tb2.json`, held-out) e `suite.s3` (`tasks/swebenchpro.json`), onde execuções repetidas de `pytest`/`cargo`/`npm test` dominam o volume de tokens. Rodar `--dry-run` antes; **não** reexecutar `cc-vanilla` nem `pi-vanilla` (`docs/bench/RUNBOOK.md`).
- **Critério (`bench/stats.py`)**: redução de `input_tokens` / `total_cost_usd`, zero aumento em `turns` por falha de diagnóstico (`TURNS_MAX = 1.10`) e acerto dentro de `MARGIN = -0.10`.

## Critérios de aceite

1. Redução estatística de tokens de `toolResult` do `bash` sem aumento no número de turnos nem perda de acerto em `s2`/`s3`.
2. Erros de topo em logs longos passam a permanecer visíveis no `toolResult`.

## Rollback

Remover chamada do minimizer em `core/bash-executor.ts:132-149` ou chavear via `bash.minimizeOutput: false`.
