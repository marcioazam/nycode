# 23 — DAP (`DebugTool`) e leitores estruturados (`read-sqlite`, `read-json`, `read-archive`)

- **Classe**: **B** (adiciona novas ferramentas/schemas ou altera `read` e exige adaptação `bun:sqlite`/`jaq` Rust -> `node:sqlite`/TS puro — exige avaliação de custo×benefício e eval).
- **Prioridade**: **P3** (capacidades úteis para nichos específicos — depuração de processos travados/C++ e leitura paginada de DBs/JSON/ZIPs grandes — mas frequentemente supridas por `bash` em ambientes Linux padrão).

## O que o `omp` faz

1. **DAP (`DebugTool`, `5.270` LOC)** (`omp:packages/coding-agent/src/tools/debug.ts:544-991`, `omp:packages/coding-agent/src/dap/defaults.json:1-212`): cliente/gerenciador DAP para 14 adaptadores (`gdb`, `lldb-dap`, `codelldb`, `debugpy`, `dlv`, `js-debug-adapter`, etc.), 28 ações com separação entre leitura (`DEBUG_READONLY_ACTIONS`) e execução (`exec`), `loadMode = "discoverable"` (**56 tok** em `debug.md`, ou schema gigante de 39 campos se exposto):

```ts
export class DebugTool implements AgentTool<typeof debugSchema, DebugExecutionDetails> {
   readonly name = "debug";
   readonly approval = (args: unknown): ToolApprovalDecision => {
      const rawAction = (args as Partial<DebugParams>).action;
      const action = typeof rawAction === "string" ? rawAction.toLowerCase() : "";
      return DEBUG_READONLY_ACTIONS.has(action) ? "read" : "exec";
   };
```

1. **Leitores estruturados acoplados ao `read`** (`omp:packages/coding-agent/src/tools/read-{sqlite,json,archive,pdf}.ts`):
   - `read-sqlite.ts` (`237` LOC): inspeciona tabelas/linhas (`db.sqlite:table?where=`) usando `bun:sqlite`.
   - `read-json.ts` (`497` LOC): consultas paginadas `file.json?q=.items[0]` usando `jaq` embutido em Rust.
   - `read-archive.ts` (`441` LOC + `packages/utils/src/ar/` `11.487` LOC TS puro): lista/lê arquivos dentro de `.zip`, `.tar.gz`, `.whl`, `.docx`, `.7z`, etc.
   - `read-pdf.ts` (`162` LOC + Rust `pdf-inspector` + Chromium): texto + screenshots de PDF.

- **Ancestralidade Pi**: ausente em `pi0.9.4` e `pibase`. Criação original do `omp`.

## Como o `nycode` faz

- **DAP**: sem equivalente em `core/tools/index.ts:95-105` ou `extensions/index.ts:62-131` (o agente usa `python -m pdb`, `gdb -batch` ou testes via `bash`).
- **Leitores**: `packages/coding-agent/src/core/tools/read.ts:239,272-345` lê apenas texto (streaming de faixas de linhas) e imagens locais; SQLite, JSON query e arquivos compactados passam por `sqlite3`, `jq`, `unzip`/`tar` no `bash`.

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Depuração interativa DAP | `DebugTool` + 14 adaptadores (`dap/defaults.json`), usa `Bun.listen`/`ptree` | Sem equivalente (usa `bash`) |
| Leitura de `.sqlite` | `read-sqlite.ts` via `bun:sqlite` | Sem equivalente (`sqlite3` via `bash`) |
| Consulta JSON estruturada | `read-json.ts` via Rust `jaq-*` (`Cargo.toml:49-51`) | Sem equivalente (`jq` via `bash`) |
| Leitura de arquivos `.zip`/`.tar` | `read-archive.ts` + `utils/src/ar/` (11.4k LOC para 13 formatos) | Sem equivalente (`unzip`/`tar` via `bash`) |

## Benefício

- **Problema**: em containers minimalistas sem `jq`, `sqlite3` ou `unzip` instalados, ou em JSONs minificados de 10 MB de linha única, `read.ts` do `nycode` falha ou trunca na primeira linha; e bugs de deadlock/C++ raramente são cômodos via `gdb -batch`.
- **Recortes realistas para o `nycode` (P3, em extensão/opt-in)**:
  1. `read-sqlite` portado para **`node:sqlite`** nativo do Node `>=22.19` (`packages/coding-agent/package.json:100`) e `read-json` simples em JS puro (JSONPath/dot-path paginado sem Rust `jaq`!): ~200 LOC totais, zero deps externas!
  2. `read-archive` restrito a `zip`/`tar.gz` via `node:zlib` (rejeitando parsers gigantes de ARJ/LZH/CAB/RPM e rejeitando `pdf-inspector`/Chromium).
  3. DAP mantido apenas como extensão opcional futura (`tool-search` para ocultar os 39 campos do schema!), convertendo `Bun.listen`/`ptree` para `node:net`/`node:child_process`.

## Custo

- **Tokens / turno**: **0** se embutidos no dispatch de `read` (para `.sqlite`/`.zip`/`.json?q=`) ou ocultos via `tool-search`. Se `DebugTool` entrar como tool normal sem `tool-search`, o schema de 39 campos + 28 ações adiciona centenas de tokens em **todo** turno (inaceitável pela ADR-0003).
- **Manutenção**: DAP completo custa ~5,2k LOC + manutenção de 14 adaptadores; já leitores enxutos (`node:sqlite` + JSON dot-path + zip/tar) custam ~300–400 LOC TS.

## Riscos

- **Runtime `bun:sqlite` / `Bun.listen`**: código do `omp` que importa `bun:sqlite` quebra diretamente a suíte Vitest/Node `>=22.19` do `nycode` (`packages/coding-agent/package.json:100`) — obrigatório usar `node:sqlite` / `node:net`.
- **Explosão de turnos em `DebugTool`**: LLMs frequentemente entram em loops longos de stepping (`step_over` × 15 turnos) em vez de escrever um teste unitário reproduzindo o bug.
- **Execução arbitrária no DAP**: `launch`, `attach`, `evaluate`, `write_memory` e `.nycode/dap.json` exigem passar pelo gate de `core/permissions/` + trust por hash (análogo a `_shared/config/trust.ts` do `lsp`).

## Licença

**MIT** (`omp:LICENSE:1-23`).

## Proposta

- **Curto/médio prazo (recorte de leitores leves, P3)**: extensão opcional ou hook em `read.ts` suportando `.sqlite`/`.db` (read-only via `node:sqlite`) e consulta JSON paginada em JS puro quando arquivo exceder teto de `read`.
- **Longo prazo / opcional (DAP)**: extensão `extensions/dap/` isolada registrando via `tool-search` (`loadMode` equivalente), <= 7 arquivos e <= 800 linhas/arquivo (`AGENTS.md`), usando `node:net` e `core/permissions/`.

## Testes

- Unitários offline com banco SQLite criado em `mkdtemp` via `node:sqlite`, JSON grande de linha única e fake DAP socket local em `node:net` (sem spawnar debuggers reais no CI).

## Plano de eval

- **Base e candidato**: para leitores estruturados, medir em casos dedicados de `packages/evals/` (arquivos `.db`/JSON minificado de 5 MB em ambiente sem `jq`/`sqlite3`) + gate `suite.s1`/`suite.s2` em `bench/run.py` confirmando que o custo nominal em tarefas comuns fica `<= 1.00–1.05×` (`PARITY_COST_MAX = 1.10`) e acerto `>= MARGIN = -0.10`. Não reexecutar `cc-vanilla`/`pi-vanilla`.

## Critérios de aceite

1. Zero uso de `bun:sqlite`, `Bun.listen` ou crates Rust `jaq`/`pdf-inspector`.
2. Zero tokens fixos no `systemPrompt` fora de `tool-search` ou do dispatch transparente de arquivo.

## Rollback

Remover extensão `extensions/dap/` ou manipuladores de extensão de arquivo no `read`.
