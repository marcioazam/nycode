# Docs do harness do harness Nycode

> Estes documentos vieram de `claude-home/docs/` do harness Nycode (cópia de 2026-11-21, checkout na branch
> `feat/ui-onda9-harness` mais arquivos ainda não commitados) e foram convertidos para o Nycode na F8 (mapa em
> registro do mantenedor, decisão D-31). Critério da conversão:
>
> - Todos os documentos: caminhos internos trocados pelos do Nycode (`packages/coding-agent/resources/...`,
>   `scripts/harness/...`, `docs/harness/...`, `${NYCODE_RESOURCES}`, `~/.nycode/agent`).
> - Documentos de referência vivos (`agent-contract`, `goal`, `pi-commands`, `pi-hooks-port`, `pi-instructions`,
>   `pi-ui-sota`, `subagent-model-effort`): nome do produto `nycode` e variáveis `NYCODE_*` (D-33).
> - Registros datados (nome com data, `research/`, `third-party/`): mantêm as menções históricas ao upstream (`pi`,
>   `pi-code`, `PI_*`), pois descrevem o que foi medido e decidido na época.
>
> Descrições de patches do pi-code, do wrapper `~/.local/bin/pi` e de extensões em `~/.nycode/agent/extensions/` são
> contexto histórico do Nycode pré-migração: o comportamento equivalente vive agora no código embutido.
