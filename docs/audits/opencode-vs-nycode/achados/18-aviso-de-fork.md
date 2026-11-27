# 18. Aviso de fork para o modelo

Classe: **B**. Prioridade: **P2** (custo pequeno, só em sessões forkadas).

## O que o OpenCode faz

`packages/core/src/plugin/fork-notice.ts:7-15` define `<fork-notice>` (226 tok medidos) e `:18` o injeta como
mensagem sintética no hook `fork`, uma vez por fork (id fixo `msg_fork_notice_<sessionID>`):

```text
This conversation is a fork of another conversation, copied up to the previous message. The original conversation
keeps going on its own and may be active right now, as may other forks of it.
- Work started before the fork belongs to the original: background subagents, background shells, schedules, and
  follow-ups promised there. Their results and notifications go to the original, never here ...
- Files, repositories, branches and external services are shared with the original. Before changing something the
  original was working on ... check its current state ...
```

## Como o nycode faz

`packages/coding-agent/src/core/slash-commands.ts:34-35` (`fork`, `clone`) copiam o ramo sem aviso ao modelo:
`rg -n -i 'fork.?notice|this conversation is a fork|forked from' packages/coding-agent/src` vazio. O aviso existe só
para o usuário: `extensions/subagent/index.ts:443-449` notifica na UI "N background runs still active; /tasks to
inspect" quando `event.reason === "fork"`. E a semântica é oposta à do OC: no mesmo processo, os filhos em background
continuam sob a **nova** sessão (comentário em `extensions/subagent/index.ts:429-433`), então as conclusões chegam ao
fork, não à original.

## Diferença

No OC o fork perde os resultados de background e o aviso diz "não espere por eles". No nycode o fork os recebe, mas o
modelo não sabe disso: se o ponto do fork é anterior ao spawn, chega um resultado que esse ramo nunca pediu; se é
posterior, a sessão original (quando retomada) perde os resultados sem aviso. O texto do OC não serve como está; o
aviso do nycode teria de dizer "runs em background ativos: N; suas conclusões chegam a este ramo".

## Benefício

Evita que o modelo trate como seu um resultado de background que este ramo não pediu, ou que o ramo original espere resultado que migrou para o fork.

## Custo

+226 tok, uma vez por fork (fica no histórico daquele ramo; com cache, ~0,1x nos turnos seguintes). Manutenção
mínima (~20 linhas).

## Riscos

Aviso em fork sem trabalho em background é ruído; o OC injeta sempre. Variante mais barata: injetar só quando houver
subagente/`run` ativo no momento do fork.

## Licença

MIT; reescrever o texto.

## Proposta

`core/agent-session.ts` (ou extensão `subagent`) no evento de fork/clone: mensagem `custom` com o aviso quando o
registro de background (`extensions/subagent/fleet/store.ts`, `extensions/run/registry.ts`) tiver itens ativos.

## Testes

Faux: fork com subagente ativo → aviso presente uma vez; fork sem background → sem aviso.

## Plano de eval

Cenário com subagente em background + `/fork`: baseline vs candidato. Métricas: turnos esperando resultado inexistente,
conflitos de edição.

## Aceite

Zero esperas indevidas no cenário; sem aviso em forks sem background.

## Rollback

Remover o handler.
