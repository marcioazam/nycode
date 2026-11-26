# Processos da sessão: análise das propostas A–E (2026-11-25)

## Evidência medida antes de decidir

- `/tmp/tmux-1000` tinha 1969 sockets; nenhum respondia (`tmux -S <s> ls` falhou em todos). 1576 eram `nyd-*`, dos testes de display nativo. Os outros prefixos (`nyperf`, `nypeer`, `click`, ...) não aparecem no repositório: vieram de testes manuais de agentes.
- O tmux 3.6 não apaga o socket no `kill-server`. Prova: `tmux -L x new-session -d; tmux -L x kill-server; ls /tmp/tmux-1000/x` mostra o arquivo.
- Processos órfãos (pai `systemd --user`) deixados por sessões de agente: cinco `python3 -m http.server` e um `bash -c ... cat` preso. Somam menos de 5 MB. Os servidores HTTP foram pedidos em segundo plano.
- A árvore desta sessão (lida com o novo `/ps`) tinha 14 processos, 1052 MB residentes e 321 MB em swap. Desses, 629 MB eram do `codegraph serve` e 126 MB do swap eram do `marksman`.
- `run` inicia jobs em um grupo próprio, de propósito, "so it outlives nycode" (`extensions/run/shell.ts`). Subagentes em segundo plano sobrevivem a uma troca de sessão (`extensions/subagent/index.ts`).
- Um escopo do systemd não tem processo principal: ele vive enquanto restar algum processo dentro dele. Fonte: [systemd.scope](https://www.freedesktop.org/software/systemd/man/latest/systemd.scope.html), consultado via Perplexity e Keenable. Sair do nycode, portanto, não encerra nada sem um `stop` explícito do escopo.

## Decisões

| # | Decisão | Motivo |
|---|---------|--------|
| A | Não fazer | Parar o escopo na saída mata os jobs de `run` e os subagentes em segundo plano, que existem para sobreviver ao nycode. Sem esse `stop`, o escopo não limpa nada. A medição por sessão já sai de `/proc` (C). Builds pesados já rodam em `build.slice`. |
| B | Metade já existe; o resto fica adiado | Servidores sem uso fecham 30 s depois de conectar e as ferramentas continuam conhecidas (`UNUSED_CLOSE_MS` em `mcp/runtime/runtime.ts`). Isso está em mudança não commitada de outra sessão. Um catálogo em disco evitaria só esse pico de 30 s no início, ao custo de risco de catálogo velho. Rever depois que a outra mudança entrar. |
| C | Feito: `/ps` | Custo baixo. A primeira leitura já mostrou o maior consumidor (codegraph, 629 MB). `/ps kill <pid>` só aceita pids da árvore da sessão e nunca o próprio nycode. Ficaram de fora o alerta por teto (nenhum teto definido) e o botão na UI. |
| D | Não fazer | Os órfãos medidos são intencionais e pequenos. Matá-los na abertura da sessão contraria o `run`. Guardar PID, pgid e hora de início adiciona estado e risco de PID reutilizado sem ganho medido. |
| E | Parcial | Corrigida a causa: `native-harness.ts` põe o socket no diretório temporário que o `afterAll` apaga, e mata no `afterAll` qualquer servidor que tenha sobrado (já era o padrão de `native-cli-e2e.test.ts`). Os 1969 sockets mortos foram apagados uma vez. Não foram feitos: prazo próprio nos processos falsos (nenhum vazamento de processo medido), `globalSetup` de limpeza (desnecessário com a causa corrigida) e `trap` no `nycode-test.sh` (o script roda dentro da sessão tmux e não pode encerrá-la). |

## Verificação

- `test/harness/extensions/processos/tree.test.ts`: árvore, nome com `)` e espaços, formatação, kill limitado à sessão.
- Smoke real: árvore desta sessão lida de `/proc` (números acima).
