# 19. Prompts MCP como slash commands

Classe: **A**. Prioridade: **P2**.

## O que o OpenCode faz

`packages/core/src/plugin/command.ts:55-83` registra cada prompt MCP (`prompts/list`) como comando
`<servidor>:<prompt>` (`mcpCommandName`, `:104`). Ao invocar, separa os argumentos digitados, chama `mcp.prompt(...)`
(`prompts/get`, `:62`) e envia o texto das mensagens devolvidas como prompt do usuário. `:18` reassina
`Mcp.PromptsChanged` e recarrega a lista quando o servidor muda.

## Como o nycode faz

Não faz: `rg -n 'prompts/(list|get)' packages -g '!**/test/**'` vazio. `packages/mcp/src/client.ts:302` implementa
`resources/list`, mas não `prompts/*`. A extensão MCP registra só o comando `/mcp`
(`packages/coding-agent/src/extensions/mcp/index.ts:1261`).

## Diferença

Prompts publicados por servidores MCP (templates do próprio servidor) ficam inacessíveis no nycode.

## Benefício

Acesso a uma primitiva da spec MCP que o usuário aciona. Nada entra no contexto até o uso.

## Custo

0 tok fixo: comandos só aparecem no autocomplete da UI e o texto vai para o contexto só quando o usuário invoca. Uma
chamada `prompts/list` por servidor na conexão. Manutenção: métodos `listPrompts`/`getPrompt` no cliente
(`packages/mcp/src/client.ts`, junto de `listAll("resources/list", ...)`) e registro de comandos na extensão.

## Riscos

Texto de prompt vem do servidor (dado não confiável) e entra como mensagem do usuário: mostrar o nome do servidor no
comando, como o OC faz, deixa a origem visível. Colisão de nomes: prefixo `<servidor>:` evita.

## Licença

MIT; padrão trivial, reescrever.

## Proposta

`packages/mcp/src/client.ts`: `listPrompts()` paginado e `getPrompt(name, args)`. `extensions/mcp/index.ts`: registrar
`<servidor>:<prompt>` para servidores com a capability `prompts`; recarregar em `notifications/prompts/list_changed`.

## Testes

Servidor MCP falso com dois prompts (um com argumentos): comandos listados, argumentos mapeados por posição, texto
enviado igual ao `prompts/get`; servidor sem capability `prompts` não registra nada.

## Plano de eval

Classe A: dispensa eval de modelo. Aceite por teste de contrato.

## Aceite

Prompts MCP invocáveis; zero mudança no contexto de sessões que não os invocam (diff do payload).

## Rollback

Remover o registro de comandos; os métodos do cliente podem ficar.
