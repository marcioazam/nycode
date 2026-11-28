# 10 — `snapcompact` vs Compaction, `SessionHandoff` cache-friendly e `shake`

- **Classe**: **B** (altera mecanismo de compactação/contexto e `snapcompact` exige porte Rust nativo N-API + fontes pixeladas — **nunca A**. Recomenda-se **adotar `SessionHandoff` + `shake` em TS puro** e **rejeitar `snapcompact` em PNG** após avaliação).
- **Prioridade**: **P0** (compactação fria do `nycode` hoje usa `cacheRetention: "none"` re-processando o histórico inteiro sem cache; `handoff` cache-friendly e `shake` mecânico reduzem custo e perda de contexto).

## O que o `omp` faz

O `omp` encadeia 5 métodos configurados em `compaction.methodOrder = ["remote", "snapcompact", "handoff", "shake", "soft"]` (`omp:packages/coding-agent/src/session/compaction-methods.ts:45-51`):
1. **`remote`**: streaming V2/V1 OpenAI/Codex/Bedrock e Anthropic `compact-2026-09-04` (`omp:packages/agent/src/compaction/compaction.ts:1985-2150`).
2. **`snapcompact`**: serializa mensagens antigas e as rasteriza em frames PNG monocromáticos (`11on16-bw` para Claude, `8on22-bw` para Gemini/OpenAI, `silver16-bw` para CJK em `omp:packages/snapcompact/src/snapcompact.ts:394-409`) via Rust N-API (`omp:crates/natives/src/snapcompact.rs:1-120`), sem chamada de LLM:

```ts
const HIGH_RES_ANTHROPIC_VARIANT = { variant: "11on16-bw", frameSize: 1932 } as const satisfies IdealShape;
const MODEL_VARIANTS: readonly (readonly [RegExp, IdealShape])[] = [
   [/claude.*(fable|mythos)/i, HIGH_RES_ANTHROPIC_VARIANT],
   [/claude/i, { variant: "11on16-bw" }],
   [/gemini/i, { variant: "8on22-bw", frameSize: 2048 }],
   [/gpt|codex/i, { variant: "8on22-bw" }],
   [/kimi/i, { variant: "8on22-bw" }],
   [/glm/i, { variant: "8on16-bw" }],
];
```

1. **`SessionHandoff`** (`omp:packages/coding-agent/src/session/session-handoff.ts:82-208` + `omp:packages/agent/src/compaction/compaction.ts:1218-1262`): gera o resumo/handoff via requisição oneshot usando o **mesmo system prompt, tools e `promptCacheKey` do turno vivo** (hit no prefix cache quente!), produzindo documento estruturado (`## Goal` obrigatório, `handoff-document.md`, 328 tokens).
2. **`shake`** (`omp:packages/agent/src/compaction/shake.ts:48-76,151-480`): elisão mecânica síncrona **sem LLM** de `toolResult` e blocos XML/código `>= 400` tokens para `local://N.log`, preservando o texto recente.

- **Ancestralidade Pi**: `pi0.9.4` não tinha compactação (`pi0.9.4:packages/coding-agent/src/session-manager.ts:1-451`); `pibase` tinha apenas compactação textual síncrona (`1673` LOC).

## Como o `nycode` faz

Em `packages/coding-agent/src/core/compaction/compaction.ts:618-638` (`1.759` LOC totais somando `compaction.ts`, `threshold.ts` e `session-limit.ts`), o `nycode` mantém o desenho do `pibase`:
- Serializa as mensagens descartadas em um único prompt novo de texto (`buildSummarizationContext` em `packages/coding-agent/src/core/compaction/compaction.ts:682-693`, com `SUMMARIZATION_SYSTEM_PROMPT`) e chama `completeSummarization` com **`cacheRetention: "none"`** — ou seja, paga entrada **fria sem cache** para todo o histórico resumido (`packages/coding-agent/src/core/compaction/compaction.ts:952-1057`) e depois **perde o prefix cache** da sessão inteira a partir do novo resumo.
- Não possui `shake` mecânico (spills recuperáveis sem LLM), `SessionHandoff` aproveitando o cache vivo, nem compactação por bitmap.

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Cadeia automática | `remote -> snapcompact -> handoff -> shake -> soft` | Apenas sumarização textual local (`soft` equivalente) |
| Cache na sumarização | `SessionHandoff` reutiliza `systemPrompt` + `tools` + `promptCacheKey` vivos (`session-handoff.ts:82-208`) | Serializa texto sob `SUMMARIZATION_SYSTEM_PROMPT` com `cacheRetention: "none"` (`compaction.ts:628-632`) |
| Compactação sem LLM | `shake` (spills `local://` >=400 tok) + `snapcompact` (PNG) | Sem equivalente |
| Deps / código | `~35.2k` LOC `snapcompact` + `8k` `compaction` + Rust `fontdue`/`png`/`image` + `Silver.ttf` (CC BY 4.0) | `1.759` LOC TS puro, zero deps nativas |

## Benefício

- **Avaliação crítica do `snapcompact`**: apesar de eliminar a chamada de sumarização (e o autor citar até ~40k chars/frame em 3.279 tokens visuais), o próprio `omp` documenta riscos severos: (a) F1 cai para `0.351` em shapes densas (`omp:packages/snapcompact/src/snapcompact.ts:18-35`), (b) confunde `0`/`O` e colapsa espaços/indentação (obrigando `omp` a bloquear `read` no modo inline em `omp:docs/compaction.md:555`), (c) o autor alerta para ~5× tokens de raciocínio/saída por leitura visual e vulnerabilidade total a downscaling ou reprecificação de imagem em proxies/provedores, e (d) `Silver.ttf` impõe licença **CC BY 4.0**.
- **Onde está o ganho real para o `nycode` (`SessionHandoff` + `shake`)**:
  - **Problema**: toda compactação atual no `nycode` paga leitura fria completa (`cacheRetention: "none"`) e perde 100% da continuidade se o resumo genérico omitir objetivos/comandos recentes; além disso, sessões com 1–2 tool results enormes (ex.: arquivo ou log de 25k tokens) poderiam ser reduzidas **sem gastar 1 centavo de LLM** apenas trocando blocos antigos > `1.000` tokens por caminho salvo em `/tmp`.
  - **Solução**: (1) testar **primeiro** `shake` em TS puro (despejar outputs antigos de `bash`/anexos grandes em disco antes de acionar LLM compaction), e (2) implementar um modo `handoff` cache-friendly que pede o resumo **dentro do prefixo vivo em cache** (reaproveitando `cacheRead` 0,1× antes do TTL expirar) em vez de serializar um prompt frio com `cacheRetention: "none"`. Rejeitar `snapcompact` PNG para o produto.

## Custo

- **`SessionHandoff` + `shake` em TS puro**: ~250–350 LOC TS puro, zero deps nativas, zero mudanças em prompts normais antes do threshold.
- **`snapcompact` (se portado)**: ~35.2k LOC + `crates/natives/src/snapcompact.rs` (1.641 LOC) + fontes + CC BY 4.0.

## Riscos

- **`handoff` com `prompt_cache_key` OpenAI / thinking blocks Anthropic**: se a side-request de handoff compartilhar `promptCacheKey` ou precisar de `toolChoice: "none"`, garantir compatibilidade com blocos `thinking` assinados e provedores que não aceitam `tool_choice: none` com `tools[]` declarados.
- **`shake` vs prefix cache**: assim como no `read-supersede` ([achados/08](08-read-supersede-poda-leituras-repetidas.md)), elidir blocos no meio do histórico quebra cache vivo se disparado *antes* do threshold; deve rodar **no threshold** (como estágio prévio antes de pagar sumarização LLM, quando a compactação já ia quebrar o prefixo de qualquer jeito!).
- Docs: exige atualização em `docs/ADR.md` (cópia não rastreada no checkout principal) por alterar estratégia de compactação.

## Licença

Workspace `omp` é **MIT** (`omp:LICENSE:1-23`), **porém atenção**: se qualquer parte do `snapcompact` usasse as fontes embutidas, `omp:crates/natives/src/fonts/Silver.LICENSE:10-15` exige atribuição **CC BY 4.0** (Poppy Works). O recorte recomendado (`SessionHandoff` + `shake` em TS) tem zero relação com fontes e é escrito nativamente em TS MIT.

## Proposta

- **`packages/coding-agent/src/core/compaction/compaction.ts`**: adicionar fase pré-LLM `shakeLargeToolResults` no momento da compactação (salvando resultados antigos `>= 1500` tokens no `/tmp` antes do `keepRecentTokens` — se após essa poda o contexto cair abaixo do limite, **pula** a chamada de sumarização LLM e preserva todo o restante verbatim!).
- **`packages/coding-agent/src/core/compaction/compaction.ts`**: adicionar opção de sumarização/handoff aproveitando o contexto e prefixo quente (`systemPrompt + tools` vivos com `cacheRetention` herdado quando dentro do TTL de cache) em vez de `cacheRetention: "none"`.

## Testes

- `packages/coding-agent/test/compaction*.test.ts`: testar (1) `shakeLargeToolResults` evita chamada LLM quando há poucos tool results gigantes antigos e mantém integridade em arquivo salvo; (2) payload de sumarização em cache quente preserva prefixo idêntico ao turno vivo (`tools + system + mensagens`).

## Plano de eval

- **Base e candidato**: `nycode` (`origin/main`) vs `nycode + shake + warm-handoff` usando `bench/run.py` + `bench/gate.py` em `suite.s6` (`tasks/tb41.json`, tarefas longas onde compactação realmente dispara) e `suite.s3` (`tasks/swebenchpro.json`), mais caso sintético multi-turno longo em `packages/coding-agent/test/` medindo `cacheRead`/`cacheWrite`/custo total. Rodar `--dry-run` primeiro; não reexecutar `cc-vanilla` nem `pi-vanilla`.
- **Critério (`bench/stats.py`)**: redução de custo de compactação (`total_cost_usd`) e manutenção/melhora de acerto pós-compactação (`MARGIN = -0.10`, `AHEAD_P = 0.80` se mirar melhoria).

## Critérios de aceite

1. Tarefas longas que hoje disparam compactação LLM passam a economizar chamadas via `shake` ou pagar `cacheRead` (0,1×) no handoff em vez de entrada fria.
2. Zero dependência de Rust ou bitmap PNGs (`snapcompact` mantido fora).

## Rollback

Desabilitar o estágio `shake` e voltar `completeSummarization` em `core/compaction/compaction.ts:618-638` ao prompt frio anterior.
