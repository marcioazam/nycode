# 15 — Subagentes: resultado tipado (`outputSchema`) e isolamento por chamada (`isolated`)

- **Classe**: **B** (altera schema da tool `subagent`, fluxo de validação com retries no filho e flags de worktree — exige eval em `bench/`. *O pool em worker threads `src/thread/` e `crates/iso`/`ovnfs` ficam rejeitados em [rejeitados.md](../rejeitados.md#r02---pool-de-threads-srcthread--isolamento-cratesiso--ovnfs)*).
- **Prioridade**: **P1** (agrega duas capacidades reais em orquestração multi-agente mantendo 100% os subprocessos `nycode` e `git worktree` em TS puro).

## O que o `omp` faz

1. **Resultado tipado (`outputSchema` + `yield`)**: `resolveEffectiveSubagentPolicy` (`omp:packages/coding-agent/src/task/structured-subagent.ts:495-600`) resolve o schema de saída por precedência (`caller -> agent.output -> session.outputSchema`), `buildOutputValidator` (`omp:packages/coding-agent/src/tools/output-schema-validator.ts:81-149`) compila validadores JSON Schema/JTD e injeta `YieldTool` (`omp:packages/coding-agent/src/tools/yield.ts:314-520`) apenas quando há `outputSchema`, com até `MAX_SCHEMA_RETRIES = 3` dentro do filho e validação final no pai:

```ts
export function buildOutputValidator(schema: unknown): BuildOutputValidatorResult {
...
	let cached = schemaResults.get(key);
	if (!cached) {
		cached = buildOutputValidatorUncached(typeof schema === "string" ? schema : JSON.parse(key.slice(1)));
		schemaResults.set(key, cached);
	}
	return cached;
}
```

2. **Isolamento por chamada + detach `.git`**: `TaskTool` aceita `isolated?: boolean` por tarefa e `ensureIsolation` (`omp:packages/coding-agent/src/task/worktree.ts:662-712`) isola em worktree separado com `mergeMode: "patch" | "branch"`:

```ts
			await detachSubmodules(repoRoot, mergedDir);
			await vcs.detachGitDir(mergedDir, sourceCommonDir);
```

- **Ancestralidade Pi**: `pi0.9.4` não tinha subagentes; `pibase:packages/coding-agent/examples/extensions/subagent/index.ts` spawnava `pi --mode json` sem `outputSchema` nem `worktree`.

## Como o `nycode` faz

Em `packages/coding-agent/src/extensions/subagent/` (`10.653` LOC TS puro):
- **`core/run.ts:65-79` e `core/worktree.ts:48-87`**: spawna subprocessos `nycode` reais (melhor isolamento de processo/FD que Bun Worker threads) e **já suporta `isolation: worktree`** via frontmatter do agente (`registry/agents.ts:276-284,309-316`), criando branch temporária `git worktree add -b agent/<name>-<uuid> <tmpdir> <defaultBranch>`, rodando com `cwd: worktree.dir` (`core/modes.ts:285`) e mantendo/reportando diretório e branch ao terminar (`modes.ts:331-337`).
- **Lacunas concretas**:
  1. `SubagentParams` (`core/params.ts:32-74`) não expõe `isolated?: boolean` por chamada (apenas por definição estática do agente) e não permite gerar patch/diff automático opcional de volta.
  2. `core/types.ts:20-34` e `core/params.ts:32-74` não possuem `outputSchema` para validar e devolver JSON estruturado quando o chamador (ou `codemode`) precisa consumir saída tipada.

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Execução | Bun Worker threads (`threshold=9`, `src/thread/` 12.6k LOC) | Subprocesso `nycode` real via `spawn` (`core/run.ts:65-79`) |
| Resultado tipado | `outputSchema` + `YieldTool` + validação estrita (`structured-subagent.ts`, `output-schema-validator.ts`) | Sem equivalente (`core/params.ts:32-74`, `core/types.ts:20-34`) |
| Isolamento por worktree | `isolated` por chamada + CoW Rust (`crates/iso`) + merge-back `patch`/`branch` | `isolation: worktree` por frontmatter (`agents.ts:312-316`), `git worktree add` simples, sem flag por chamada nem auto-patch |

## Benefício

- **Problema**: (1) quando o agente pai (ou um script `codemode` chamando `tools.subagent`) delega varreduras paralelas e espera uma estrutura uniforme (ex.: `{ files, findings, risk }`), hoje precisa parsear prosa livre; (2) quando o agente `general-purpose` (que normalmente não tem `isolation: worktree` fixo no frontmatter) precisa testar 2 abordagens em paralelo no mesmo repo, não consegue ativar worktree por chamada.
- **Solução enxuta em TS puro (rejeitando `src/thread/` e `crates/iso`)**:
  1. Expor `isolated?: boolean` opcional em `SubagentParams`/`TaskItem` (`core/params.ts`), reutilizando diretamente `core/worktree.ts:51-87` (que já existe no `nycode`!) + opcionalmente incluir o `git diff` / patch path no `details` ao finalizar caso haja alterações.
  2. Suportar `outputSchema?: Record<string, unknown>` opcional em `SubagentParams`: quando presente, injetar instrução + validação via `@nycode/schema` (`packages/schema/src/index.ts`, 8.5 KB, já seguro para CSP/SES, **sem** Ajv nem `omptype` JIT!) com no máximo 1–2 retries no filho caso o JSON final não valide contra o schema.

## Custo

- **Tokens / turno**: **0** quando `outputSchema` e `isolated` não são passados; `subagent` tool já custa **1.200 tok** no payload do `nycode` (e adicionar 2 propriedades opcionais curtas custa ~25–35 tokens no schema). Em chamadas com `outputSchema`, o filho recebe as instruções do schema e gasta retry só se errar o JSON.
- **Latência**: neutra no caso padrão; `git worktree add` leva ~100–300 ms em repos médios quando `isolated: true`.
- **Manutenção**: ~150 LOC TS puro reutilizando `core/worktree.ts` + `@nycode/schema`.

## Riscos

- **`git worktree add` sem `node_modules` / dirty state**: `core/worktree.ts:51-87` parte da branch padrão e não copia alterações locais não comitadas nem pastas ignoradas (`node_modules`, `.venv`). Documentar na descrição de `isolated` que ele cria worktree limpo a partir do `HEAD` / branch padrão (ou avaliar symlink read-only opcional de `node_modules` apenas sob flag explícita).
- **Loops de retry de `outputSchema`**: limitar retries de validação a no máximo 2 e manter modo permissivo (retornar texto bruto + erro de validação nos detalhes se estourar) para não descartar investigação cara feita pelo subagente.
- **`bench/capabilities.toml:38-42`**: atualização positiva na matriz de capacidades de `subagents`.

## Licença

**MIT** (`omp:LICENSE:1-23`). Usa `@nycode/schema` próprio do `nycode`.

## Proposta

- **`packages/coding-agent/src/extensions/subagent/core/params.ts`**: adicionar `isolated?: boolean` e `outputSchema?: Record<string, unknown>` (em `single` e `tasks[]`).
- **`packages/coding-agent/src/extensions/subagent/core/modes.ts` & `worktree.ts`**: aceitar `item.isolated ?? (agent.isolation === "worktree")` sem remover o trust gate existente (`checkProjectAgentGate`).
- **`packages/coding-agent/src/extensions/subagent/core/run.ts`**: quando `outputSchema` estiver definido, passar critério de saída JSON ao filho e validar resultado usando `@nycode/schema` (`packages/schema/src/index.ts`).

## Testes

- Estender `packages/coding-agent/test/subagent-extension.test.ts` e `packages/coding-agent/test/harness/subagent/`:
  1. `isolated: true` em agente sem frontmatter `isolation: worktree` cria e limpa worktree temporário e retorna branch/diff.
  2. `outputSchema` aceito em 1ª tentativa retorna JSON parseado; JSON inválido dispara 1 retry de correção e, se falhar novamente, reporta erro estruturado mantendo o texto preservado.
  3. Zero regressão no gate `8261-subagent-project-trust.test.ts`.

## Plano de eval

- **Base e candidato**: `nycode` vs `nycode + subagent(isolated + outputSchema)` usando `bench/run.py` + `bench/gate.py` em `suite.s3` (`swebenchpro`, `tasks/swebenchpro.json`) e `suite.s1` (`pr_cases`), além de verificar que os ~30 tokens extras no schema da tool `subagent` não prejudicam `total_cost_usd` (`PARITY_COST_MAX = 1.10`) em tarefas onde `subagent` não é chamado. Não reexecutar `cc-vanilla`/`pi-vanilla`.

## Critérios de aceite

1. `isolated: true` permite subagentes paralelos editarem sem conflito usando `core/worktree.ts` já existente.
2. `outputSchema` valida saídas com `@nycode/schema` sem adicionar `omptype`/`ajv` nem `src/thread/`.
3. Gate `bench/` dentro dos limiares (`MARGIN = -0.10`, `PARITY_COST_MAX = 1.10`).

## Rollback

Remover os dois campos opcionais de `core/params.ts` e sua leitura em `modes.ts`/`run.ts`.
