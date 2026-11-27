# 08. /goal: objetivo reapresentado após compactação e corte de estagnação

Classe: **B**. Prioridade: **P1**.

## O que o OpenCode faz

- `packages/core/src/plugin/goal.ts:221-238`: no hook `context`, se nenhuma mensagem do usuário contém o bloco do
  objetivo (caso típico após compactação), insere `REMINDER` na **posição 1**, sem persistir:

```ts
// The last message carries the conversation's cache point, so a reminder at the tail would move every step and no
// request would reuse the previous one's cache.
event.messages.splice(Math.min(1, event.messages.length), 0, Message.user(render(REMINDER, ...)))
```

- `goal/reminder.txt`: 60 tok medidos (sem o objetivo).
- `:17,188-191`: `MAX_STALLS = 3`; uma rodada conta como estagnada se o motivo do juiz repete o anterior **ou** o modelo
  não chamou nenhuma tool desde a última continuação (`usedTools`, `:89-102`).
- `:16`: `MAX_ROUNDS = 50`; `:159`: pausa ao atingir.
- Alerta do próprio OC: `CHANGELOG.md:32` (#63669), lembrete do Plan mode reinserido a cada compactação mantinha a
  sessão em loop. O lembrete do goal não persiste e só entra quando o objetivo sumiu.

## Como o nycode faz

- O objetivo entra no kickoff (`extensions/_shared/goal/goal-evaluator.ts:22-23`) e a continuação usa o motivo do
  avaliador. Após compactação, o kickoff pode sair do contexto: `rg -n compact packages/coding-agent/src/extensions/goal`
  só acha comentários sobre a janela do avaliador, nenhuma reinserção.
- Estagnação: `extensions/goal/index.ts:23-25`: 8 vereditos "não" seguidos em turnos sem tool pausam.
- Sem teto de rodadas além disso.

## Diferença

1. Após compactar, o agente do nycode depende do resumo conter o objetivo literal; o OC garante o texto exato.
2. O nycode tolera 8 rodadas sem progresso; o OC 3, e também conta "mesmo motivo repetido" mesmo com tools usadas.

## Benefício

- Lembrete: assertividade em goals longos (o objetivo literal sobrevive). Custo ~60 tok + objetivo, só em requisições
  pós-compactação, na posição 1 (não move o breakpoint da cauda).
- Estagnação: corta até 5 rodadas inúteis (cada rodada = 1 turno + 1 checagem).

## Custo

Tokens: +60 tok + objetivo por requisição enquanto o objetivo estiver fora do contexto visível; negativo no corte de
estagnação. Manutenção: baixa (~40-80 linhas).

## Riscos

- Posição 1 fica depois do resumo de compactação; se o nycode puser outro conteúdo variável ali, o prefixo cacheado
  muda a cada turno. Inserir de forma determinística (mesmo texto, mesma posição).
- Corte de 3 pode pausar goals legítimos e lentos: medir.

## Licença

MIT; prompt curto reimplementável.

## Proposta

1. `extensions/goal/index.ts`: handler de `context` (ou `prepareRequest`) que insere o objetivo após o resumo quando
   nenhuma mensagem do ramo o contém; não persiste.
2. Contador de "mesmo motivo" além do atual "sem tool"; limiar configurável (`NYCODE_GOAL_STALL_CAP`, padrão atual 8
   até o eval).

## Testes

Faux provider: após compactação o payload contém o objetivo uma vez, na posição após o resumo; dois turnos seguidos
mantêm prefixo idêntico até a cauda.

## Plano de eval

Baseline nycode atual vs candidato (lembrete + limiar 3) em goals longos que forçam compactação. Métricas: objetivo
cumprido, rodadas, pausas falsas, custo.

## Aceite

Taxa de cumprimento não menor; rodadas desperdiçadas menores; cacheRead por turno igual ao baseline.

## Rollback

Desligar o handler e voltar o limiar a 8.
