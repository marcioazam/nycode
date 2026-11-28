# 26 — Re-parse em dois estágios de flags de extensão, limites anti-OOM em `@file` e `bug-report`

- **Classe**: **A** (zero tokens extras, não altera prompts nem tool schemas, corrige perda silenciosa de prompt inicial e risco de OOM na CLI).
- **Prioridade**: **P1** (bug real de perda de entrada do usuário na CLI + mitigação direta de OOM e diagnóstico quebrado em `/bug-report`).

## O que o `omp` faz

1. **Re-parse em dois estágios para flags de extensão (`omp:packages/coding-agent/src/cli/extension-flags.ts:36-44`)**: após carregar extensões e descobrir os tipos reais (`"boolean" | "string"`) em `runner.getFlags()`, `applyExtensionFlags` re-executa `parseArgs(rawArgs, runner.getFlags())`, permitindo que flags booleanas registradas por extensões não engulam argumentos posicionais subsequentes como valores de string.
2. **Limites de leitura e detecção de binários no `@file` CLI (`omp:packages/coding-agent/src/cli/file-processor.ts:24-25,78-85` e `omp:packages/utils/src/binary.ts:33-54`)**: define `MAX_CLI_TEXT_BYTES = 5 * 1024 * 1024` (5 MB) e `MAX_CLI_IMAGE_BYTES = 25 * 1024 * 1024` (25 MB) antes de ler o buffer em memória, devolvendo `<file name="...">(skipped: too large, ...)</file>` quando excedido, e usa `isProbablyBinary` (janela inicial de `8192` bytes checando `NUL` e `TextDecoder("utf-8", { fatal: true })`) para não despejar bytes binários corrompidos como texto.

## Como o `nycode` faz

- **`packages/coding-agent/src/cli/args.ts:256-269` + `packages/coding-agent/src/core/agent-session-services.ts:82-119`**: no parse inicial antes do carregamento de extensões, qualquer flag desconhecida sem `=` entra em modo ganancioso: se existir próximo argumento sem `-` ou `@`, `args.ts:262-265` consome esse argumento dentro de `unknownFlags` e avança o índice (`i++`). Quando `applyExtensionFlagValues` roda depois em `agent-session-services.ts:106-108` e vê `flag.type === "boolean"`, sobrescreve o valor com `true` e descarta silenciosamente o texto capturado — apagando o prompt posicional do usuário (ex.: `nycode --plan "corrigir testes"` perde `"corrigir testes"` de `result.messages`).
- **`packages/coding-agent/src/cli/file-processor.ts:53,77`**: chama `await readFile(absolutePath)` e `await readFile(absolutePath, "utf-8")` sem nenhum teto de bytes em `stats.size`, podendo causar pico de heap/OOM em dumps, logs ou binários grandes passados via `@arquivo`.
- **`packages/coding-agent/src/core/bug-report.ts:87-89`**: na coleta `nycodeEnvironmentVariables`, filtra `.filter((name) => name.startsWith("PI_"))`, ignorando completamente variáveis `NYCODE_*` próprias do harness.

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Flags booleanas de extensão | `applyExtensionFlags` re-parseia com tipos reais de `runner.getFlags()` (`omp:packages/coding-agent/src/cli/extension-flags.ts:36-44`) | `args.ts:262-265` consome próximo argumento como string; `agent-session-services.ts:106-108` joga fora o texto ao setar `true` |
| Limite em `@file` CLI | Teto de 5 MB (texto) / 25 MB (imagem) antes da leitura (`omp:packages/coding-agent/src/cli/file-processor.ts:24-25,78-85`) | `readFile()` incondicional em `packages/coding-agent/src/cli/file-processor.ts:53,77` sem limite de tamanho |
| Filtro de env em `/bug-report` | Consistente com o namespace de env vars configurado | `packages/coding-agent/src/core/bug-report.ts:87-89` filtra apenas `PI_*`, omitindo `NYCODE_*` |

## Benefício

- **Problema**: passar uma flag booleana de extensão seguida de mensagem posicional na CLI faz o prompt inicial desaparecer sem erro; anexar arquivo grande em `@file` trava ou estoura memória no boot; relatórios `/bug-report` omitem variáveis `NYCODE_*`.
- **Solução**: passar `rawArgs` (ou preservar `result.messages` via segundo parse guiado pelos descritores reais de `registeredFlags`), aplicar tetos de 5 MB / 25 MB + sniff binário de 8 KB antes de `readFile` em `file-processor.ts`, e incluir `NYCODE_` no filtro de `bug-report.ts`.

## Custo

- **Tokens / turno**: **0** (mudança restrita a parse local da CLI, I/O pré-sessão e diagnóstico local).
- **Latência**: negligible (<1 ms para re-parse de `argv` e `stat` já existente em `file-processor.ts:43`).
- **Manutenção**: ~70 LOC TS distribuídas em 3 pontos isolados.

## Riscos

- Re-parse precisa respeitar a fronteira `--` e não duplicar `messages` ou `fileArgs` caso `processFileArguments` rode depois do carregamento de extensões (verificar ordem entre criação de serviços e processamento de `@file`).
- Nunca vazar valores em `/bug-report`: manter apenas os *nomes* das variáveis `NYCODE_*` e `PI_*` (como já faz `bug-report.ts:86-89`).

## Licença

Padrão de referência **MIT** (`omp:LICENSE:1-23`).

## Proposta

- **`packages/coding-agent/src/cli/args.ts` + `packages/coding-agent/src/core/agent-session-services.ts`**: aceitar mapa opcional `knownExtensionFlags` em `parseArgs` e re-executar `parseArgs(rawArgs, registeredFlags)` antes de consumir `parsed.messages` e `parsed.fileArgs`.
- **`packages/coding-agent/src/cli/file-processor.ts`**: checar `stats.size` contra `MAX_CLI_TEXT_BYTES` (`5 MiB`) e `MAX_CLI_IMAGE_BYTES` (`25 MiB`) + sniff NUL/UTF-8 nos primeiros `8192` bytes antes de `readFile`.
- **`packages/coding-agent/src/core/bug-report.ts:87-89`**: filtrar `name.startsWith("NYCODE_") || name.startsWith("PI_")`.

## Testes

- Teste unitário em `packages/coding-agent/test/cli/args.test.ts`: garantir que `parseArgs(["--plan", "corrigir testes"], new Map([["plan", { type: "boolean" }]]))` mantenha `"corrigir testes"` em `messages` e `unknownFlags.get("plan") === true`.
- Teste unitário para `processFileArguments`: arquivo texto `> 5 MiB` e arquivo binário com bytes `NUL` devolvem bloco `<file ...>(skipped: ...)</file>` sem carregar payload integral.
- Teste unitário em `bug-report`: confirma presença de nomes `NYCODE_*` sem expor valores.

## Plano de eval

Não aplicável (Classe A: nenhum token novo, nenhuma alteração de system prompt ou loop de agente).

## Critérios de aceite

1. Flags booleanas de extensão antes de prompts posicionais preservam integralmente `messages`.
2. `@file` acima de `5 MiB` (texto) / `25 MiB` (imagem) ou binário não textual não lê conteúdo inteiro para a memória nem injeta mojibake.
3. Relatório de `/bug-report` lista chaves `NYCODE_*` além de `PI_*`.

## Rollback

Reverter os edits pontuais em `args.ts`, `agent-session-services.ts`, `file-processor.ts` e `bug-report.ts`.
