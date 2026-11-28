# Achado 16: Arquitetura de plugins (`vendor/cordis` + `scope` + `Hmr`) versus extensões embutidas do `nycode`

*(Classificação obrigatória Fase 3: "Trocar extensões por Cordis é sempre B.")*

## O que o `dsh` faz

Todo o `dsh` é estruturado sobre uma árvore hierárquica de serviços e eventos baseada em um fork do Cordis (`vendor/cordis/src/`, 2.865 LOC com 24 modificações locais documentadas em `vendor/README.md`) somado a três camadas próprias:

1. **Injeção de dependências declarativa e isolamento por símbolo (`vendor/cordis/src/`)**:
   - `Context.prototype.isolate(name, label)` (`context.ts:126-130`) cria um sub-contexto isolado cujo acesso a serviços passa por `Proxy` (`ReflectService.handler` em `reflect.ts:176-205`): acessar `ctx.<serviço>` numa fiber não-raiz sem declará-lo em `inject` falha fechado (`throw Error('cannot get property "..." without inject')` em `reflect.ts:185`).
   - `Fiber._unload()` (`fiber.ts:734-768`) aguarda dependentes descarregarem antes de executar os `_disposables` do provedor em ordem reversa.
   - `events.waterfall()` (`events.ts:250-265`) protege cadeias assíncronas impedindo chamadas múltiplas a `next()` (`if (called) throw new Error('next() called multiple times')` na linha `258`).
2. **Escopo hierárquico por agente (`packages/core/scope/src/index.ts:137-185`)**:
   - `createScope(ctx, agent)` anexa um tag `[kScope]` ao contexto Cordis; `scopeTarget(service, key)` propaga eventos para ancestrais sem vazar para irmãos ou filhos abaixo da chave.
3. **Auditoria de vazamento e reload a quente (`agent-preset-registry/src/mount.ts:204-216` e `boot/hmr/src/index.ts`)**:
   - `mountPreset` rejeita qualquer preset que forneça um serviço mutável sem reino `isolate:` (`if (leaked.length > 0) throw new Error('Preset services require isolate realms: ...')` em `mount.ts:211-213`).
   - `Hmr` serializa mutações de perfil via `AsyncLocalStorage` (`runExclusive()`), limpa caches ESM/CJS e decide entre recarga ao vivo ou `RestartReason`.

```ts
// packages/preset/agent-preset-registry/src/mount.ts:204-214
export async function mountPreset(ctx: Context, id: string, plugins: PresetDefinition['plugins']): Promise<PresetMount> {
  if (scopeOf(ctx) === undefined) throw new Error('agent-preset: mounting requires a scope')
  ...
  const audit = await auditRows(tree)
  const leaked = leakedServices(ctx, ctx.fiber)
  if (audit.failed.length > 0) throw new Error(audit.failed.join('\n'))
  if (leaked.length > 0) throw new Error(`Preset services require isolate realms: ${leaked.join(', ')}`)
```

## Como o `nycode` faz hoje

1. **Sistema de extensões embutido e direto (`packages/coding-agent/src/extensions/index.ts:62-131` e `core/extensions/`)**:
   - `builtInExtensions` registra explicitamente todas as extensões em ordem determinística (`claude-rules` primeiro, depois alfabético e extensões pré-migração; `extensions/index.ts:62-131`), carregadas por `DefaultResourceLoader` + `ExtensionLoader` via `jiti` (para extensões de usuário/projeto).
   - A orquestração passa por `ExtensionRunner` (`core/extensions/runner.ts`, `types.ts`), hooks tipados síncronos/assíncronos (`before_agent_start`, `tool_call`, `tool_result`, `before_provider_request`, `agent_before_settle`, `prepareLoadout` em `core/extensions/types.ts:572-659`) e um `EventBus` simples.
   - Não há grafo de DI nem reload parcial a quente por plugin: `/reload` em `agent-session-runtime.ts` recria o runtime inteiro. Em compensação, a arquitetura tem custo mínimo de startup e compila em binário único (`build:binary` em `packages/coding-agent/package.json:36`).
2. **Camada distribuída paralela já existente (`packages/chord/src/` e `packages/durable/src/`)**:
   - O `nycode` já possui um runtime de objetos com estado transacional, delta JSON, rotinas e workers isolados por endereço no `@nycode/chord` (usado por `@nycode/durable` e `apps/p2`/`apps/p3`), separado intencionalmente do núcleo leve da CLI em `coding-agent`.

## Diferença concreta

- `dsh`: tudo (inclusive `systemPrompt`, `sessions`, `tools`, `presets`, subagentes in-process e UI web) vive como serviços reativos em árvore Cordis + `Typert` RPC (aprox. `2.865` LOC de kernel + `5.514` LOC `app-boot` + `10.886` LOC `typert`). Isso permite múltiplos agentes isolados por `Scope` no mesmo processo Node, presets trocáveis com auditoria automática de isolamento (`isolate:`) e HMR parcial de plugins — ao custo de complexidade enorme de grafo de ciclo de vida, proxies em tempo de execução e compilação/geração de catálogos (`typert/generator` com `7.598` LOC).
- `nycode`: extensões recebem uma única API enxuta (`ExtensionAPI`) sem árvore de fibers, sem DI dinâmica nem proxies de contexto; subagentes correm em processos OS separados (isolamento natural de memória/env, sem necessidade de `Scope` Cordis por fiber).

## Classificação

**Classe B** *(regra explícita da Fase 3: "Trocar extensões por Cordis é sempre B")* — Qualquer migração do sistema de extensões para Cordis mexeria na ordem de inicialização, ciclo de vida de hooks, montagem de `systemPrompt`/`tools`, latência de boot e comportamento de subagentes e extensões embutidas (`builtInExtensions`), exigindo revalidação completa e eval end-to-end antes de qualquer troca.

## Benefício esperado (e veredito prático de ROI)

- **Benefício teórico se migrasse para Cordis**: permitiria subagentes in-process por `createScope` com teardown em cascata e recarga parcial de extensões sem recriar o `AgentSession`.
- **Análise prática de custo x benefício**: **ROI fortemente negativo para migração completa no `nycode`**. O `nycode` CLI preza por inicialização rápida em binário único (`docs/PRD.md`: núcleo mínimo e extensível sem servidor/daemon acoplado) e já isola subagentes em processos OS separados; portar `vendor/cordis` + `app-boot` + `typert` adicionaria `~15k–20k` LOC de kernel complexo e quebras em ~60 extensões (`packages/coding-agent/src/extensions/*`) sem ganhar 1 único ponto de assertividade para o modelo.
- **O único micro-padrão que vale importar seletivamente** de `vendor/cordis` em `nycode` é a guarda `next() called multiple times` no pipeline de middlewares/extensões e, caso `subagent_fork` seja adotado in-process no futuro (embora no Achado `10` tenhamos proposto fazê-lo sobre o mecanismo existente de `--session`), um escopo mínimo para handlers por subagente.

## Custo

- **Tokens/turno**: `0` tokens diretos se o prompt final gerado for idêntico; risco real de regressão indireta se a ordem implícita de composição entre extensões (ex.: `claude-rules`, `headless-lean`, `plan-gate`, `completion-gate`, `todo-turn-check`, documentada explicitamente em `packages/coding-agent/src/extensions/index.ts:70-124`) mudar durante a reescrita.
- **Latência**: Cordis proxies (`ReflectService.handler`) + resolução recursiva de dependências em boot (`profile-resolution` no `dsh` tem `1.072` LOC) tendem a **piorar** o tempo de boot frio da CLI em comparação ao array estático `builtInExtensions` compilado no bundle.
- **Manutenção**: **altíssima** para adoção completa de Cordis (~`60` extensões reescritas + perda de compilação estática direta do grafo de `ExtensionRunner`); **mínima** se absorver apenas a guarda de invocação dupla de `next()` em cadeias assíncronas onde aplicável.

## Riscos e modos de falha

- Quebra silenciosa na precedência crítica de settled-gates (`completion-gate` -> `plan-gate` -> `todo-turn-check`, explicada em `packages/coding-agent/src/extensions/index.ts:122-123`) ao trocar lista ordenada estática por dependências implícitas em grafo de DI.
- Vazamento de estado global entre extensões caso uma extensão use estado de módulo (`let enabled`) em vez de escopo Cordis ao rodar múltiplos `Agent` no mesmo processo — exatamente a classe de bug que obrigou o `dsh` a construir o auditor `leakedServices` em `mount.ts:211-213`.

## Licença

`vendor/cordis` e pacotes `dsh-core`/`dsh-preset`/`dsh-boot` sob licença **MIT** (`LICENSE:1-21` em `dsh`; origens `cordisjs/cordis` também MIT).

## Proposta para o `nycode`

1. **NÃO migrar** `core/extensions/` para `vendor/cordis` (preservar `builtInExtensions` e `ExtensionRunner` simples).
2. **Adotar apenas o guardião pontual de cadeia**: nos event runners em cascata que usam callback `next()` ou encadeamento (`ExtensionRunner` em `packages/coding-agent/src/core/extensions/runner.ts` e middlewares de `before_provider_request` / `context`), garantir proteção contra múltiplas invocações acidentais de `next()` (erro explícito em testes/runtime) e registrar ordem determinística de hooks em um único ponto auditável.
3. Documentar em `docs/ADR.md` a decisão explícita de manter `ExtensionRunner` plano no CLI (delegando workflows de longa duração com atores para `@nycode/chord` / `@nycode/durable` em vez de transformar a CLI numa árvore Cordis).

## Testes necessários

- Teste unitário em `packages/coding-agent/test/`:
  - verificar falha limpa caso handler customizado tente invocar callback de continuação duplicado (se aplicável aos ganchos estilo middleware);
  - preservar os testes de ordenação crítica entre `claude-rules`, `completion-gate`, `plan-gate` e `todo-turn-check`.

## Plano de eval

- Caso apenas a guarda de cadeia seja adicionada: `./test.sh` completo garante ausência de mudanças comportamentais.
- Caso em algum momento se cogite prototipar DI estilo Cordis numa branch experimental: executar suite integral `packages/evals` e `bench/` completo (`tier pr` + `hard`) comparando startup latency (`ms`), memória RSS e taxa de sucesso (BCa 90% >= `-0.10`, mediana custo/turnos <= `1.10`) sem nunca re-executar `cc-vanilla` nem `pi-vanilla`.

## Critérios de aceite e rollback

- **Aceite (recomendação conservadora)**: `ADR` documentando manutenção do `ExtensionRunner` atual + guarda de cadeia testada sem regressões.
- **Rollback**: trivial para a guarda pontual (1 arquivo); inviável/alto risco se fosse feita migração completa para Cordis sem feature branch isolada.

## Prioridade

**Não recomendado migrar o núcleo (P8 — manter como referência arquitetural e aplicar só guarda de cadeia)** — alto custo de manutenção sem ganho mensurável sobre `ExtensionRunner` + processos OS para subagentes.
