# Achado 16 — Orçamento de Catálogo de `<skills>` e Limite de `32 KiB` / `project_root_markers` no `AGENTS.md`

- **Classificação**: **Classe B** (limita tamanho de `<skills>` e `AGENTS.md` injetados no prompt de sistema, mudando o contexto que o modelo vê em repositórios grandes).
- **Prioridade no backlog**: #11 (Classe B — **P2**).

## 1. Como o Codex faz

O Codex protege o orçamento de prefixo com limites explícitos tanto para documentação de projeto quanto para descrições de skills:

1. **`AGENTS.md` (`codex-rs/core/src/agents_md.rs:1-75` e `codex-rs/core/src/config/mod.rs:275-278`)**:
   - Define `AGENTS_MD_MAX_BYTES = DEFAULT_PROJECT_DOC_MAX_BYTES = 32 KiB` (`32,768` bytes).
   - Caminha para cima a partir de `cwd` até encontrar qualquer marcador em `project_root_markers` (padrão `[".git"]`, customizável — permitindo parar na raiz de submódulos ou monorepos específicos), e concatena em cascata apenas até esgotar `remaining`.

2. **Catálogo de Skills (`codex-rs/ext/skills/src/render.rs:23-33`)**:
   - Define `DEFAULT_SKILL_METADATA_CHAR_BUDGET = 8_000` chars, `SKILL_METADATA_CONTEXT_WINDOW_PERCENT = 2`, `MAX_CATALOG_SKILL_DESCRIPTION_CHARS = 1_024`:

```rust
// codex-rs/ext/skills/src/render.rs:23-33
const DEFAULT_SKILL_METADATA_CHAR_BUDGET: usize = 8_000;
const MAX_CONFIGURED_SKILL_METADATA_TOKEN_BUDGET: usize = 10_000;
const MAX_SKILL_PROMPT_BYTES: usize = 8_000;
const SKILL_METADATA_CONTEXT_WINDOW_PERCENT: usize = 2;
const MAX_CATALOG_SKILL_DESCRIPTION_CHARS: usize = 1_024;
const TRUNCATED_SKILL_DESCRIPTION_SUFFIX: &str = "...";
```

Quando o catálogo de skills estoura o orçamento (`8,000` chars ou `2%` da janela), remove as descrições longas preservando apenas os nomes + aviso (`Exceeded skills context budget...`).

## 2. Como o `nycode` faz

1. **Sem teto de bytes em `AGENTS.md` (`packages/coding-agent/src/core/resource-loader.ts:210-275`)**: `loadContextFileFromDir` lê `AGENTS.override.md`, `AGENTS.md`, `CLAUDE.md` integralmente com `readFileSync` da raiz até `cwd`, sem limite `project_doc_max_bytes` padrão e sem marcadores configuráveis além de `.git`.
2. **Skills em interativo (`packages/coding-agent/src/core/system-prompt.ts` e `extensions/headless-lean/index.ts:17,48-49`)**: no modo `-p`, `headless-lean` remove completamente `<skills>`, mas no modo interativo o bloco `<available_skills>` não aplica teto global de `2%` / `8,000` chars nem truncamento por descrição quando dezenas de plugins/skills são instalados.

## 3. Diferença Concreta

Repositórios corporativos com vários `AGENTS.md` encadeados ou contas com 30–80 skills instalados podem injetar facilmente `15k–40k` tokens extras de prefixo em toda sessão interativa sem nenhum aviso ao usuário, contrariando inclusive a diretriz registrada em `~/source/nycode/docs/ADR.md:54-60` (ADR-0003: evitar contexto sempre carregado inflando custo sem melhorar acerto).

## 4. Benefício e Custo

- **Benefício**: impõe teto previsível de tokens sobre contexto automático (`<= 32 KiB` em `AGENTS.md`/`CLAUDE.md`, `<= 8,000` chars em descrições de skills), preservando cache e evitando degradação por contexto inchado.
- **Custo em tokens**: neutro em repos normais (< 32 KiB e poucos skills); **economia de milhares de tokens** em projetos/setups carregados.
- **Custo em latência**: `0 ms` (medição simples em memória).
- **Custo de manutenção**: baixo (~80 linhas em `resource-loader.ts` + `skills.ts`).

## 5. Riscos e Licença

- **Riscos**: truncar silenciosamente um `AGENTS.md` importante do usuário sem avisar; mitigação: emitir warning visível na inicialização (e em `/diagnostico`), mantendo preferência pela camada mais específica (`cwd` sobre raízes acima quando cortar ou respeitando ordem explícita configurável). No catálogo de skills, preservar sempre todos os nomes para invocação sob demanda, cortando apenas descrições longas excedentes.
- **Licença**: Codex (`Apache-2.0`, `LICENSE:1-201`); constantes e comportamento reimplementados limpo em TypeScript.

## 6. Proposta Técnica e Plano de Eval (Obrigatório — Classe B)

- **Arquivos a tocar no `nycode`**:
  - `packages/coding-agent/src/core/settings-nycode.ts`: adicionar `context.projectDocMaxBytes` (default `32768`), `context.projectRootMarkers` (default `[".git"]`) e `skills.catalogMaxChars` (`8000`) / `catalogContextPercent` (`2`).
  - `packages/coding-agent/src/core/resource-loader.ts`: respeitar marcadores configurados ao subir diretórios e aplicar limite de bytes com warning claro ao atingir o teto.
  - `packages/coding-agent/src/core/skills.ts`: limitar descrições individuais (`1,024` chars) e degradar para nome-apenas ao exceder o teto do catálogo.
- **Testes unitários**:
  - `AGENTS.md` de 40 KB é truncado em 32 KB respeitando limite UTF-8 válido + aviso registrado; monorepo com marcador customizado para antes de `.git`; 50 skills com descrição longa degradam graciosamente sem perder os nomes.
- **Plano de Eval (Classe B — pareado)**:
  - **Suites**: `packages/evals` (`eval:docs` e caso sintético com 40 skills no catálogo e `AGENTS.md` longo) verificando se invocação de skills necessárias continua funcionando e medindo economia de tokens.
  - **Critério (`docs/bench/RUNBOOK.md`)**: acerto `>= -10 pp`, redução ou neutralidade de custo (`<= 1.10`).
- **Critério de aceite**: `npm run check` limpo + preservação total de invocação de skill quando descrições são condensadas.
- **Rollback**: definir `projectDocMaxBytes = 0` (ilimitado) e `catalogMaxChars = 0` por setting.
