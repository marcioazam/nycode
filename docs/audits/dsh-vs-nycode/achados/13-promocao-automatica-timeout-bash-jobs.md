# Achado 13: Promoção automática de timeout de `bash` para job em segundo plano

## O que o `dsh` faz

Em `packages/shell/tool-bash/src/index.ts:355-397` (`promoteOnTimeout: true`) e `packages/jobs/jobs-local/src/index.ts:233-265`, todo comando `bash` quando `ctx.jobs` está montado já nasce registrado no `JobRegistry` (`kind: 'bash'`, `toolCall`). Se a espera síncrona (`timeoutMs`) vencer enquanto o processo continua rodando em background (`view.status === 'running' || view.status === 'stopping'` e processo já iniciou), em vez de matar um build/servidor/suíte de testes quase pronta e perder todo o progresso, o `dsh` retorna um payload `kind: 'promoted'` contendo `jobId` e o delta de saída acumulado até aquele segundo (`ringDelta`):

```ts
// packages/shell/tool-bash/src/index.ts:383-397
if (view.status === 'running' || view.status === 'stopping') {
  // The wait timed out: the job keeps running. One consuming read seeds
  // the result with the output so far, so `job_output` continues exactly
  // where this result stops.
  const read = registry.read(attached.id, owner)
  return {
    kind: 'promoted' as const,
    cwd: spec.workdir,
    jobId: attached.id,
    timeoutMs,
    output: renderJobRead(
      ringDelta(read.chunks), read.lossy, read.job.output.spillPaths ?? [], attached.process()?.sandbox, escalationModes,
    ),
  }
}
```

Se o processo encerrar antes do timeout, ele é removido transparentemente do registro (`registry.remove`) sem expor `jobId` algum ao modelo nem poluir o estado de jobs. Quando o job promovido termina depois, `tool-jobs` suprime notificações duplicadas se o modelo já coletou por `job_output`, ou injeta notificação em `wakeup` quando ocioso.

## Como o `nycode` faz hoje

No `nycode`, `bash` em `packages/coding-agent/src/core/tools/bash.ts` (auxiliado por `bash-timeout.ts:13-93`) funciona de dois jeitos separados:
1. Modo síncrono padrão (`run_in_background` não especificado): se o comando exceder `timeout` (padrão `600 s`, teto `1800 s`, ou `120 s / 600 s` com `bash-main-guard`), o grupo de processos é **morto (`killProcessTree`)** e o resultado volta como erro/timeout. Se for um `npm run build`, `cargo test` ou `./test.sh` lento que estava em 90%, todo trabalho é perdido e o modelo tende a recomeçar tudo adicionando um segundo timeout ou usando `run` / `run_in_background: true`.
2. Modo explícito (`run_in_background: true` ou extensão `extensions/run/tool.ts`): existe um `run/registry.ts` separado (`MAX_LIVE = 8`) com notificações e `task_stop`, mas ele só atua quando o modelo **previu antes** que o comando demoraria (ou via armadilha `USR1` `wrapForBackground` em `bash-timeout.ts` quando disparada manualmente/sinalizada).

## Diferença concreta

- `dsh`: transição transparente de `foreground` para `background` no estouro do prazo quando o comando ainda está ativo, preservando PID/saída contínua desde o ponto exato de corte e evitando reiniciar compilações longas.
- `nycode`: mata o processo em timeout síncrono; só promove para background se o modelo tiver pedido `run_in_background: true` antes de disparar (ou via extensão `run`).

## Classificação

**Classe B** — Altera a semântica do erro/timeout da ferramenta `bash`: em vez de receber saída de comando abortado e ter de re-executar ou usar `run`, o modelo passa a receber um `jobId` vivo em execução para monitorar/aguardar com `run` / `task_stop` ou continuar trabalhando em paralelo. Muda o comportamento de follow-up e interação de ferramentas do modelo; exige eval.

## Benefício esperado

- Elimina desperdício de tempo e tokens reiniciando compilações, instalações ou suítes de testes longas que ultrapassam ligeiramente `timeout` (especialmente útil em TUI com `bash-main-guard`, onde o timeout inicial cai para `120 s`!).
- Reduz chamadas repetidas idênticas de builds grandes.

## Custo

- **Tokens/turno**: `0` tokens adicionais no Turno 1 (`o200k_base`) se reutilizar os IDs e ferramentas já existentes de `extensions/run` (`run` list/tail/wait + `task_stop`); apenas `~30–60` tokens no resultado de um `bash` que de fato estourar o timeout informando o `id` promovido em background.
- **Latência**: elimina reinício de comandos longos de 2–10 minutos.
- **Manutenção**: média — exige conectar o ciclo de vida do processo de `core/tools/bash.ts` com `extensions/run/registry.ts` (ou callback de promoção configurável em `BashToolOptions`) garantindo limpeza em shutdown e respeito ao teto `MAX_LIVE = 8`.

## Riscos e modos de falha

- **Zumbis ou processos esquecidos**: um comando travado em prompt interativo (`git` esperando senha, servidor HTTP sem querer) ficaria vivo consumindo slot em `MAX_LIVE` em vez de morrer no timeout! Mitigação:
  - restringir promoção automática apenas a sessões interativas com `extensions/run` ativo (nunca em modo headless `-p` onde não há turno contínuo para esperar notificação, salvo se explícito — e sempre matar em `session_shutdown`);
  - respeitar teto máximo duro absoluto (`maxTimeoutMs` / teto global de vida do job) além de permitir `task_stop` imediato.

## Licença

Código-fonte de referência `dsh` sob licença **MIT** (`LICENSE:1-21`).

## Proposta para o `nycode`

1. Em `packages/coding-agent/src/core/tools/bash.ts`, expor hook/opção `onTimeoutPromote?: (handle) => Promise<PromotedResult | undefined>` no `BashToolOptions`.
2. Na extensão `packages/coding-agent/src/extensions/run/` (`tool.ts` / `registry.ts`), em sessões interativas (`ctx.hasUI === true`), registrar processos `bash` iniciados com capacidade de promoção quando `timeout` vencer antes da saída (desde que haja vaga no `MAX_LIVE = 8`), retornando o texto formatado com `run` ID e saída capturada até o momento via `OutputAccumulator` (além de respeitar `bash-main-guard`).
3. Em modo headless `-p`, manter encerramento no timeout por padrão (evita processos órfãos em batches não interativos).

## Testes necessários

- `packages/coding-agent/test/`:
  - comando `sleep 5` com `timeout: 0.2s` no modo interativo é promovido ao registro `run`, continua até finalizar e entrega saída completa sem perder linhas da fronteira de corte;
  - em `headless` ou quando `MAX_LIVE` estiver cheio, mantém comportamento antigo de `killProcessTree` e erro de timeout;
  - `session_shutdown` encerra todos os jobs promovidos restantes.

## Plano de eval

- **Baseline**: `nycode` padrão (`bash` mata no timeout; modelo precisa decidir `run_in_background`).
- **Candidato**: `bash` com promoção automática em timeout quando `hasUI` / registro `run` ativo.
- **Onde rodar**: `packages/evals` com tarefas sintéticas envolvendo comando demorado (`> timeout` curto de teste) seguido de verificação do resultado sem perder trabalho; verificar em `bench/` que sessões headless mantêm BCa 90% >= `-0.10` e mediana custo/turnos <= `1.10`. Nunca re-executar `cc-vanilla` nem `pi-vanilla`.

## Critérios de aceite e rollback

- **Aceite**: zero processos órfãos após encerramento da sessão, saída contínua sem lacunas entre snapshot pré-promoção e `run tail`, `npm run check` e `./test.sh` verdes.
- **Rollback**: desligar `onTimeoutPromote` em `extensions/run` mantendo `bash.ts` exatamente como hoje.

## Prioridade

**Média (P5 entre itens Classe B)** — boa ergonomia sobre `bash-main-guard` em sessões interativas, sem urgência em headless.
