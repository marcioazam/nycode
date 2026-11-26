# /subagents-setup: grupos por provedor, busca e rolagem (2026-11-26)

## Problema

O modal desenhava todos os modelos de uma vez. Com centenas de modelos (só o openrouter tem ~376), o overlay cortava a
lista em 85% da altura do terminal: o cursor descia para fora da tela, sem rolagem nem barra.

## Decisão

O dono escolheu a variante 2 do mock ("Grupos + busca"), avaliada entre 5 variantes em 2026-11-26. O componente
(`packages/coding-agent/src/extensions/subagent/routing/setup-ui.ts`) também serve o `/travar-modelos`, que agora
passa título próprio.

## Contrato

- Passo 1: modelos agrupados por provedor (`provedor ─── marcados/total`); o rótulo do grupo gruda no topo da janela
  enquanto os modelos dele rolam (não gruda quando a linha seguinte já abre outro grupo).
- Janela: até 85% da altura do terminal; o cursor fica a 2 linhas das bordas. Barra de rolagem em meia célula na
  borda direita; contadores `↑ N acima` e `↓ N abaixo`.
- Teclas: ↑↓, PgUp/PgDn, Home/End e roda do mouse movem; espaço marca; enter avança ou salva.
- Busca: qualquer letra, dígito ou `./:-` filtra (também no protocolo kitty). Substring primeiro; o aproximado
  (subsequência) só entra quando nada contém o texto, porque em centenas de modelos ele casa quase tudo. Grupo sem
  resultado some; o contador do grupo segue o total do provedor. `tab` mostra só os marcados; backspace apaga;
  `ctrl+u` limpa.
- `esc`: limpa a busca primeiro; no passo 2 volta uma página e depois ao passo 1, sem perder marcações; no passo 1 sem
  busca cancela sem gravar.
- Modelo marcado mostra os níveis como trilho `off·low·med·high` (permitidos na cor do nível, demais apagados);
  estreito demais, `2/4`.
- Animação (só com tema e movimento normal): entrada "Nasce do fundo" (450 ms, `ui-visual/moldura/nasce.ts`) e o
  anel `○◔◑◕●` ao marcar (180 ms), no relógio único de `ui-visual/motion`. Sem tema (NO_COLOR, testes) o texto é puro e
  não anima.
- Textos em pt-BR, como o mock aprovado.

## Contrato anterior

Lista plana `> [x] chave`, títulos em inglês ("Subagent models: which may subagents use?", "Efforts for …"), `esc`
cancelava em qualquer passo. Os testes de `test/harness/subagent/routing/setup-ui.test.ts` foram reescritos para o
contrato novo; os casos de fluxo (marcar, passo 2, ao menos um modelo/nível, padrão de níveis) foram mantidos.
