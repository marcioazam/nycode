# Achado 01: Governanca Arquitetural Declarativa entre Pacotes e Extensoes

- **Classe**: **A** (0 tokens extras no contexto do modelo; sem alteracao em system prompt, schemas de tool ou comportamento do agente)
- **Prioridade**: **P1 (Alta dentro da Classe A)**

## Problema

Conformes extensoes, adaptadores e pacotes de suporte crescem em torno de `packages/coding-agent/src/`, acoplamentos circulares ou imports internos entre extensoes (`src/extensions/A` importando internals de `src/extensions/B` em vez de `_shared/`) degradam a modularidade e quebram o carregamento isolado de extensoes sem nenhum sinal previo em CI.

## O que o ZCode faz (`~/source/zcode-ref`)

- **Arquivos e linhas**: `architecture-policy.yaml:1-120` e `scripts/architecture/architecture-check.mjs:1-104` no clone ZCode (`~/source/zcode-ref/architecture-policy.yaml:1-120` e `~/source/zcode-ref/scripts/architecture/architecture-check.mjs:1-104`).
- **Mecanismo concreto**: ZCode mantem uma politica declarativa centralizada cobrindo **254 modulos** (`managed: true/false`), definindo explicitamente:
  1. `layer` hierarquica (`contract < domain < app < adapters < ui`);
  2. lista branca `requires` de dependencias permitidas entre modulos;
  3. `publicEntrypoints` obrigatorios (impedindo import profundo em arquivos privados de outro modulo);
  4. comandos de adocao incremental e gate por diff (`pnpm architecture:check -- --changed`, `architecture:adopt`, `baseline:update`).

```javascript
// ~/source/zcode-ref/scripts/architecture/architecture-check.mjs:68-82
if (args.includes("--changed")) {
  const { base, label } = await resolveDiffBase(cwd, { explicit: option("--base") ?? null });
  ...
}
const result = await checkArchitecture({ cwd, changedFiles: changed, addedFiles: added });
```

## Como o nycode faz hoje (`~/source/nycode-audit-zcode`)

- **Arquivos e linhas**: `scripts/ci/lint/core_scope.py:1-100`, `scripts/ci/lint/structure_changed.py:1-177` e `scripts/check-entry-graphs.mjs:1-60`.
- `core_scope.py` valida que cada skill, agente, extensao, hook, comando e plugin exista na tabela de `docs/specs/0005-core-scope.md`.
- `structure_changed.py` limita tamanho de arquivo (<=800 linhas) e numero de arquivos em diretorios autorais no diff.
- `check-entry-graphs.mjs` aplica orcamentos de tamanho de grafo de imports de valor (`maxFiles`, `forbid`, `allow`) sobre subpaths declarados em `exports` (por exemplo `@nycode/schema`, `@nycode/ai/utils/*`).
- Falta uma checagem declarativa equivalente especificando **camadas e fronteiras entre modulos/extensoes dentro de `packages/coding-agent`** (ex.: garantindo que extensoes nao importem outras extensoes fora de `extensions/_shared/` e de seus `seams/`, nem que `packages/agent` importe `coding-agent`).

## Diferenca concreta

- **O que e necessario**: tabela curta (YAML/JSON/Python dict em `scripts/ci/lint/`) declarando as regras de fronteira entre diretorios internos (`core/` vs `extensions/*` vs `extensions/_shared/` vs `modes/`) e checando imports no diff de CI.
- **Complexidade opcional do ZCode a evitar**: nao e necessario clonar o ecossistema de **254 modulos**, `.architecture-baseline.json`, `CONTRACT.md` + `contract.example.ts` em cada subdiretorio nem CLI de `adopt` interativo para o porte atual do `nycode`.

## Beneficio esperado

- Impede vazamento de estado privado entre extensoes nativas do `nycode` (problema ja documentado com seams em `extensions/_shared/seams/`).
- Torna explicito e verificavel em pre-commit/CI qualquer novo acoplamento cruzado antes do merge.

## Custo

- **Tokens/turno**: **0** (`o200k_base`).
- **Latencia de sessao**: **0 ms** (roda exclusivamente em `npm run check` / `scripts/ci/run-static.sh`).
- **Manutencao**: baixa (~120–180 linhas de script Python em `scripts/ci/lint/` reutilizando a logica de `changed_files` ja existente em `structure_changed.py`).

## Riscos e armadilhas

- Falso-positivo com `import type` em TypeScript se o parser de regex nao ignorar `import type` (no `nycode`, `check-entry-graphs.mjs:11` ja trata esse ponto ignorando imports so de tipo).

## Licenca e proveniencia

- Codigo original do ZCode sob **Apache-2.0** (`Copyright 2026 Z.AI Co., Ltd`, `~/source/zcode-ref/LICENSE:1-202`). Proposta preve reimplementacao limpa em Python seguindo o estilo e padrao de `scripts/ci/lint/` do `nycode` (`ruff` + `mypy --strict`).

## Proposta de desenho no nycode

- Criar `scripts/ci/lint/layer_boundaries.py` com mapa estatico de camadas (`agent` -> zero deps internas de UI/session; `ai` -> zero deps de `agent`; `coding-agent/extensions/<ext>` -> pode importar `core/*` e `extensions/_shared/*`, proibido importar diretamente outra `extensions/<outra>/`).
- Plug-in no `scripts/ci/run-static.sh` junto a `core_scope.py` e `structure_changed.py`.

## Testes previstos

- Suite `unittest` / `pytest` em `scripts/ci/lint/test_layer_boundaries.py` cobrindo: import valido via `_shared/`, import `import type` ignorado, import ilegal direto entre extensoes bloqueado, import de `packages/agent` -> `packages/coding-agent` bloqueado.

## Plano de eval

- **Nao requer eval de modelo** (Classe A pura, zero efeito em prompts, tools ou decisoes do LLM).
- Verificacao 100% deterministica: rodar `scripts/ci/lint/layer_boundaries.py` sobre todo `HEAD` da worktree esperando exit `0` e **0 violacoes** no estado limpo atual, mais caso negativo sintetico em teste unitario.

## Criterios de aceite e rollback

- **Aceite**: `python3 scripts/ci/lint/layer_boundaries.py` + `scripts/ci/run-static.sh` passam sem falsos positivos sobre a base atual e capturam 100% dos imports cruzados sinteticos de teste.
- **Rollback**: remover a chamada em `scripts/ci/run-static.sh` e deletar `scripts/ci/lint/layer_boundaries.py`.
