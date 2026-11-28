# Achado 06: Telemetria de sessão opt-in / autorizada por feedback explícito com cascata de redação

## O que o `dsh` faz

Em `packages/session/session-telemetry-otel/src/index.ts:31-51,223-251`, o `dsh` restringe o upload de logs completos de sessão a apenas dois modos (`FEEDBACK_ONLY` por padrão e `DISABLED`, **sem modo `FULL` incondicional**). O envio só é autorizado quando um evento canônico de feedback do usuário (`feedback/record`, `feedback/message-put` ou `feedback/message-delete` pertencente à própria sessão, nunca ao seed herdado de fork) entra no log:

```ts
// packages/session/session-telemetry-otel/src/index.ts:31-37,43-51,251
export enum SessionTelemetryMode {
  FEEDBACK_ONLY = 'FEEDBACK_ONLY',
  DISABLED = 'DISABLED',
}
export const DEFAULT_TELEMETRY_MODE = SessionTelemetryMode.FEEDBACK_ONLY

function isFeedback(session: Session, event: SessionEvent): boolean {
  if (event.seq < session.inheritedEventCount) return false
  switch (event.type) {
    case 'feedback/record': return true
    case 'feedback/message-put':
    case 'feedback/message-delete': return event.data.sessionId === session.id
    default: return false
  }
}
...
emit(_record: SessionTelemetryRecord): void {}
```

Antes do envio OTLP (`4 MiB` máximo), `SessionTelemetryCoordinator` (`packages/session/session-telemetry/src/index.ts`) passa todos os eventos pela cascata `session-telemetry/record`, permitindo que extensões/plugins redijam campos sensíveis, além de avançar cursor incremental por sessão para não reenviar prefixos já enviados.

## Como o `nycode` faz hoje

O `nycode` possui dois sistemas independentes:
1. `@nycode/telemetry` (`packages/telemetry/src/index.ts`, `memory.ts`, `metrics.ts`): contrato neutro tipado de métricas e spans em memória para testes e runtime (`ai`, `chord`, `durable`).
2. `packages/coding-agent/src/extensions/diagnostico/index.ts:84-93` + `observabilidade/exportar.ts`: grava ring buffer local (`traces.jsonl` e `diag.jsonl`) e, quando `OTEL_EXPORTER_OTLP_ENDPOINT` está configurado pelo usuário, exporta spans OTLP removendo `nycode.hook.stderr` (atributos `gen_ai.*`). Não existe, porém, um fluxo padrão de pipeline de redação extensível para exportar um recorte de transcript/diag sob consentimento explícito por `/feedback` ou bug report (hoje quem depura falhas de benchmark/harness depende de coletar arquivos locais manualmente).

## Diferença concreta

- `dsh`: bloqueia por construção (`emit()` no-op) o envio passivo de conteúdo completo de conversa, liberando apenas o prefixo não herdado quando o usuário aciona feedback explícito, com hook dedicado de redação extensível e teto rígido de payload (`4 MiB`).
- `nycode`: não envia conteúdo de conversa por padrão (melhor em privacidade passiva), mas também carece de gancho extensível/redator único caso se queira exportar um pacote sanitizado sob demanda para diagnóstico/evals (ex.: extensão interna de relatório).

## Classificação

**Classe A** — Totalmente ortogonal ao modelo (`0` tokens no prompt/tools, sem alterar execução ou respostas de agente). Só opera no plano de observabilidade/exportação acionada pelo usuário ou pipeline de diagnóstico.

## Benefício esperado

- Ganha camada padronizada de redação extensível caso extensões adicionem segredos/headers temporários nos spans/diagnósticos de `extensions/diagnostico`.
- Viabiliza exportação sanitizada incremental (com limite de tamanho e sem vazar prompts de sessões pai herdadas) quando o usuário solicitar explicitamente gerar relatório/bundle de diagnóstico.

## Custo

- **Tokens/turno**: `0` (`o200k_base`).
- **Latência**: `0` durante o loop nominal; processamento apenas em evento explícito de exportação/diagnóstico.
- **Manutenção**: baixa — pequeno filtro de redação antes de `observabilidade/exportar.ts` e opção no `/diagnostico`.

## Riscos e modos de falha

- Vazamento de segredos em spans/transcripts se regras de redação forem incompletas: falhar fechado redigindo env/auth headers e mantendo qualquer exportação externa estritamente desativada por padrão quando sem ação explícita ou `OTEL_EXPORTER_OTLP_ENDPOINT`.
- Nunca introduzir endpoint hardcoded de terceiros nem telemetria silenciosa (respeitar `docs/PRD.md`: privacidade e controle local em `~/.nycode/agent`).

## Licença

Código de referência `dsh` sob licença **MIT** (`LICENSE:1-21`).

## Proposta para o `nycode`

1. Em `packages/coding-agent/src/extensions/diagnostico/observabilidade/exportar.ts`, generalizar o filtro atual que apenas remove `nycode.hook.stderr` para suportar registro de redatores (ex.: redigir tokens/keys em atributos de comando/URL seguindo a mesma política de `core/auth-storage.ts` e `core/permissions/`).
2. Opcionalmente expor comando local `/diagnostico export` (sem envio automático de rede) reutilizando o recorte limitado (`4 MiB`) e redigido para compartilhamento manual em issues.

## Testes necessários

- Teste unitário em `packages/coding-agent/test/`:
  - redator remove credenciais, headers `Authorization` e segredos `.env` antes da serialização;
  - nenhum evento de rede é emitido sem configuração explícita;
  - cap de payload (`<= 4 MiB`) trunca entradas mais antigas mantendo cauda recente válida.

## Plano de eval

Sem necessidade de eval de modelo (**Classe A**). Verificar via `npm run check` e `./test.sh` em `packages/coding-agent`.

## Critérios de aceite e rollback

- **Aceite**: exportação/telemetria sanitizada passa em todos os testes sem qualquer tráfego implícito e com `0` tokens de overhead.
- **Rollback**: manter apenas o filtro atual em `diagnostico/observabilidade/exportar.ts`.

## Prioridade

**Baixa (P4 entre itens Classe A)** — boa prática de privacidade e higienização de diagnósticos, não urgente no fluxo principal.
