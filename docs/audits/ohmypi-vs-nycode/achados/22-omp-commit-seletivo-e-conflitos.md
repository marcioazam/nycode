# 22 — `omp commit` seletivo e leitor de conflitos (`conflict://`)

- **Classe**: **B** (implementação original do `omp` depende de `crates/vcs` Rust `14,9k` LOC + `eval` `ChangeJournal` — porte Rust é **sempre B**; um eventual `/commit` seletivo em extensão TS puro também adiciona nova superfície/prompts exigindo eval).
- **Prioridade**: **P3** (útil em trabalho humano interativo ou múltiplos escritores compartilhando um repo; em fluxos padrão e `bench/`, o `nycode` já opera com `git` CLI e `git_guard.py`).

## O que o `omp` faz

1. **`omp commit` CLI e `/commit` seletivo** (`omp:packages/coding-agent/src/commands/commit.ts:23-59`, `commit/agentic/index.ts:31-195`, `commit/selective/apply.ts:109-218`):
   - `omp commit`: sessão agentic (`smol`/`commit`) com tools Git dedicadas (`git_overview`, `git_file_diff`, `git_hunk`, `split_commit` topológico, `propose_changelog`).
   - `/commit` em sessão: lê `<artifacts>/changes.jsonl` (`ChangeJournal`) para atribuir linhas tocadas por este agente, cria commit num `index` privado e reconcilia com a `HEAD` real via `repo.commitReconciled` (`omp:crates/vcs`, `gix` + `jj-lib`):

```ts
         try {
            committed = await repo.commitReconciled(
               message,
               {
                  indexPath,
                  expectedHead: head ?? undefined,
                  amend: request.amend ?? false,
                  noVerify: request.noVerify ?? false,
               },
               joined,
               context.signal,
            );
```

1. **`conflict-detect` e `conflict://`** (`omp:packages/coding-agent/src/tools/conflict-detect.ts:181-874`): detecta marcadores de merge/rebase (`<<<<<<<`, `|||||||`, `=======`, `>>>>>>>`) e permite ler/editar apenas blocos em conflito por região (`ours`/`theirs`/`base`) sem reescrever arquivos enormes de milhares de linhas.

- **Ancestralidade Pi**: ausente em `pi0.9.4` e `pibase`. Criação original do `omp`.

## Como o `nycode` faz

- **Sem equivalente** para criação/split automático de commits ou `ChangeJournal`. `.nycode/prompts/cl.md:1-54` apenas audita `CHANGELOG.md`; `extensions/git-checkpoint/index.ts:1-18` usa um repo bare separado apenas para `/rewind`/`/tree`/`/fork` sem jamais tocar o `.git` de trabalho do usuário; e conflitos de git em múltiplas sessões são contidos por disciplina + `git_guard.py` (ADR-0002, `docs/ADR.md:44-52` no checkout principal).

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Commit convencional + split + changelog | `omp commit` agentic/map-reduce + `commit/selective` (`11.6k` LOC TS + `14.9k` LOC Rust `crates/vcs`) | Sem equivalente (`.nycode/prompts/cl.md` só audita changelog; `git-checkpoint` só faz snapshots) |
| Resolução cirúrgica de conflitos | `conflict-detect` + `conflict://` lê apenas `ours`/`theirs`/`base` do bloco em conflito | Usa `read` + `edit` tradicionais nos marcadores `<<<<<<<` via filesystem |

## Benefício

- **Problema**: (1) em sessões onde usuário e agente (ou subagentes) editaram arquivos não comitados em um mesmo repositório, `git add -A` mistura trabalho alheio e editar grandes arquivos com conflitos de merge gasta milhares de tokens lendo trechos sem conflito.
- **Avaliação crítica**: portar `crates/vcs` (`14.996` LOC Rust com `gix` + `jj-lib` + `uluru` MPL-2.0) e o `ChangeJournal` acoplado a `eval` tem custo totalmente desproporcional ao `nycode`. O único recorte que vale eventual design futuro em **extensão TS puro** é: (a) um comando `/commit` opcional usando `git diff` + `GIT_INDEX_FILE` temporário via CLI `git` (zero tokens quando não invocado!), e (b) um helper/extensão simples para listar/inspecionar regiões de conflito em arquivos grandes.

## Custo

- **Tokens / turno**: **0** se implementado como slash command/extensão sob demanda (diferente do `omp`, que injeta `commit-guidance.md` + prelude `commit.md` = **1.705 tok** quando `eval` + `commit.enabled` estão ativos!). Um comando CLI/slash sob demanda paga tokens apenas na invocação explícita.
- **Manutenção**: ~300–500 LOC TS puro via `git` CLI para um `/commit` enxuto (vs ~26.6k LOC + Rust `crates/vcs` no `omp`).

## Riscos

- **`HEAD` concorrente + hooks de sessão paralela**: conforme `docs/ADR.md:44-52` (checkout principal), várias sessões podem rodar no mesmo cwd; qualquer comando `/commit` deve exigir staging explícito de caminhos (nunca `git add -A`) e falhar se a árvore estiver bloqueada ou houver conflito em arquivo não tocado pela sessão.
- **GPL/MPL/toolchains**: **não** portar `crates/vcs` (`jj-lib` -> `gix` -> `uluru@3.1.0` MPL-2.0 e `process_setsid` nightly).

## Licença

**MIT** (`omp:LICENSE:1-23`; atenção à exceção MPL-2.0 de `uluru` apenas em `omp:deny.toml:42-47` caso alguém tocasse `crates/vcs`, o que rejeitamos aqui).

## Proposta

- **Futuro opcional (P3)**: criar extensão isolada `packages/coding-agent/src/extensions/commit/` (<= 7 arquivos, <= 800 linhas cada) expondo `/commit` para gerar mensagem Conventional Commits e stagear seletivamente hunks/arquivos via `GIT_INDEX_FILE` temporário com `git` CLI padrão (nunca automático, nunca injetando doc fixa no system prompt), mais opção futura de extração de hunks de conflito em ferramentas de leitura.

## Testes

- Em `packages/coding-agent/test/harness/extensions/`: testar em repositório git temporário (`mkdtemp`) criação de commit em `GIT_INDEX_FILE` isolado sem misturar arquivos untracked/unstaged alheios e aborte seguro se `HEAD` mover entre `diff` e `commit`.

## Plano de eval

- **Base e candidato**: como `/commit` por slash command é invocado manualmente pelo usuário, verificar custo zero fora de invocação (`prompt4` inalterado via `packages/evals` e `instruction_budget.py`) e acurácia das mensagens/splits com o provedor `faux` / amostras manuais em repos de teste (e `suite.s1` `pr_cases` se tocar `extensions/`). Não reexecutar `cc-vanilla`/`pi-vanilla`.

## Critérios de aceite

1. Zero dependência de `crates/vcs` / Rust / `jj-lib`.
2. Zero tokens adicionados ao `systemPrompt` ou `tools[]` quando `/commit` não está ativo.
3. Nunca executa `git add -A` nem sobrescreve staging alheio.

## Rollback

Remover a extensão `extensions/commit/` do registro em `extensions/index.ts`.
