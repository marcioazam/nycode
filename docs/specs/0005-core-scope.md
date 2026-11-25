# 0005: escopo do núcleo (harness generalista)

Estado: regra e checagem de classificação adotadas (2026-11-16). A mudança das peças `optional` para fora do contexto
do modelo é outro pull request, medido no gate (K3c), porque mexe em custo e acerto.

**Atualizado em 2026-11-24 (contrato antigo → novo).** A decisão do dono em
`docs/harness/decisoes-nucleo-harness-pessoal-2026-11-24.md` (D0: o harness continua embutido e ligado; só sai o que é
pessoal) substitui a classificação de 2026-11-16 e supera a D-51 (as 6 skills `agent-systems`, `atualizador`,
`codegraph`, `deep-search`, `perplexity-urls` e `soteiros` deixam de existir no pacote). A checagem de `core_scope.py`
continua exigindo `disable-model-invocation: true` em toda skill `optional`.

| Antes (2026-11-16) | Agora (2026-11-24) | Decisão |
|---|---|---|
| 36 skills, 17 agentes, 24 comandos | 11 skills (`pr-review`, `security-audit`, `diagnose`, `code-simplification`, `plan-workflow`, 6 `ponytail*`), 7 agentes (`Explore`, `Plan`, `general-purpose`, `code-reviewer`, `plan-reviewer`, `gate-runner`, `security-reviewer`), 13 comandos | C3, C4–C6, C8 |
| Tipo `hook`: `guard.py`, `permissions`, `dispatch`, `claims`, `diag.py`, `impeccable_gate.sh` | Nenhum hook embutido; `permissions.engine` é só `native`; a parte genérica do `dispatch` virou o hook interno `core-notes` em TypeScript | C9 |
| Extensões `avisos`, `sound-notify`, `notify` | Uma extensão `notify` (`/notifications`, apelido `/avisos`) | B9 |
| `/puxar` (`import-claude-session`), `nycode migrate from-pi` | Removidos | B11, D2, D3 |
| `/review-pr`, `/ralph-help`, `/vim`, `/mobile`, `/stickers`, `/upgrade` | Removidos (`/vim` vira o setting `editorMode`; os três últimos viram `unsupported` na tabela de compatibilidade) | C8, C11, B12 |
| Contrato embutido de 11,6 KB (política do dono) | ~1 KB de proteção genérica; a política do dono vive em `~/.nycode/agent/AGENTS.md` | C1, C2 |
| Codegraph e cofre de conhecimento no núcleo | Fora do núcleo; só via `mcp.json` e hooks do usuário | A1, A2 |

## Pergunta

O harness Nycode deve trazer só peças generalistas, como um harness "vanilla", e deixar as de domínio, de serviço ou de gosto
pessoal como opção?

## Evidência (fontes primárias lidas em 2026-11-16)

O que outros harnesses trazem de fábrica:

| Harness | Embutido | Opcional |
|---|---|---|
| Claude Code | Subagentes Explore, Plan e general-purpose; poucas skills gerais (`/doctor`, `/code-review`, `/batch`, `/debug`, `/loop`, `/claude-api`), desligáveis com `disableBundledSkills` ([sub-agents](https://code.claude.com/docs/en/sub-agents), [skills](https://code.claude.com/docs/en/skills)) | Plugins do marketplace oficial e de terceiros ([plugins](https://code.claude.com/docs/en/plugins)) |
| Codex | Só skills de meta, `skill-creator` e `skill-installer`, desligáveis por projeto; a lista de skills ocupa no máximo 2% da janela ou 8.000 caracteres ([build-skills](https://developers.openai.com/codex/build-skills)) | O resto, via `$skill-installer` ou plugins |
| OpenCode | Agentes Build e Plan; subagentes General e Explore ([agents](https://opencode.ai/docs/agents/)) | Plugins e skills do usuário |
| pi | "ships with powerful defaults but skips features like sub-agents and plan mode" ([README](https://github.com/earendil-works/pi)) | Pacotes e extensões |
| Factory Droid | Droids `worker` e `explorer` ([subagents](https://docs.factory.com/harness/subagents)) | Marketplace de plugins |
| Cursor | Subagentes de contexto (Explore, Browser) e um conjunto pequeno de skills gerais ([skills](https://cursor.com/docs/skills), [subagents](https://cursor.com/docs/subagents)) | Plugins revisados à mão |
| Gemini CLI | Subagentes `codebase_investigator`, `cli_help` e `generalist` ([subagents](https://geminicli.com/docs/core/subagents/)) | Extensões com skills, MCP, hooks e comandos |
| DeepSeek Harness | Arquitetura "everything is a plugin", em developer preview; o README não lista o que vem embutido ([repo](https://github.com/deepseek-ai/deepseek-harness)) | Plugins |

Nenhuma dessas fontes escreve um critério de "núcleo ou opcional". O critério se lê no que cada uma embute. Todas
trazem ferramentas básicas, de 2 a 4 subagentes genéricos e, no máximo, um punhado de skills gerais ou de meta. Domínio,
serviço externo e preferência ficam em plugin. Ninguém vem totalmente "cru": até o pi traz bons padrões, e o mais enxuto
corta também subagentes e plano.

Custo de peças a mais no contexto do modelo:

- Com 1.000 skills irrelevantes, o recall de skills carregadas cai de 73,6% para 27,4% e o "não carregou nenhuma" sobe
  de 9,3% para 51,6% ([arXiv 2610.18522](https://arxiv.org/abs/2610.18522)).
- Skills focadas (no máximo três módulos) superam pacotes grandes ou exaustivos ([SkillsBench, arXiv 2602.12670](https://arxiv.org/abs/2602.12670)).
- Carregar todas as definições custa caro: 58 ferramentas consomem cerca de 55 mil tokens. Com busca de ferramentas, a
  escolha certa sobe de 49% para 74% no Opus 4. As falhas mais comuns são ferramenta errada e nomes parecidos
  ([Anthropic, advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use)).
- No harness Nycode: 26 skills visíveis custam cerca de 3,5 mil tokens por turno, e houve 0 leituras de `SKILL.md` em 265 sessões
  de benchmark (K3c, registro do follow-up A).

## Conclusão

Sim, núcleo generalista, mas não "virgem". O harness Nycode segue o padrão comum: ferramentas e subagentes genéricos e um
conjunto pequeno de skills de engenharia que valem para qualquer linguagem e projeto. Ficam fora do núcleo as peças de
domínio, as que exigem um serviço, conta ou MCP específico e as de gosto pessoal. Essas peças ficam como opção ou nem
entram no repositório. Uma skill de marketing não entra nem como opção.

## Regra

1. Uma peça entra no núcleo (`core`) quando cumpre tudo isto:
   - serve ao trabalho de programação em qualquer linguagem, tipo de projeto e domínio;
   - funciona só com as ferramentas embarcadas e o provedor do modelo, sem MCP, SaaS, conta ou ambiente pessoal
     específico;
   - não é preferência pessoal;
   - passou pela regra de custo × benefício contra Claude Code e pi puro.
2. Peça só de interface (`ui`) não entra no contexto do modelo e só muda o terminal. Pode vir ligada, como o TUI do
   próprio pi.
3. O resto é `optional`: fica no repositório, mas fora do contexto do modelo por padrão. Skill oculta com
   `disable-model-invocation: true`; agente, extensão, hook, comando ou plugin só com opt-in. As skills do `ponytail*` e a `plan-workflow` são `core` e ocultas (só `/skill:<nome>` ou comando).
4. Código de diagnóstico ou temporário é `remove` e sai no próximo pull request que tocar a área.
5. Peça de domínio estreito (marketing, design visual, uma nuvem ou SaaS específicos) não entra no repositório.
6. O orçamento do que o modelo vê sempre continua no gate `instruction-budget`, que não deixa o catálogo crescer sem
   o rótulo `budget-increase`.
7. Toda peça embarcada aparece na tabela abaixo, com classe e motivo. `scripts/ci/lint/core_scope.py` falha quando falta uma
   peça, quando sobra uma linha de peça que não existe ou quando a classe é desconhecida.

## Classificação (2026-11-16)

Tipos: `skill` (`packages/coding-agent/resources/skills/<nome>/`), `agent` (`packages/coding-agent/resources/agents/<nome>.md`), `extension`
(`packages/coding-agent/src/extensions/<nome>/`), `hook` (`packages/coding-agent/resources/hooks/<nome>`, fora testes e `fixtures`; o pacote não embute nenhum desde 2026-11-24),
`command` (`packages/coding-agent/resources/commands/<nome>.md`) e `plugin` (`claude-home/plugins/<nome>/` no harness Nycode; no Nycode a linha de status
vai para `packages/coding-agent/resources/statusline/`). Os caminhos são os de destino do mapa de migração (`docs/migration/nycode-core/`); as peças
chegam por fase e o `core_scope.py` é convertido em F3.

<!-- core-scope:begin -->
| Tipo | Nome | Classe | Motivo |
|---|---|---|---|
| skill | code-simplification | core | Refatoração geral |
| skill | diagnose | core | Depuração geral |
| skill | plan-workflow | core | Modo plano, oculta |
| skill | ponytail | core | Regras do ponytail, ligadas por padrão (D-54); oculta |
| skill | ponytail-audit | core | Auditoria do ponytail (D-54); oculta |
| skill | ponytail-debt | core | Dívida do ponytail (D-54); oculta |
| skill | ponytail-gain | core | Ganho do ponytail (D-54); oculta |
| skill | ponytail-help | core | Ajuda do ponytail (D-54); oculta |
| skill | ponytail-review | core | Revisão do ponytail (D-54); oculta |
| skill | pr-review | core | Revisão de PR geral |
| skill | security-audit | core | Auditoria de segurança geral |
| agent | Explore | core | Leitura de código, padrão do mercado |
| agent | Plan | core | Planejamento, padrão do mercado |
| agent | general-purpose | core | Agente geral, padrão do mercado |
| agent | code-reviewer | core | Revisão de diff, só leitura, contexto limpo (C3) |
| agent | security-reviewer | core | Revisão de segurança (C3, harness embutido) |
| agent | gate-runner | core | Roda o gate uma vez; chamado pelo `completion-gate` (B2) |
| agent | plan-reviewer | core | Fecha plano aprovado; chamado pelo `plan-gate` (B3) |
| extension | auto-resume | core | Retoma após erro transitório do provedor |
| extension | claude-rules | core | Regras do Claude Code em .claude/rules |
| extension | chat-margin | core | Margem do texto nos blocos com fundo do chat (D-56) |
| extension | claude-compat | core | Compatibilidade com o Claude Code: `/clear`, `/reset`, `/help`, `/skills`, `/claude-help`, comandos locais, serviços públicos e a matriz (D-56, parte 2) |
| extension | bash-main-guard | core | Na sessão principal interativa o bash não prende o turno: padrão de 120 s, teto de 600 s, sleep longo e laço de consulta recusados, `run wait` limitado a 30 s (D-57) (D-56) |
| extension | comandos | core | Paleta do `/` em pt-BR, painel `?` e `/atalhos` (ver, buscar e mudar atalhos); a ponte `__nycodeHarnessComandos` serve o editor (D-56) |
| extension | contexto | core | Limite de compactação por sessão (`/contexto 400k`, restaurado ao retomar) e resumo anterior condensado quando passa de `NYCODE_COMPACT_SUMMARY_MAX` caracteres (D-57, D-58) (D-56) |
| extension | diagnostico | core | Registro de erros e avisos internos, trilha de spans (OTel) e `/doctor`; `/diagnostico` ou ctrl+e abre o modal e o rodapé mostra só a contagem (D-56) |
| extension | code-blocks | core | Blocos de código sem cerca e sem borda, com fundo tingido pela cor da linguagem, realce por highlight.js e botão de copiar clicável (fullscreen) (D-56) |
| extension | image-open | core | Clicar numa imagem do transcript a abre no visualizador do sistema (`/imagem` abre a última) e a imagem de resultado de tool ganha o fundo da tool (D-56) |
| extension | hook-msgs | core | Mensagens de hook, de gate, de subagente em segundo plano e de fim de run no ritmo das tools, com o fundo do estado (D-56) |
| extension | commands | core | Comandos de barra do Claude Code |
| extension | completion-gate | core | Verificação antes de encerrar |
| extension | context-imports | core | Imports @ do CLAUDE.md |
| extension | context-usage | ui | Uso de contexto |
| extension | dev-commands | ui | `/copy-code` e `/keybindings` |
| extension | docs-pointer | core | Prompt menor |
| extension | effort-sandwich | optional | Raciocínio high só no 1º turno do `pi -p` de topo (opt-in, spec 0009) |
| extension | env-settings | core | Variáveis de ambiente do settings do Claude |
| extension | folha | core | Confirmações seguras em português, saídas em folha e `/painel` (D-56) |
| extension | footer | ui | Rodapé só com os status das extensões |
| extension | git-checkpoint | core | Checkpoints git e `/rewind` |
| extension | goal | core | Objetivo de sessão (/goal) |
| extension | headless-lean | core | Custo sem interface |
| extension | hooks | core | Hooks no formato do Claude Code |
| extension | init | core | `/init` |
| extension | lsp | core | Diagnósticos e navegação por servidor de linguagem, para qualquer linguagem |
| extension | memory | core | Memória do projeto |
| extension | monitor | core | Ferramenta `monitor` do Claude Code: cada linha de um comando em segundo plano volta ao modelo como evento |
| extension | notify | core | Dono único dos sinais de fim de turno: notificação desktop, som, progresso na aba do terminal e o painel `/notifications` (apelido `/avisos`); som e notificação desligam por `notify.sound` e `notify.desktop` (B9) |
| extension | output-styles | core | Estilos de saída |
| extension | plan-gate | core | Plano aprovado vai ao fim |
| extension | plan-mode | core | Modo de plano |
| extension | ponytail | core | Regras de código mínimo no prompt, ligadas por padrão (D-54) |
| extension | prefix-cache-1h | core | Cache do prefixo |
| extension | question | core | Pergunta ao usuário com opções |
| extension | run | core | Processos em segundo plano e a seção de execução |
| extension | session-title | ui | Título da sessão |
| extension | settings-flags | core | Flags de settings do Claude |
| extension | skills-compat | core | Skills no formato do Claude Code |
| extension | status-line | ui | Linha de status |
| extension | sticky-prompt | ui | Última mensagem fixa |
| extension | subagent | core | Subagentes, frota e times |
| extension | syntax-check | core | Erro de sintaxe após edição |
| extension | thinking | ui | Nível de raciocínio |
| extension | todo | core | Ferramenta de lista de tarefas |
| extension | travar-modelos | core | Trava global de modelos e esforços (D-56) |
| extension | ui | ui | Editor, acessibilidade, `/diff` |
| extension | ui-visual | ui | Cabeçalho e ícones |
| extension | up-dequeue | ui | Fila de mensagens em português (Variante C: editar, excluir, enviar agora); a seta para cima fica só com o histórico |
| extension | web | core | `web_fetch` ligado por padrão como no harness Nycode; `web_search` só com `NYCODE_KEEP_WEB_SEARCH=1` (D-52; era `optional`, desligada, e o `no-web-search` do harness Nycode, que a 03 listava como `core`, foi removido pela D-10 e substituído por essa regra) |
| command | cancel-ralph | core | Laço de prompt (par do `/loop` do Claude Code) |
| command | claude-hud-configure | optional | Plugin `claude-hud` |
| command | claude-hud-setup | optional | Plugin `claude-hud` |
| command | code-review | core | Revisão de PR com a skill `pr-review` e o agente `code-reviewer` (C8) |
| command | ralph-loop | core | Laço de prompt |
| command | revise-claude-md | core | Aprendizado da sessão vira regra |
| command | batch | core | Execução em lotes de lanes paralelas |
| command | run | core | Sobe e dirige o app real para ver a mudança funcionando |
| command | run-skill-generator | core | Gera a skill por projeto que ensina /run e /verify |
| command | statusline | core | Configura a status line (HUD) |
| command | team-onboarding | core | Guia de uso da equipe a partir das sessões locais |
| command | update-config | core | Roteia mudanças de configuração para o dono real |
| command | verify | core | Verifica a mudança no app real |
| plugin | claude-hud | optional | Barra de status de terceiro |
<!-- core-scope:end -->

## Próximo passo (pull request medido, #89)

Tirar do contexto do modelo as skills e agentes `optional` e pôr extensões, hooks, comandos e plugin `optional` atrás de
opt-in. Remover `cache-prefix-probe`. A checagem passa a exigir `disable-model-invocation: true` nas skills `optional` (hoje nenhuma).
A medição é a do K3c: custo por tarefa no gate, contra o `main`, sem perda de acerto.
