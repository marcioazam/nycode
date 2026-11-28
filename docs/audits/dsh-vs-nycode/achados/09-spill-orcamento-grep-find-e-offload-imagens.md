# Achado 09: Spill de saída em arquivo para `grep`/`find`, orçamento unificado em tokens e offload reativo de imagens

## O que o `dsh` faz

O `dsh` trata estouros de saída e de imagens em três camadas explícitas:

1. **Spill automático em `glob` e `grep`**: `packages/fs/tool-fs-search/src/glob.ts:373-385` e `grep.ts:347-370` aplicam limites (`GLOB_MAX_RESULTS = 100`, `GREP_MAX_MATCHES = 250`, `GREP_MAX_LINE_BYTES = 2.000`, `RAW_OUTPUT_MAX_BYTES = 20_000_000`), mas quando estouram o cap **salvam a lista completa formatada no `spillStore`** (`glob-results.txt` / `grep-results.txt`) e devolvem o caminho no aviso ao modelo para ele inspecionar com `read(offset, limit)` ou refinar o `grep`.
2. **Orçamento pós-execução em tokens (`spill-policy`)**: `packages/spill/spill-policy/src/index.ts:134-156` (`maxInlineTokens: 12500` configurado em `packages/bundle/base/cordis.patch.yml:438`) mede texto (`chars/4`) **e custo em tokens de imagem** antes de aceitar o resultado de qualquer tool (exceto `read` e chamadas internas estruturadas), truncando inline para caber em `12.500` tokens e gravando o conteúdo integral em disco com aviso padrão `formatSpillNotice` (`notice.ts:7,21-24`).
3. **Recuperação reativa de imagens (`compaction-image-offload`)**: `packages/compaction/compaction-image-offload/src/index.ts:26-40` intercepta erro `IMAGE_OFFLOAD_REQUIRED` tanto em `agent/request-error` quanto em `compaction/summary-error`, substitui as imagens mais antigas por placeholders com caminho/attachment no estado derivado (`image/offload`) sem alterar eventos passados e faz retry automático sem consumir cota de erro de rede.

## Como o `nycode` faz hoje

1. **`grep` e `find` não fazem spill para arquivo**: em `packages/coding-agent/src/core/tools/grep.ts:292-323` e `packages/coding-agent/src/core/tools/find.ts:290-364`, quando uma busca atinge `DEFAULT_LIMIT = 100` (`grep`), `1000` (`find`) ou `DEFAULT_MAX_BYTES = 50 KiB`, a saída é simplesmente truncada (`truncateHead`) e os resultados excedentes são **descartados**, instruindo o modelo a aumentar `limit` ou refinar o padrão — o que frequentemente força várias rodadas extras de chamada `grep`/`find`. Enquanto isso, `bash` (`output-accumulator.ts`), `codemode` (`extensions/codemode/execute.ts:395`) e `mcp` (`extensions/mcp/tools.ts`) já gravam output files em `utils/output-files.ts`.
2. **Sem orçamento combinado texto+imagem nem offload reativo de visão**: `core/sdk.ts:311-345` só suporta `settingsManager.getBlockImages()` (booleano global tudo-ou-nada). Se uma sessão acumular dezenas de screenshots em turns antigos e estourar o limite multimodal do provedor, o erro não aciona offload automático das imagens mais antigas mantendo as recentes intactas.

## Diferença concreta

- `dsh`: salva resultado completo de `glob`/`grep` que excede o cap no mesmo mecanismo de spill, mede saída agregada (texto + imagem) contra `12.500` tokens e recupera automaticamente sessões que excedem limite de imagens por turno/payload.
- `nycode`: `grep` e `find` descartam o excedente sem arquivo de spill; truncamentos operam em linhas/bytes (`2.000 L` / `50 KiB`) sem preço de imagem unificado nem recuperação reativa quando imagens antigas estouram o limite.

## Classificação

**Classe B** — Altera o conteúdo de retorno visível ao modelo em `grep` e `find` (passando a incluir path de spill quando truncado e alterando comportamento de follow-up do modelo) e altera política de imagens/erros em contexto longo. Exige eval antes de ativar por padrão.

## Benefício esperado

- Elimina loops de re-execução de `grep`/`find` com `limit * 2` quando `50 KiB` já foram atingidos e o modelo apenas precisa ler o trecho relevante da lista completa com `read` (`offset`, `limit`) ou buscar dentro dela com `grep`.
- Evita estouro irrecuperável de sessões longas com muitas imagens (`read` de PNG/JPEG em loops visuais) fazendo degradar graciosamente as ocorrências antigas para referência textual do caminho original.

## Custo

- **Tokens/turno**: `0` tokens fixos no Turno 1 (`o200k_base`); `+18–25` tokens apenas nos resultados truncados de `grep`/`find` (texto indicando `Full output saved to: <path>`), facilmente compensados ao evitar re-chamadas inteiras de `grep` (`279` tokens schema + turno completo de LLM).
- **Latência**: `< 2 ms` para gravar arquivo em `writeOutputFile` somente nos casos já truncados.
- **Manutenção**: baixa para adicionar spill a `grep`/`find` via `writeOutputFile` (`utils/output-files.ts:23-28`); média para `image-offload` em `core/agent-session.ts` + `core/compaction/`.

## Riscos e modos de falha

- Gravar arquivos enormes se um `grep` sem filtro varrer um build dir acidental: manter o teto de leitura do subprocesso `rg` (`matchCount` + teto absoluto de bytes lidos antes de matar `rg`, ex.: `10–20 MiB` como no `dsh`) ao gravar em disco, e respeitar a expiração por TTL proposta no Achado `05`.
- No offload de imagens, só substituir `ImageContent` de turnos antigos se o modelo retornar erro explícito de limite multimodal / payload de imagem (mantendo o prefixo inalterado no caso normal para não quebrar cache).

## Licença

Código-fonte de referência `dsh` sob licença **MIT** (`LICENSE:1-21`).

## Proposta para o `nycode`

1. **`grep.ts` e `find.ts` com spill em `writeOutputFile` (`packages/coding-agent/src/core/tools/{grep.ts:292-323,find.ts}`)**: quando `truncation.truncated === true` por limite de `50 KiB` (ou captura estendida até teto seguro de ~`2 MiB`), persistir saída via `writeOutputFile("nycode-grep", ".txt", ...)` / `"nycode-find"` e anexar caminho + dica de `read(offset, limit)` no aviso.
2. **Offload reativo de imagens antigas (`packages/coding-agent/src/core/agent-session.ts` + `extensions/image-open/` ou `core/messages.ts`)**: na detecção de overflow específico de imagens ou na preparação de retry de contexto cheio (`_isContextOverflowError`), gravar `ContextEditEntry` substituindo as imagens mais antigas por texto `[omitted old image from <path>]` antes de compactar o texto restante ou falhar a sessão.

## Testes necessários

- `packages/coding-agent/test/`:
  - `grep` e `find` excedendo `DEFAULT_MAX_BYTES` gravam arquivo `0o600` válido e incluem o caminho acessível na resposta;
  - sessão com 10 imagens que recebe erro simulado de excesso multimodal faz offload das mais antigas preservando as mais recentes e conclui no retry.

## Plano de eval

- **Baseline**: `nycode` atual.
- **Candidato**: `grep`/`find` com spill em arquivo + offload reativo de imagens.
- **Onde rodar**: `packages/evals` (cenários de busca grande em monorepo + sessão multimodal longa) e `bench/` (Terminal-Bench / SWE-style tasks). Nunca re-executar `cc-vanilla` nem `pi-vanilla`.
- **Critérios**: taxa de resolução BCa 90% >= `-0.10` e mediana de turnos/custo <= `1.10` (expectativa de menos re-chamadas redundantes de `grep`/`find`).

## Critérios de aceite e rollback

- **Aceite**: testes e evals verdes; arquivos de spill criados com `0o600`/`wx` e incluídos na limpeza TTL do Achado `05`.
- **Rollback**: remover a chamada `writeOutputFile` nos handlers de truncamento de `grep.ts`/`find.ts` e desativar o passo de offload de imagem no handler de retry.

## Prioridade

**Alta (P2 entre itens Classe B)** — baixo esforço em `grep`/`find` usando infraestrutura (`output-files.ts`) já existente no `nycode`.
