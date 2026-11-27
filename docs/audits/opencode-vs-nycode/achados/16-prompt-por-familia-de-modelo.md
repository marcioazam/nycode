# 16. Prompt de sistema por família de modelo

Classe: **B**. Prioridade: **P3** (engorda o prompt; só com eval por família).

## O que o OpenCode faz

- `packages/core/src/plugin/optimize.ts:9-45`: troca o prompt base por família (`gpt.txt`, `gpt-6.2.txt`,
  `gpt-astra.txt`, `kimi.txt`, `meta.txt`, `trinity.txt`); para Anthropic só anexa `anthropic.txt` (regra de
  comentários) ao base (`plugin/system-prompt/AGENTS.md`).
- Medido (o200k): base renderizado 413 tok; gpt 563; gpt-astra 794; gpt-6.2 1559; meta 1613; trinity 1660; kimi 1804.
- `CHANGELOG.md:9` (v2.4.2): prompt próprio para GPT-6.2 "derived from Codex's prompts" (`optimize.ts:29`).

## Como o nycode faz

Um prompt (`packages/coding-agent/src/core/system-prompt.ts:159-180`), 447 tok medidos com as 4 tools default, mais o
contrato K7 (250 tok) quando ligado.

## Diferença

O OC paga +150 a +1400 tok fixos por requisição em modelos não-Anthropic para seguir o estilo de prompt de cada
fornecedor.

## Benefício

Hipotético: modelos treinados com o prompt do próprio harness (Codex para GPT) podem acertar mais com ele. Sem medição
pública no repositório do OC.

## Custo

+150 a +1400 tok fixos (com cache, ~0,1x após a primeira requisição). Manutenção alta: N prompts para manter
consistentes (o próprio `AGENTS.md` do diretório pede atualizar todos juntos).

## Riscos

Divergência entre prompts; regressão silenciosa numa família.

## Licença

MIT para os textos do OC; os textos "derived from Codex's prompts" têm origem no Codex (Apache-2.0): verificar antes de
copiar.

## Proposta

Não implementar sem eval. Se testar: um único prompt alternativo para GPT via `customPrompt` por modelo
(`system-prompt.ts:159-161`), sem tocar no padrão.

## Testes

Snapshot do prompt por família.

## Plano de eval

Mesmo modelo GPT, prompt nycode vs prompt GPT do OC adaptado; bench com tarefas de edição. Métricas: acerto, tokens
totais.

## Aceite

Acerto maior com certeza ≥ 80% que compense o custo fixo.

## Rollback

Remover o prompt alternativo.
