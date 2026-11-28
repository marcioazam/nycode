# Fontes, Metodo e Lacunas da Auditoria

Este documento registra a proveniencia das fontes, o protocolo de leitura isolada (read-only), a inspeção de segurança prévia ao estudo do repositório externo, as ferramentas de análise estática utilizadas, a metodologia de medição de tokens e as lacunas de leitura linha a linha.

## Escopo e Linhagem dos Repositórios

| Artefato | Identificador / Local | Observações |
| --- | --- | --- |
| ZCode (referência read-only) | `zai-org/ZCode`, tag `v4.0.0`, SHA `a4b4445141eb7d3b3e99eada9292775383bfc44e` (`~/source/zcode-ref`) | Licença `Apache-2.0`; commit `2026-11-23 14:04:40 +0800 chore: sync ZCode source v4.0.0` |
| Metadado da release upstream | Release GitHub `v4.0.0` | Nota da release menciona `Build source: 6d86cdaa...` (mirror sincronizado em `v4.0.0`) |
| nycode (baseline comparado) | `origin/main` SHA `00fed2ae615016b328ebfb48bfaa49814bf1dbc4` | Auditoria redigida na branch `docs/zcode-vs-nycode-audit` em `~/source/nycode-audit-zcode` |
| Documentação local de referência do nycode | `docs/PRD.md`, `docs/ADR.md`, `docs/MEMORY.md`, `docs/README.md` | Arquivos untracked no checkout principal `~/source/nycode` (fora de `origin/main`) |

## Isolamento, Clone e Arquivos Sensíveis Intocados

O repositório externo foi obtido exclusivamente por clone raso (`git clone --depth 1 --branch v4.0.0`) em `~/source/zcode-ref`, sem instalação de dependências, compilação ou execução de scripts ou testes.

Cinco arquivos `.env*` existentes em `~/source/zcode-ref` permaneceram intocados durante toda a auditoria (nenhuma leitura de conteúdo):

1. `.env.development`
2. `.env.e2e.local.example`
3. `.env.example`
4. `.env.production`
5. `apps/zcode-cli/.env.template`

## Vetting de Segurança (`presente-de-grego`)

Antes da abertura dos arquivos de instruções, skills e hooks do repositório clonado, executou-se a inspeção `presente-de-grego` sobre `~/source/zcode-ref`:

- **Arquivos de instruções e travas**: `.agents`, `AGENTS.md`, `.husky` e `skills-lock.json` retornaram status `NO_ZERO_WIDTH` (sem caracteres invisíveis de injeção).
- **15 achados sinalizados na varredura ampla (todos classificados como benignos após triagem de padrão)**:
  - `.agents/skills/agent-browser/SKILL.md:473`
  - `apps/zcode-cli/packages/pdf-plugin/skills/pdf/briefs/academic.md:998`
  - `apps/zcode-cli/packages/pdf-plugin/skills/pdf/scripts/pdf.py:456`, `apps/zcode-cli/packages/pdf-plugin/skills/pdf/scripts/pdf.py:2090`, `apps/zcode-cli/packages/pdf-plugin/skills/pdf/scripts/pdf.py:2096`
  - `apps/zcode-cli/packages/pdf-plugin/skills/pdf/scripts/setup.sh:211`, `apps/zcode-cli/packages/pdf-plugin/skills/pdf/scripts/setup.sh:226`
  - `apps/zcode-cli/packages/zcode-site-plugin/skills/site-deploy/SKILL.md:66`
  - `apps/zcode-cli/packages/design-plugin/skills/design/design-resources/skills/*/SKILL.md` (5 ocorrências)
  - `apps/zcode-cli/packages/design-plugin/skills/design/scripts/audit-page.js:78` (`U+200D` em composição de string/glifo)
  - `packages/zcode-server-cli/scripts/verify-remote-ssh.mjs:53` (menção à chave padrão `"id_ed25519"`)

## Pesquisas Web e Documentação Oficial (`zcode.z.ai/en/docs`)

Conforme exigido na Fase 0, tentou-se consulta via Perplexity somada a provedor independente antes da inspeção de código:

1. **Perplexity**: chamada registrada com falha de autenticação de sessão (`No available search model for tier 'unknown'. Perplexity did not recognize the session: the cookies may be expired or invalid; refresh them.`).
2. **Segundo provedor independente (Exa + Brave Search) e CLI GitHub (`gh release view v4.0.0`)**: utilizados para mapear documentação pública, arquitetura anunciada e páginas oficiais.
3. **Documentação web coletada (`zcode.z.ai/en/docs`, 17 páginas consultadas)**:
   - **Página vazia (0 bytes)**: `changelog.md` (sem changelog publicado no endpoint consultado).
   - **16 páginas com conteúdo**: `ADE-tools.md`, `agents.md`, `commands.md`, `computer-use.md`, `goal.md`, `hooks.md`, `mcp-services.md`, `memory.md`, `plugin.md`, `remote-control.md`, `remote-development.md`, `safety-confirm.md`, `skill.md`, `subagents.md`, `task-management.md` e `workflow.md`.
4. **Manifestos e docs locais do ZCode lidos diretamente em `~/source/zcode-ref`**:
   - `README.en.md:1-230`
   - `LICENSE:1-202`
   - `NOTICE.md:1-73`
   - `THIRD-PARTY-NOTICES.md:1-40`
   - `CONTEXT.md:1-93`
   - `DESIGN.md:1-150`
   - `AGENTS.md:1-86`
   - `specs/zcode-unified-distribution.md:1-72`
   - `architecture-policy.yaml:1-120`
   - `package.json:1-157`
   - `skills-lock.json:1-25` e `apps/zcode-cli/skills-lock.json:1-23`
   - `third-party/copied-components.json` (20 entradas) e `third-party/embedded-components.json` (Skia, QuickJS-NG)

## Exploração do nycode (`codegraph`)

No `nycode`, executou-se `codegraph sync` (`5.668` arquivos indexados) seguido de 9 consultas `codegraph explore` antes de buscas pontuais via `rg`, cobrindo agent loop, sistema de goal, modos/permissões, multi-agente/subagent, codemode/MCP, compaction/memory, sessões/RPC, skills/system-prompt e provider retry.

## Metodologia de Medição de Tokens e Reconciliação Estrutural

- **Tokenizer**: `tiktoken` com encoding `o200k_base` aplicado offline sobre os strings e definições estáticas extraídas de ambos os repositórios (sem chamadas a APIs ou execução de código do ZCode).
- **Reconciliação de inventário**: todos os `19.355` caminhos retornados por `git -C ~/source/zcode-ref ls-files` foram particionados de forma disjunta entre código first-party (`9.212` arquivos), gerados (`33`), vendor (`9`), third-party (`3.898`) e não-código (`6.203`). O detalhe completo encontra-se em [inventario.md](inventario.md) e o censo de superfície em [censo.md](censo.md).

## Lacunas e o que Não Foi Lido Linha a Linha

Para evitar afirmações sem lastro direto em código lido, registram-se explicitamente os limites desta auditoria:

1. **Perplexity e Changelog Web**: o endpoint Perplexity falhou por cookies inválidos/expirados e `changelog.md` em `zcode.z.ai/en/docs` retornou 0 bytes. A evolução incremental pré-`v4.0.0` não pôde ser auditada por changelog externo, restringindo a análise ao snapshot `v4.0.0` (`a4b4445141eb7d3b3e99eada9292775383bfc44e`).
2. **Pacotes de UI, Mobile e Desktop (`desktop`, `web`, `android`)**: apenas os pontos de entrada e contratos principais (`packages/desktop/src/main/index.ts:1-80`, `packages/android/app/src/main/java/com/example/zcode_mobile/MainActivity.kt:1-60`) foram lidos para classificação e mapeamento em [rejeitados.md](rejeitados.md); os demais `~5.000+` arquivos de interface gráfica, empacotamento nativo e componentes visuais foram inventariados em [inventario/05-ui-web-android.md](inventario/05-ui-web-android.md) e [inventario/06-desktop.md](inventario/06-desktop.md), mas não foram auditados linha a linha por estarem fora do escopo do harness.
3. **Bibliotecas e prompts embutidos extensos**: `apps/zcode-cli/packages/core/src/tool/handlers/generated/bash-command-registry.ts` (registrado no bucket gerado; medido apenas o cabeçalho `1-9`) e o corpo completo dos `39` arquivos `*-plugin/skills/*/SKILL.md` (`111.010` tokens no agregado) e de `dynamic-workflows` (`22.555` tokens) foram medidos integralmente por `o200k_base` e amostrados nos casos relevantes aos achados, sem leitura integral linha a linha dos prompts de domínio (PDF, PPTX, DOCX, XLSX, design).
4. **Arquivos fora dos blocos críticos em pacotes de runtime e adapters**: em `agent-runtime.ts`, `apps/zcode-cli/packages/core/src/permission/service.ts`, `turn-loop.ts`, `compact.ts`, `dynamic-workflow/src/*`, `sqlite-session-store.ts` e equivalentes no `nycode` (`agent-session.ts`, `compaction.ts`, `goal/*`), foram lidos os intervalos exatos citados na [matriz.md](matriz.md) e nos documentos em `achados/`. Comportamentos fora desses trechos só são referidos quando verificados nos trechos lidos.
5. **Execução dinâmica**: por restrição explícita de segurança e custo, nenhum benchmark live de tokens ou taxa de acerto em modelos GLM/Claude foi executado; estimativas de ganho em itens Classe B são hipóteses operacionais sujeitas aos planos de eval especificados em cada achado.
