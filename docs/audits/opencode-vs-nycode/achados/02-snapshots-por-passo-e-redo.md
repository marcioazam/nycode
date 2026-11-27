# 02. Snapshots por passo, mudanças de shell e /redo

Classe: **A**. Prioridade: **P1**.

## O que o OpenCode faz

- `packages/core/src/snapshot.ts:54-64`: repositório git sombra por projeto em `global.data/snapshot/<project>/<hash>`,
  semeado do repositório real; captura a árvore inteira (respeitando `.gitignore`).
- `packages/core/src/session/runner/step.ts:78-80`: captura no início de cada passo do modelo; `:292-295`: captura no
  fim e compara.
- `services/site/src/docs/content/snapshots.mdx:11-33`: `/undo` prepara o rollback (arquivos + conversa); `/redo`
  cancela antes de reenviar.

## Como o nycode faz

`packages/coding-agent/src/extensions/git-checkpoint/index.ts:1-17`:

```text
 * Snapshots commit the files this session's edit tools touched ... into a bare repo under
 * <agent dir>/checkpoints/<session> ... Each user prompt gets one checkpoint ...
 * files created after it are left in place.
```

## Diferença

| | OpenCode | nycode |
|---|---|---|
| Granularidade | cada passo do modelo | cada prompt do usuário |
| Escopo | árvore inteira do projeto | só arquivos tocados pelas tools de edição |
| Mudanças feitas por `bash` (sed, codegen, `npm install`) | capturadas | não capturadas |
| Refazer | `/redo` | sem equivalente |
| Arquivos criados depois | removidos no restore | mantidos |

O ponto que importa: no nycode, um `bash` que reescreve arquivos (formatter, `sed -i`, gerador) não é revertido pelo
`/rewind`. A escolha de escopo do nycode é deliberada (comentário cita `$HOME` como cwd sem limite), então a proposta
mantém o limite.

## Benefício

Rewind confiável após mudanças feitas por shell; desfazer passos dentro de um prompt longo. Nenhum token: snapshots
não entram no contexto.

## Custo

- Tokens: 0.
- Latência: `git add`/`write-tree` por passo; no OC é feito em fibra paralela (`step.ts:80`, `forkScoped`).
  Medir em repo grande antes de ligar por padrão.
- Manutenção: média (extensão já existe; ~150-250 linhas).

## Riscos

- Disco em cwd enorme: manter o limite atual (só dentro de repositório git, nunca `$HOME`).
- Remover arquivos criados depois pode apagar trabalho do usuário: exigir confirmação listando os arquivos.

## Licença

MIT; reimplementação.

## Proposta

1. `extensions/git-checkpoint/checkpoints.ts`: modo "repo" quando cwd é raiz de repositório git: `git add -A` no repo
   sombra (com `.gitignore` do projeto) em vez da lista de arquivos editados.
2. `extensions/git-checkpoint/index.ts`: checkpoint em `turn_end` além do prompt; comando `/redo` que restaura o
   estado salvo antes do último `/rewind`.
3. Docs em `packages/coding-agent/docs/` (rewind) e changelog.

## Testes

Em `packages/coding-agent/test/` com repo temporário: arquivo alterado por `bash` volta no rewind; `/redo` restaura;
fora de repo git o comportamento atual continua.

## Plano de eval

Classe A: sem eval de modelo. Medir latência por passo com `hyperfine` num repo de 10k arquivos (antes/depois).

## Aceite

Testes verdes; latência extra por passo < 100 ms p50 no repo de teste; `/rewind` atual inalterado fora de repo git.

## Rollback

Flag de setting (`gitCheckpoint.scope: "edits" | "repo"`), padrão anterior em caso de regressão.
