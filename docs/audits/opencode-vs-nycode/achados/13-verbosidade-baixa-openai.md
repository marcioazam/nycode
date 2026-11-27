# 13. `text.verbosity: "low"` na API OpenAI e Azure (Responses)

Classe: **B**. Prioridade: **P1** (uma linha; muda a saída do modelo).

## O que o OpenCode faz

`packages/core/src/plugin/verbosity.ts:10-36`: para OpenAI direto, Azure e gateways (Cloudflare, Vercel) com ids
`openai/…`, se nem o modelo nem a variante definem `textVerbosity`, aplica `event.options.textVerbosity = "low"`
(linha 36) em `context`, `compaction`, `generate` e `title`. `supportsVerbosity` (`:45-50`) limita a GPT-6 e GPT-5.x
conhecidos.

## Como o nycode faz

`packages/ai/src/api/openai-codex-responses.ts:605`: `text: { verbosity: options?.textVerbosity || "low" }` só no
provider Codex (assinatura ChatGPT). `rg -n verbosity packages/ai/src/api/openai-responses.ts packages/ai/src/api/openai-responses-shared.ts
packages/ai/src/api/azure-openai-responses.ts` vazio.

## Diferença

O mesmo modelo GPT responde mais longo via API OpenAI/Azure do que via Codex no nycode.

## Benefício

Menos tokens de saída (os mais caros) em todas as respostas GPT pela API. O nycode já escolheu "low" para Codex, o que
indica que a decisão de produto existe; falta estender.

## Custo

Manutenção ~10-20 linhas (mapear opção em `openai-responses.ts` e `azure-openai-responses.ts`, com a mesma lista de
modelos suportados).

## Riscos

Respostas curtas demais em explicações; o usuário pode sobrescrever por modelo (`textVerbosity`).

## Licença

MIT; trivial.

## Proposta

`packages/ai/src/api/openai-responses.ts` e `azure-openai-responses.ts`: `text.verbosity = options.textVerbosity ??
"low"` quando o modelo suporta (reusar critério do Codex).

## Testes

`packages/ai/test`: payload Responses contém `text.verbosity: "low"` para gpt-5.x/gpt-6; ausente para modelos sem
suporte; opção explícita prevalece.

## Plano de eval

Bench com modelo GPT via API: tokens de saída por tarefa e acerto, baseline vs candidato.

## Aceite

Saída menor com acerto não inferior.

## Rollback

Padrão volta a não enviar `verbosity`.
