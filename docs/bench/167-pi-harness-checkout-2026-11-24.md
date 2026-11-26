# #167: o checkout `~/code/pi-harness` depois da migração (2026-11-24)

## Pergunta

A migração para o core tornou obsoleto o checkout local do harness Nycode (`~/code/pi-harness`, ramo
`feat/ui-onda9-harness`, com mudanças sem commit)?

## O que foi medido (só leitura)

- O remoto é o repositório do Nycode pré-migração, arquivado (`gh repo view`: `isArchived: true`). O HEAD é `4e38f41`, o mesmo da D-32 e
  da D-57.
- Há 353 entradas no `git status`: 237 modificadas, 112 novas, 3 apagadas e 1 adicionada. O `git diff --stat` dá 240 arquivos,
  com +12 393 e −6 702 linhas, concentradas em `claude-home/patches` (52), `claude-home/bin` (37),
  `extensions/ui-visual` (33) e `extensions/claude-compat` (28).
- Nenhum arquivo alterado foi editado depois de 2026-11-22; o mais novo é de 2026-11-20 18:22. A foto da D-57
  (`/tmp/pi-harness-snap-20261122`, tirada em 2026-11-22) cobre portanto todo o trabalho sem commit. Essa foto já não
  existe em `/tmp`, e o arquivo abaixo a substitui.
- [F-onda9-triagem](../migration/nycode-core/anexos/F-onda9-triagem.md) decidiu cada grupo da onda 9: 33 estão
  "feito" e os demais têm "fora" com o motivo (D-10, D-32, D-56, D-59, `bash-main-guard`).
- O checkout continua **vivo** para o binário `pi` antigo: `~/.local/bin/pi` aponta para `~/code/pi-harness/bin/pi`, e
  423 symlinks em `~/.pi/agent` apontam para dentro dele. Há também uma `stash` (`runclock-rejeitado`), ramos locais
  sem merge e um worktree criado nesta sessão (`bench-0ed4943`), que o braço `nycode-pi160`
  usa.

## Decisão

Ele está obsoleto como fonte da migração: todo o trabalho chegou ao core ou ficou fora com motivo registrado. Mas
**não** está obsoleto como instalação: o `pi` antigo e o braço Nycode pré-migração do benchmark ainda dependem dele.

Para arquivar sem apagar nada e sem quebrar o `pi`, o diretório fica onde está e o estado foi guardado fora dele:

| Arquivo | Conteúdo |
|---|---|
| `~/archive/pi-harness-2026-11-24.tar.zst` | o diretório inteiro, com `.git`, a `stash` e os ramos (52,8 MB, 8 254 entradas) |
| `~/archive/pi-harness-2026-11-24.tar.zst.sha256` | o hash do arquivo acima |
| `~/archive/pi-harness-2026-11-24.uncommitted.diff` | `git diff` das mudanças sem commit (27 699 linhas) |
| `~/archive/pi-harness-2026-11-24.status.txt` | `git status -s` no momento do arquivo |

Remover o checkout ou desfazer os symlinks de `~/.pi/agent` é decisão do dono, e só faz sentido depois de aposentar o
`pi` antigo e os braços Nycode pré-migração/`nycode-pi160` do benchmark. Até lá, nada é apagado.
