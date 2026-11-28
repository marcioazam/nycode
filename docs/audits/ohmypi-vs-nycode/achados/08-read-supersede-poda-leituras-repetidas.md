# 08 — `read-supersede` e poda não destrutiva de leituras repetidas

- **Classe**: **B** (altera o contexto enviado ao provedor durante sessões multi-turno e interage com prefix cache — exige eval pareado em `bench/` apesar de não adicionar nenhum token ao system prompt nem mudar schemas).
- **Prioridade**: **P0** (maior oportunidade de economia pura de tokens de entrada em sessões longas com ciclo read -> edit -> read).

## O que o `omp` faz

O `omp` combina `isCompleteReadResult` (`omp:packages/coding-agent/src/tools/read-supersede.ts:12-18`) com `pruneSupersededToolResults` (`omp:packages/agent/src/compaction/pruning.ts:368-535`), disparado pela manutenção de sessão (`omp:packages/coding-agent/src/session/session-maintenance.ts:887-892`):

```ts
export function isCompleteReadResult(message: ToolResultMessage): boolean {
   // Typed through the producer's details so a renamed field is a compile error.
   const details = message.details as ReadToolDetails | undefined;
   if (!details || details.summary || details.truncation?.truncated) return false;
   if (details.meta?.truncation || details.meta?.limits?.columnTruncated) return false;
   return details.totalLines !== undefined || message.content.some(block => block.type === "image");
}
```

Percorrendo do fim do histórico para o começo, toda leitura completa ou de faixa de linhas do mesmo arquivo `P` que seja coberta por uma leitura completa posterior é substituída por `SUPERSEDED_NOTICE`. Crucialmente, a poda só ocorre se: (1) o sufixo após o resultado podado couber em `suffixTokenLimit` (protegendo o prefixo quente do cache), ou (2) a sessão tiver permanecido ociosa `>= idleFlushMs` (quando o prefix cache TTL de 5 min já expirou).
- **Ancestralidade Pi**: ausente em `pi0.9.4` e `pibase`. Evolução própria do `omp`.

## Como o `nycode` faz

- `packages/coding-agent/src/core/session-manager.ts:176-181,547` já possui `ContextEditEntry` (`appendContextEdit`) e `buildSessionProjection` para omitir/substituir entradas do histórico enviado ao LLM sem mutar o JSONL original.
- Entretanto, `packages/coding-agent/src/core/compaction/compaction.ts:1-120` e `packages/coding-agent/src/core/agent-session.ts:859-877` nunca removem leituras antigas do mesmo arquivo: se o agente lê `foo.ts` (400 linhas) nos turnos 2, 6 e 11, todas as três cópias (~1.500–3.000 tokens cada) continuam trafegando até atingir `threshold.ts`.

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Detecção de leitura completa | `isCompleteReadResult` via `details.totalLines` (`omp:packages/coding-agent/src/tools/read-supersede.ts:12-18`) | `read.ts` devolve `truncation` em `details`, mas não registra total completo para supersede |
| Poda por arquivo relido | `pruneSupersededToolResults` troca versões anteriores por marcador curto (`omp:packages/agent/src/compaction/pruning.ts:368-535`) | Sem equivalente; todo `toolResult` de `read` fica integral até compactação |
| Proteção de prefix cache | `suffixTokenLimit` + `idleFlushMs` impedem cache miss prematuro | N/A (`ContextEditEntry` já permite projeção limpa no `session-manager.ts:547`) |

## Benefício

- **Problema**: em depuração e refatoração, agentes relêem os mesmos arquivos diversas vezes após edições. Manter 3–5 versões do mesmo arquivo de 300 linhas queima milhares de tokens por turno e faz o modelo confundir trechos de uma leitura antiga com o estado atual.
- **Rastro**: o `nycode` já possui `ContextEditEntry` em `packages/coding-agent/src/core/session-manager.ts:176-181`, faltando apenas a política de identificar `read` coberto por `read` mais recente (ou pós-`edit` confirmado + nova leitura) com respeito à janela de TTL de cache.
- **Solução**: gravar em `details` do `read.ts` se a leitura cobriu `[1..totalLines]` sem truncagem e aplicar uma passagem leve de supersede sobre a projeção (somente quando o prefix cache não estiver aquecido — ex.: em compactação soft/pré-turno após expirar `5m`, ou com `cacheRetention` respeitando `prefix-cache-1h` que usa 5m nas mensagens!).

## Custo

- **Tokens / turno**: **0** fixo; economia estimada de 15–35% de tokens de entrada em sessões longas com múltiplas releituras (estimativa estática; não executado em runtime).
- **Latência**: **< 1 ms** (varredura reversa simples sobre array de mensagens).
- **Manutenção**: ~120 LOC TS puro sobre `SessionProjection`, zero dependências externas.

## Riscos

- **Quebra de prefix cache**: podar um `toolResult` no meio do histórico invalida todos os tokens posteriores no prefixo da API Anthropic/OpenAI. Como o `nycode` usa `prefix-cache-1h` (`extensions/prefix-cache-1h/index.ts:26-40`, `5m` nas mensagens e `1h` em `tools+system`), podar *antes* de expirar o TTL de 5 min ou dentro do horizonte ativo troca `cacheRead` (0,1×) por `cacheWrite` (1,25×) do sufixo. Só deve podar quando: (a) a economia do resultado antigo superar o custo de re-escrita do sufixo, (b) após expirar `idleFlushMs`, ou (c) no momento em que outro evento já quebraria a janela de cache.
- **Leituras parciais**: nunca podar uma leitura `[100..200]` quando a nova leitura cobriu apenas `[1..50]` (`isCompleteReadResult` precisa validar intervalo coberto!).
- Docs: alinhado a `docs/PRD.md:19-27` (custo×benefício) e exige registro em `docs/ADR.md` (checkout principal) se alterar projeção padrão.

## Licença

**MIT** (`omp:LICENSE:1-23`). Padrão algorítmico em TS próprio.

## Proposta

- **`packages/coding-agent/src/core/tools/read.ts`**: incluir `range?: { startLine: number; endLine: number; totalLines: number; truncated: boolean }` no `details` do retorno (invisível ao LLM, consumido apenas pela projeção).
- **`packages/coding-agent/src/core/compaction/`** (novo helper `read-supersede.ts`, <=120 LOC) + **`packages/coding-agent/src/core/agent-session.ts`**: varrer mensagens projetadas da mais recente para a mais antiga e emitir `appendContextEdit` / substituição em projeção quando o ganho líquido compensar o sufixo (ou quando o TTL de cache de mensagens já tiver expirado).

## Testes

- Teste unitário cobrindo:
  1. Duas leituras completas do mesmo arquivo -> primeira substituída por marcador curto.
  2. Leitura parcial `[1..50]` depois de completa `[1..200]` -> **não** substitui a completa.
  3. Leitura completa após parcial -> substitui a parcial.
  4. Trava de cache: dentro do intervalo `idleFlushMs` / quando `suffixTokens * 1.25 > economizedTokens * 0.9`, adia a poda.

## Plano de eval

- **Base e candidato**: comparar `nycode` (`origin/main`) vs `nycode + read-supersede` usando `bench/run.py` + `bench/gate.py` nas suítes `bench/suites.toml` `s2` (`terminal-bench@2.0`, `tasks/tb2.json`, held-out 30%) e `s3` (`swebenchpro`, `tasks/swebenchpro.json`), onde sessões multi-turno com releitura ocorrem frequentemente. Rodar `--dry-run` primeiro; **não** reexecutar referências guardadas `cc-vanilla`/`pi-vanilla` (`docs/bench/RUNBOOK.md`).
- **Critério do gate (`bench/stats.py`)**: não-inferioridade (`MARGIN = -0.10`), queda líquida de `total_cost_usd` após `cacheWrite` (`<= 1.00×`), `PARITY_COST_MAX = 1.10`.

## Critérios de aceite

1. Economia líquida de `total_cost_usd` em sessões com >10 turnos mantendo taxa de resolução dentro de `MARGIN`.
2. Zero regressão nos testes de cache em `packages/ai/test/` e `packages/coding-agent/test/`.

## Rollback

Desabilitar a chamada de poda na projeção de turno / `ContextEditEntry` ou esconder atrás de setting `compaction.pruneSupersededReads: false`.
