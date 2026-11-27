# 20. Identidade do modelo no prompt de sistema

Classe: **B**. Prioridade: **P3** (benefício incerto).

## O que o OpenCode faz

`packages/core/src/plugin/identity.ts:11-17` monta:

```text
# Your Model
- Name: <nome>
- Provider ID: <provider>
- Model ID: <id>
```

e `:25` o insere como segunda parte do sistema (`event.system.splice(1, 0, ...)`) nos hooks `context`, `compaction` e
`generate` (`:27-29`). Medido: 35 tok (o200k) com um nome típico.

## Como o nycode faz

Não informa: as seções do prompt saem de `packages/coding-agent/src/core/system-prompt.ts:136`
(`buildSystemPromptSections`) e `rg -n -i 'model\.(name|id)|modelName'` nesse arquivo é vazio. O modelo só sabe quem é
pelo treino.

## Diferença

No OC o modelo sabe o id exato em uso. Isso importa quando ele escolhe o modelo de um subagente ou responde "qual modelo
está rodando"; nos demais casos não importa.

## Benefício

Hipotético: menos erro ao passar `model` para `subagent` e respostas corretas sobre o próprio modelo. Não há medição no
OC que mostre ganho.

## Custo

+35 tok por requisição, no prefixo em cache (~3,5 tok equivalentes por turno com cache a 0,1x). Troca de modelo no
meio da sessão muda o prefixo e invalida o cache a partir desse ponto (o nycode já invalida ao trocar de modelo, então
o custo marginal é zero aí).

## Riscos

Ruído para tarefas de código; com `subagent-accounts` o orquestrador não passa `model`, então o principal benefício nem
se aplica no harness do dono.

## Licença

MIT; texto trivial.

## Proposta

`packages/coding-agent/src/core/system-prompt.ts`: linha opcional "Model: <provider>/<id>" atrás de configuração,
desligada por padrão.

## Testes

Snapshot do prompt com e sem a opção.

## Plano de eval

Baseline vs candidato em `packages/evals` com tarefas que pedem escolher modelo de subagente; métrica: acerto do id e
tokens. Sem ganho mensurável, rejeitar.

## Aceite

Ganho medido no cenário de escolha de modelo sem regressão nas tarefas de código.

## Rollback

Desligar a opção.
