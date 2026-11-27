# Fontes, buscas e lacunas

Data: 2026-11-27. Fonte primária de tudo que vira achado: o código e as docs do clone
`~/source/opencode-ref` (tag `v2.4.2`, SHA `fc31a485317970bcf6be7b431a9830aaef875731`, commit "release: v2.4.2",
2026-11-25 23:52 UTC) e o nycode em `00fed2ae615016b328ebfb48bfaa49814bf1dbc4`. As páginas web só serviram para
orientar a leitura; cada afirmação usada foi conferida no clone.

## Obtenção do código

```bash
git ls-remote --tags https://github.com/anomalyco/opencode.git   # última tag estável v2.x: v2.4.2
git clone --depth 1 --branch v2.4.2 https://github.com/anomalyco/opencode.git ~/source/opencode-ref
```

Nada do clone foi instalado ou executado (sem `bun install`, sem scripts). Licença: `LICENSE` (MIT) na raiz do clone.

## Vetting da config de agente do clone (`presente-de-grego`)

`python3 ~/.nycode/agent/skills/presente-de-grego/scripts/grego.py ~/source/opencode-ref`:

| Achado do scanner | Decisão |
|---|---|
| HIGH `npm-lifecycle-script` `package.json` (`postinstall`: `bun run --cwd packages/core fix-node-pty`; `prepare`: `husky`) | Irrelevante: nada foi instalado. |
| HIGH `concealment` `packages/plugins/figma/skills/figma-use-motion/SKILL.md:17` ("Bail out fast on that error...") | Falso positivo: instrução legítima de não repetir chamada falha. |
| MEDIUM `non-registry-dependency` `packages/gui-plugins/package.json` (`ghostty-web` do GitHub, commit fixo) | Irrelevante: nada foi instalado. |
| MEDIUM `pi-extension-code` `services/site/src/routes/extensions/{lane,ssh,wsl}.ts` | Falso positivo de caminho (rotas do site, não extensões de harness). |

Leitura manual: `.opencode/opencode.jsonc` (sem provider, MCP ou permissão; desliga a tool `github-pr-search`),
`.opencode/tool/github-pr-search.ts` (usa `GITHUB_TOKEN` contra `api.github.com`; só roda dentro do OpenCode),
`.opencode/{agent,command,skills,themes,glossary}` (markdown/JSON), `AGENTS.md` da raiz (regras de dev do OpenCode).
Nenhum arquivo com caracteres de largura zero (`grep -P '[\x{200B}-\x{200F}\x{2060}\x{FEFF}]'` vazio). O clone nunca foi
aberto como projeto em nycode nem em OpenCode; foi lido como dado a partir do worktree do nycode.

## Buscas web

| Provedor | Consulta | Uso |
|---|---|---|
| Perplexity (`perplexity_search`, recência 1 mês) | "OpenCode (anomalyco/opencode) 2.x release changelog: what changed in v2.0 through v2.4.2 (agents, subagents, permissions, compaction, snapshots undo redo, /goal command PR #59437, plugins, MCP OAuth, server API, Code Mode, LSP removal)?" | Mapa de versões e páginas de docs |
| Exa (`web_search_exa`, independente) | "OpenCode v2 release notes anomalyco opencode goal command code mode LSP removed" | Conferência cruzada e conteúdo das páginas |

## URLs e status

`verificado` = conteúdo lido (Exa devolveu o texto da página) **e** o mesmo fato está no clone no local indicado.

| URL | Fato usado | Status | Conferência local |
|---|---|---|---|
| <https://opencode.ai/changelog/v2.2.1> | `/goal` com pause/resume/clear, PR #59437 | verificado | `CHANGELOG.md:1064,1083,1104` |
| <https://github.com/anomalyco/opencode/blob/dev/CHANGELOG.md> | notas 2.x (#65788, #62176, #64341) | verificado | `CHANGELOG.md:107,356,599` |
| <https://opencode.ai/docs/migrate-v1/> | V2 aceita `lsp` mas não roda servidores | verificado | `services/site/src/docs/content/migrate-v1.mdx:455` |
| <https://anoma.ly/notes/opencode-2-0/> | 2.0: Code Mode, subagentes e shell em background | verificado (texto via Exa) | `packages/core/src/tool/plugin/subagent.ts:51-57`, `shell.ts:71-74` |
| <https://opencode.ai/docs/compaction/> | `keep.tokens` 15000, background | verificado | `compaction.mdx:13,35,87-88,129` |
| <https://opencode.ai/docs/permissions/> | last-match, padrão ask | verificado | `permissions.mdx:25`, `agents.mdx:267` |
| <https://opencode.ai/docs/snapshots/> | `/undo`, `/redo` | verificado | `snapshots.mdx:11-33` |
| <https://opencode.ai/docs/mcp-servers/> | OAuth padrão em remotos | verificado | `mcp-servers.mdx:3,23,159` |
| <https://opencode.ai/changelog/v2.4.2> | Esc devolve mensagem; Always allow por site | verificado | `CHANGELOG.md:11,15` |
| <https://leanopstech.com/blog/opencode-v2-lsp/> | opinião: LSP substituído por comando de checagem | secundária, não usada como evidência | o motivo real está nos TODOs do código (`rejeitados.md` R14) |
| <https://www.turboai.dev/blog/opencode-2-versions>, <https://qcode.cc/en/opencode-2-1-breaking-changes>, <https://terminalblog.com/...>, reddit r/opencode | resumos de terceiros | não usadas | — |

## Medições

Instrumento: `tiktoken` `o200k_base` num venv descartável em `/tmp/tokvenv` (fora do repositório). É o tokenizer da
OpenAI; o da Anthropic difere em poucos por cento, então os números servem para comparar os dois lados, não para cobrança
exata. Textos medidos:

- OpenCode: arquivos `.txt` de prompt lidos como estão; prompt base renderizado substituindo `${OPENCODE_TOOL_GUIDANCE}`
  pelas 4 linhas de `packages/core/src/session/system-prompt.ts:9-28` + `anthropic.txt`; payload das tools reconstruído
  verbatim do código (`read.ts:22-44`, `edit.ts:23-34,283`, `write.ts:20-25,57-58`, `shell.ts:45-75`) no mesmo formato
  JSON `{name, description, input_schema}`. Não foi possível executar o OpenCode, então é reconstrução textual.
- nycode: `buildSystemPrompt` e `createAllToolDefinitions` executados pelo próprio código do nycode (checkout principal,
  arquivos idênticos ao HEAD `00fed2ae`, conferido com `git diff --quiet HEAD -- <arquivos>`).

## Lacunas

- Execução: nenhum número vem de execução do OpenCode; custos dos achados B são estimativas a confirmar no eval.
- Esc retira mensagem (achado 03): o código do core que remove a mensagem não foi localizado; evidência = changelog +
  `packages/tui/src/prompt/restore.ts`.
- MCP com URL com query string (#66036): não verificado no nycode.
- Leitura parcial: ver `README.md`, "O que não foi lido".
- Lanes de subagentes (4 `code-mapper` em paralelo) falharam por cota do provedor (`Devin quota exceeded ... reset at
  06:21 UTC`); toda a leitura foi feita na sessão principal.

## Censo mecânico (cobertura de toda a codebase)

- `/tmp/oc-census.py` sobre `git ls-files` de `fc31a485`: `files=8809 read=76.7MB errors=0`.
- Extraídos 113 plugins, 64 tools, 10 namespaces, 12 hooks, 1 mensagem sintética, 122 rotas HTTP e 161 flags.
- Itens não citados antes foram lidos por inteiro (18 arquivos, ~4,5 mil linhas) e triados em `censo.md`: 2 achados
  novos (19, 20), 10 rejeitados novos (R27-R36), 1 correção (achado 18: no nycode os runs em background seguem para o
  fork).
- Lacuna remanescente: lógica sem registro de feature (helpers, componentes de UI) em `cli-rs`, `app`, `gui-plugins`,
  `desktop`, `tui` e handlers do `server`. As 161 flags `OPENCODE_*` não foram triadas uma a uma.
