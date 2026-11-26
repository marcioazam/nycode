# B1: pesquisa refeita e plano do blueprint para o Nycode (2026-11-24)

## Origem

Em 14 e 15/11 o plano B do harness Nycode era adotar as regras de `~/source/blueprint/base-software-rules` (commit
`cb9f303`) no repositório do Nycode pré-migração. Esse repositório foi arquivado; o alvo agora é `marcioazam/nycode`.
O registro original fica no registro do mantenedor, lido sem
alteração. A lista do dono continua valendo acima do blueprint: 80% de cobertura por arquivo de código, E2E primeiro,
800 linhas por arquivo, 7 arquivos de código por diretório, README.md em todo diretório, DRY, enums no lugar de
strings e o tempo de CI por PR sem aumentar.

## Pesquisa refeita (Perplexity, mais Exa e Parallel como provedores independentes; fonte primária lida)

| Pergunta | Resposta | Fonte primária | Estado |
|---|---|---|---|
| Que assinaturas o GitHub marca como "Verified" | GPG, SSH e S/MIME criptograficamente verificáveis | [docs.github.com: about commit signature verification](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification) | verificado |
| gitsign (Sigstore) recebe "Verified" | a página do Sigstore não abriu (`CRAWL_NOT_FOUND`); a lista do GitHub acima não cita gitsign | docs.sigstore.dev | **não verificado**; o plano usa assinatura SSH |
| release-please em monorepo | o releaser por manifesto existe para monorepos | [release-please: manifest-releaser.md](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md) | verificado |
| Versões estáveis hoje | `release-please` 17.11.2, `release-please-action` v5.0.0, `@changesets/cli` 3.0.3, `semantic-release` 26.0.1 | `npm view <pacote> version` e `gh api repos/googleapis/release-please-action/releases/latest` (registro e API, 2026-11-24) | verificado |
| Changesets com npm workspaces | "Supports pnpm, yarn, and npm workspaces" | [changesets.dev](https://changesets.dev/) | verificado |
| Projects: item vai a Done ao fechar a issue ou dar merge no PR | sim, workflow embutido | [docs.github.com: built-in automations](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-built-in-automations) | verificado |
| Projects: auto-add | não adiciona itens antigos; no Free, 1 workflow de auto-add | [docs.github.com: adding items automatically](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/adding-items-automatically) | verificado |
| Releases imutáveis | GA desde 2025-10-28; liga em Settings, Releases, "Enable release immutability", e vale para os releases seguintes | [changelog](https://github.blog/changelog/2025-10-28-immutable-releases-are-now-generally-available/), [docs](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/establish-provenance-and-integrity/prevent-release-changes) | verificado |
| Sub-issues, issue types e issue fields pela API | o schema GraphQL tem `addSubIssue`, `removeSubIssue`, `reprioritizeSubIssue`, `createIssueType`, `updateIssueIssueType`, `createIssueField` e `setIssueFieldValue`; o `gh` 2.46.0 instalado não cria sub-issue por flag | introspecção `gh api graphql` (`__type(name:"Mutation")`, 2026-11-24) e `gh issue create --help` | verificado (existência da mutation; disponibilidade de issue types e fields em conta pessoal **não verificada**) |

Lacunas que seguem abertas, cada uma conferida na etapa que a usa: gitsign; `release-type: node` com workspaces npm
no release-please; issue types e fields em conta pessoal Free.

## O que o Nycode já cumpre (medido em 2026-11-24 com `gh api` e na árvore `origin/main` `1eeaca75c`)

- Arquivos: `README.md`, `AGENTS.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `.github/CODEOWNERS`,
  `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/`, `CHANGELOG.md` por pacote.
- Workflows: `ci`, `ci-static`, `ci-security`, `codeql`, `scorecard`, `dependency-review`, `npm-audit`, `merge-policy`,
  `instruction-budget`, `publish`.
- Repositório: Discussions ligadas, wiki desligada, delete-on-merge ligado, squash ligado, relato privado de
  vulnerabilidade ligado, Dependabot, secret scanning e push protection ligados, ruleset `main` ativo, releases
  v2.0.0, v2.0.1 e v2.0.2.

## Lacunas

| Lacuna | Medida |
|---|---|
| README.md por diretório de código | 749 de 822 diretórios de código não têm (maiores: `packages/coding-agent` 288, `bench/suites` 215, `packages/chord` 150) |
| Ruleset de tags `v*` | só existe o ruleset `main` (branch) |
| Releases imutáveis | não ligados (opção de Settings) |
| Entrada única de verificação | não existe `scripts/verify-all fast\|pr\|full`; o CI chama os scripts diretamente |
| Milestones | 0 |
| Assinatura de commits e tags | não exigida |
| `CLAUDE.md` na raiz | ausente. A D-62 tira o Nycode de `~/.claude`, mas um `CLAUDE.md` com `@AGENTS.md` só serve a quem contribui com o Claude Code. Fica como decisão do dono |

## Plano em etapas (para o dono aprovar; nada executado)

Regras de todas as etapas: cada uma é uma PR pequena ou um lote de chamadas de API, reversível sozinha; checagens novas
olham só arquivos alterados; checagens lentas vão para o nightly; nada que duplique o que já existe.

| Etapa | O quê | Custo no CI do PR | Como se confere |
|---|---|---|---|
| 1. Configurações | ruleset de tags `v*` (sem apagar nem forçar), releases imutáveis, milestones para os planos abertos | nenhum | leitura de volta por `gh api` registrada em `docs/` |
| 2. Entrada única | `scripts/verify-all fast\|pr\|full` como invólucro fino de `run-static.sh`, `npm run check` e `./test.sh`; o CI chama `verify-all pr` | ~1 s | `verify-all pr` com os mesmos passos e códigos de saída de hoje |
| 3. README por diretório, como checagem | o `structure_changed` exige README.md só nos diretórios tocados; fixtures vermelha e verde | < 1 s | teste da checagem |
| 4. README por diretório, conteúdo | os 749 READMEs, escritos a partir do código, em PRs por pacote (`bench`, `scripts`, `packages/coding-agent`, `packages/chord`, resto) | nenhum (só docs; o `bench-pr` classifica como não funcional) | refs, markdownlint, a checagem da etapa 3 |
| 5. Releases | release-please por manifesto (ou changesets, a escolher na etapa) gerando o PR de versão em vez do commit manual; mantém `publish.yml` | nenhum no PR comum | simulação do PR de versão |
| 6. Assinatura | commits e tags assinados por SSH e regra "require signed commits" no ruleset | nenhum | push assinado aceito e push sem assinatura recusado num branch de teste |

Escolhas do dono (2026-11-24, D-66): etapas aprovadas; release-please na etapa 5; assinatura SSH na etapa 6; sem
`CLAUDE.md` na raiz: o `AGENTS.md` continua o único arquivo de instruções.

## Decisão

Pesquisa refeita e plano montado. Aprovado pelo dono (D-66); a execução das 6 etapas segue em PRs próprias depois do placar do backlog.

## Execução

- Etapa 1, 2026-11-24 13:10 (D-66): ruleset de tags `tags v*` (id 27998902, `refs/tags/v*`, ativo, sem bypass) bloqueia
  apagar, mover e forçar tag; releases imutáveis ligados (`gh api repos/marcioazam/nycode/immutable-releases` →
  `{"enabled":true}`). O `publish.yml` já cria o release como rascunho, anexa os binários e só depois publica, o que é
  compatível com release imutável. Milestones ficam para quando houver plano aberto que precise delas.
  Reverter: `gh api -X DELETE repos/marcioazam/nycode/rulesets/27998902` e
  `gh api -X DELETE repos/marcioazam/nycode/immutable-releases`.
- Etapas 2 a 6: depois do placar do backlog, uma PR cada.
