# 11 — LSP pós-escrita: `DiagnosticsLedger`, espera por versão, batching e `defaults.json`

- **Classe**: **B** (altera latência/saída de `edit`/`write` entregue ao modelo, adiciona deduplicação de diagnósticos, pode iniciar servidores LSP sem `lsp.json` manual — exige eval em `bench/`).
- **Prioridade**: **P1** (corrige três defeitos concretos do `extensions/lsp/index.ts` atual: `delay(1500)` cego por escrita, diagnósticos obsoletos/perdidos em cold start e repetição dos mesmos erros a cada edição).

## O que o `omp` faz

Em `omp:packages/coding-agent/src/lsp/writethrough.ts:377-647`, `diagnostics.ts:54-83,213-234` e `diagnostics-ledger.ts:12-44`:
1. **Batching no turno**: `getLspBatchRequest` (`lsp/batch.ts:12-24`) grava arquivos intermediários imediatamente e só executa sync/diagnósticos na última escrita (`flush: true`).
2. **Corrida por versão do documento**: `fetchDiagnosticsWithDeferral` (`omp:packages/coding-agent/src/lsp/writethrough.ts:377-402`) verifica `minVersions` / `expectedDocumentVersions` e corre contra `INLINE_DIAGNOSTICS_WAIT_TIMEOUT_MS = 500` ms; servidores rápidos retornam em ~50–200 ms, servidores lentos continuam em background até `12s+` e entregam via canal tardio (`yieldQueue` + `lsp-late-diagnostic.md`, 84 tokens):

```ts
	const fetchPromise = getDiagnosticsForFile(dst, cwd, servers, {
		signal: deferred.signal,
		minVersions,
		expectedDocumentVersions,
		timeoutMs: deferredWaitMs,
	});
	const INLINE_TIMEOUT = Symbol("inline-diagnostics-timeout");
	const raced = await Promise.race([
		fetchPromise,
		Bun.sleep(INLINE_DIAGNOSTICS_WAIT_TIMEOUT_MS).then(() => INLINE_TIMEOUT),
	]);
	if (raced !== INLINE_TIMEOUT) {
		return apply(raced as FileDiagnosticsResult | undefined);
	}
```

3. **Deduplicação e descoberta**: `DiagnosticsLedger` suprime diagnósticos já mostrados em escritas anteriores; `defaults.json` (`511` linhas) pré-configura 55 servidores LSP; a tool `lsp` usa `loadMode = "discoverable"` (`429` tokens em `lsp.md`) e coordenadas **1-based** por substring `symbol`.

- **Ancestralidade Pi**: ausente em `pi0.9.4` e `pibase`. Criação original de cada fork (`omp` e `nycode` desenvolveram separadamente).

## Como o `nycode` faz

Em `packages/coding-agent/src/extensions/lsp/index.ts:566-604,656-764`, `post-edit.ts:17-23` e `extensions/syntax-check/index.ts:120-152`:
- `syntax-check` (`@vscode/tree-sitter-wasm`) já pega erros de sintaxe imediatamente e só reporta regressões novas (`extensions/syntax-check/index.ts:143-148`).
- `lsp` escuta `tool_result` de **ambos** `edit` e `write`, exige `.nycode/lsp.json` (com trust hash) ou `~/.nycode/agent/lsp.json` sem nenhum catálogo padrão, e sempre bloqueia por um **`delay(1500)` fixo** (`extensions/lsp/index.ts:43,583-592`):

```ts
				const text = await readTextFile(file);
				const client = await this.getClient(match.server, match.root, file, workspace, ctx.signal);
				const languageId = languageIdForFile(match.server, file);
				await client.openOrChange(file, languageId, text, ctx.signal);
				await client.didSave(file);
				await delay(match.server.diagnosticsWaitMs ?? DEFAULT_DIAGNOSTICS_WAIT_MS, ctx.signal);
				const entry = this.diagnostics.get(match.server.id, match.root, file);
				// Errors only; empty when there is nothing to say.
				const text2 = formatPostEdit(match.server.id, file, entry?.diagnostics ?? [], match.root);
				if (text2) lines.push(text2);
```

- `post-edit.ts:17-23` acerta ao filtrar apenas `severity === 1` (`error`, teto 10 erros), mas **não deduplica** erros pré-existentes entre edições; além disso, expõe 5 tools separadas sempre ativas (`lsp_diagnostics`, `lsp_hover`, `lsp_definition`, `lsp_references`, `lsp_symbols` = **351 tokens** fixos no payload) com coordenadas **0-based** sem lookup por `symbol`.

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Espera pós-escrita | Corrida `500 ms` verificada por versão/quiescência + entrega tardia (`yieldQueue`) | `delay(1500)` fixo cego sem checar versão (`extensions/lsp/index.ts:588`) |
| Deduplicação entre edições | `DiagnosticsLedger` oculta erros idênticos já emitidos (`diagnostics-ledger.ts:12-44`) | Sem dedup; repete até 10 erros pré-existentes em toda edição do arquivo |
| Descoberta de servidores | 55 servidores embutidos (`defaults.json`) | Zero padrões embutidos; exige `lsp.json` manual + trust |
| Tool surface | 1 tool `discoverable` (14 ações, 1-based + `symbol`) | 5 tools top-level (**351 tok** fixos, 0-based linha/UTF-16 sem `symbol`) |

## Benefício

- **Problema**: no `nycode` atual, (1) toda edição com LSP configurado paga 1,5s de sono ocioso mesmo quando o diagnóstico chega em 40ms, e quando um servidor frio leva 3s o retorno vem vazio ou obsoleto; (2) editar 4 vezes um arquivo que já tinha 5 erros de lint/tipo injeta os mesmos 5 erros 4 vezes seguidas no contexto; (3) sem `lsp.json` o usuário não tem LSP algum.
- **Rastro**: substituir `delay(1500)` por espera orientada a evento `publishDiagnostics` (ou pull `textDocument/diagnostic` quando suportado) com teto curto (`500 ms`–`800 ms` configurável), adicionar `DiagnosticsLedger` na extensão `lsp` (mantendo o ótimo filtro `severity === 1` de `post-edit.ts`), e resolver `symbol` por nome em `textDocument/documentSymbol` na extensão já corrigem os três defeitos sem tocar o núcleo (`core`) nem exigir daemon `lspmux`.
- **Solução**: portar para `packages/coding-agent/src/extensions/lsp/`: (a) resolução reativa de `publishDiagnostics` por versão/timestamp com `timeout = 500 ms` (cortando 1s+ de espera por edição rápida), (b) `DiagnosticsLedger` para suprimir erros repetidos já notificados na sessão, (c) suporte a parâmetro opcional `symbol` nas tools LSP existentes + catálogo opt-in/detectado com **respeito estrito à confiança de projeto** (`_shared/config/trust.ts`).

## Custo

- **Tokens / turno**: reduzir as 5 tools ou mantê-las em `tool-search` economiza até 351 tokens; `DiagnosticsLedger` corta tokens duplicados em edições repetidas. (`lsp-late-diagnostic.md` custaria ~84 tok se entrega diferida fosse adicionada).
- **Latência**: cai de `1.500 ms` fixos para `~50–500 ms` quando o servidor responde rápido.
- **Manutenção**: ~200–300 LOC TS puro dentro de `extensions/lsp/` (`1.591` LOC hoje -> mantendo regra de `AGENTS.md`: `<= 7` arquivos e `<= 800` linhas/arquivo).

## Riscos

- **Cold start pesado em containers (`bench/`)**: habilitar auto-detecção de servidores pesados (`rust-analyzer`, `tsserver`, `pyright`, `jdtls`) por padrão sem config explícita pode consumir RAM/CPU em tarefas curtas ou containers sem rede/memória — manter auto-detecção atrás de setting opt-in ou lista leve (`lsp.autoDetect: false` por padrão até validar no `bench/`).
- **Injeção tardia (`steer` / `yieldQueue`)**: `extensions/lsp/index.ts:667-669` documenta problemas anteriores com `steer` após fim de turno; evitar canal tardio fora de turno até ser seguro, priorizando primeiro a espera orientada a evento + `DiagnosticsLedger`.
- **Segurança de projeto não confiável**: binários em `./node_modules/.bin` ou `.venv/bin` só devem rodar após aprovação de confiança do projeto (`_shared/config/trust.ts`).

## Licença

**MIT** (`omp:LICENSE:1-23`; `extensions/lsp/` do `nycode` usa `vscode-jsonrpc` e `vscode-languageserver-protocol` MIT em `packages/coding-agent/package.json:67-68`).

## Proposta

- **`packages/coding-agent/src/extensions/lsp/index.ts`**: trocar `delay(DEFAULT_DIAGNOSTICS_WAIT_MS)` por espera em `Promise.race` acionada assim que `publishDiagnostics` chegar após `openOrChange`/`didSave` (com debounce curto de quiescência de ~100ms e teto configurável), adicionar `DiagnosticsLedger` por URI e opção `symbol` nas tools `lsp_definition`/`lsp_references`/`lsp_hover`.
- **`packages/coding-agent/src/extensions/lsp/post-edit.ts`**: consultar o ledger antes de formatar para suprimir erros inalterados já reportados no turno/sessão (mantendo apenas erros novos ou modificados).
- **`packages/coding-agent/src/extensions/lsp/_shared/config/config.ts`**: manter suporte prioritário a `lsp.json` e avaliar presets seguros opt-in para servidores conhecidos no `PATH`.

## Testes

- Estender `packages/coding-agent/test/harness/lsp/` (`extension.test.ts`, `post-edit.test.ts`):
  1. Servidor fake responde em 30 ms -> retorno completa em <150 ms (não espera 1.500 ms).
  2. Erro repetido na linha 10 em 2ª edição não relacionada -> suprimido pelo `DiagnosticsLedger`; erro corrigido -> limpo do ledger (se reaparecer depois, volta a reportar).
  3. Cold start lento respeita teto sem crashar.

## Plano de eval

- **Base e candidato**: `nycode` vs `nycode + lsp reativo/ledger (e versão c/ auto-detect opt-in)` via `bench/run.py` + `bench/gate.py` em `suite.s3` (`swebenchpro`, `tasks/swebenchpro.json` — projetos reais Python/TS/Go onde erros de import/tipo aparecem) e casos de código de `suite.s1` (`pr_cases`).
- **Critério (`bench/stats.py`)**: ganho em acerto (`AHEAD_P = 0.80` se ativar servidores automáticos) ou não-inferioridade (`MARGIN = -0.10`), monitorando RAM/tempo/custo (`PARITY_COST_MAX = 1.10`). Não reexecutar `cc-vanilla`/`pi-vanilla`.

## Critérios de aceite

1. Latência média pós-edição com LSP ativo cai de `>=1.5s` para `<=0.5s` com servidor responsivo.
2. Mesmos erros pré-existentes não são reinjetados repetidamente no contexto durante múltiplas edições no arquivo.
3. Testes `test/harness/lsp/*.test.ts` passam 100%.

## Rollback

Reverter para `delay(DEFAULT_DIAGNOSTICS_WAIT_MS)` e desativar filtragem por ledger em `extensions/lsp/`.
