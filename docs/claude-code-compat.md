<!-- markdownlint-disable MD037 -->

# Compatibilidade com o Claude Code

Matriz de comandos e atalhos do Claude Code mapeados para o nycode (gerada por `renderMatrix()` em
`packages/coding-agent/src/extensions/claude-compat/matrix.ts`; regere ao mudar a matriz).

## Matriz completa

### Comandos

| Claude | Aliases | Tipo | Status | nycode |
|---|---|---|---|---|
| /add-dir | – | B | partial | /add-dir registrado (commands/session/adddir.ts). Implementado localmente; verificação integrada pendente (gate); semântica pode diferir do Claude. |
| /advisor | – | B | partial | /advisor registrado (commands/agents/advisor.ts). Implementado localmente; verificação integrada pendente (gate); semântica pode diferir do Claude. |
| /agents | – | B | partial | /agents do nycode (outro formato de agentes) |
| /artifact-capabilities | – | S | unsupported | sem artefatos |
| /artifact-diagramming | – | S | unsupported | sem artefatos; skill diagram-design cobre diagramas |
| /artifacts | – | B | unsupported | sem artefatos |
| /auto-mode-setup | – | B | unsupported | sem auto mode do Claude |
| /autocompact | – | B | partial | compact-at-400k.ts automático; /compact manual |
| /autofix-pr | – | B | unsupported | nuvem do Claude |
| /background | /bg | B | partial | /background e /bg (background/): condicional, só em sessão iniciada por um supervisor tmux privado (opt-in; fora do core, D-56): desanexa o único cliente sem abortar; [prompt] é enfileirado uma vez como followUp literal. Fora do transporte, subagente ou sem UI recusa com instrução. Não cria sessão em background separada nem fork |
| /batch | – | S | partial | workflow de prompt do usuário (claude-home/commands/batch.md, só pelo usuário; não é função nativa nem usa modelo automaticamente). Implementado localmente; verificação integrada pendente (gate); semântica pode diferir do Claude. |
| /branch | – | B | partial | /branch → /clone; /branch <nome> → /clone-as <nome>. NÃO é o /fork do Claude |
| /btw | – | B | exact | /btw (extensions/ui/btw.ts) |
| /bug | /share | B | unsupported | O /bug e /share do Claude enviam feedback/bug report; NÃO são o /bug (relatório aos devs do nycode) nem o /share (upload da sessão) do nycode, que mantêm a semântica do nycode |
| /cd | – | B | partial | extensions/claude-compat/directory + patch session-cwd do core (ainda não portados): muda o cwd da mesma sessão/arquivo; sem o patch recusa explicitamente; verificação integrada pendente (gate) |
| /chrome | – | B | unsupported | sem integração Claude in Chrome |
| /claude-api | – | S | unsupported | sem skill empacotada |
| /claude-in-chrome | – | S | unsupported | sem skill empacotada |
| /clear | /reset /new | B | exact | /clear e /reset: sessão nova como /new, sem turno de modelo (extensions/claude-compat); /clear <nome> rotula a sessão anterior; /new é nativo |
| /code-review | /review | S | partial | comando de usuário existente com prompt próprio, não a skill do Claude |
| /color | – | B | partial | /color registrado (interface/color.ts). Implementado localmente; verificação integrada pendente (gate); semântica pode diferir do Claude. |
| /compact | – | B | exact | /compact [instruções] nativo |
| /config | /settings | B | alias | /config e /settings → /settings (editor TUI); /config chave=valor → /config-set |
| /context | – | B | exact | /context do nycode |
| /copy | – | B | partial | /copy nativo copia a última resposta; /copy N\|text\|blocks → /copy-pick (veja /copy-code) |
| /cost | /usage | B | alias | /cost → /session (tokens e custo da sessão) |
| /dataviz | – | S | unsupported | sem skill empacotada |
| /debug | – | S | partial | /debug nativo grava nycode-debug.log (outra função) |
| /deep-research | – | W | unsupported | skill deep-search (pedido por /skill:deep-search) |
| /design | – | S | unsupported | sem skill empacotada; skills de design locais |
| /design consent | – | B | unsupported | subcomando de /design; sem design cloud |
| /design revoke | – | B | unsupported | subcomando de /design; sem design cloud |
| /design-login | – | B | unsupported | sem design cloud |
| /design-sync | – | S | unsupported | sem design cloud |
| /desktop | /app | B | unsupported | sem app desktop |
| /diff | – | B | exact | /diff (extensions/ui/diff.ts) |
| /doctor | /checkup | S | unsupported | sem /doctor; checks locais em claude-home/bin/checks |
| /effort | – | B | partial | /effort status\|auto\|off…max (commands/settings/config.ts): esforço de raciocínio da sessão nos níveis do nycode |
| /exit | /quit | B | alias | /quit nativo; /exit → /quit |
| /export | – | B | partial | /export do nycode gera HTML/JSONL da sessão; o do Claude grava texto simples |
| /fast | – | B | unsupported | sem modo rápido |
| /feedback | – | B | unsupported | sem canal de feedback; /bug do nycode é relatório aos devs do nycode |
| /fewer-permission-prompts | – | S | unsupported | sem skill; sem alteração de permissões |
| /focus | – | B | partial | /focus registrado (interface/focus.ts). Implementado localmente; verificação integrada pendente (gate); semântica pode diferir do Claude. |
| /fork | – | B | partial | O /fork do Claude cria cópia em BACKGROUND; o /fork do nycode cria sessão a partir de mensagem anterior. Nenhum alias: use /fork do nycode ou /branch |
| /goal | – | B | exact | /goal do nycode |
| /heapdump | – | B | partial | /heapdump grava snapshot local com confirmação (commands/session/heapdump.ts). Implementado localmente; verificação integrada pendente (gate); semântica pode diferir do Claude. |
| /help | – | B | partial | /help (extensions/claude-compat): ajuda de compatibilidade, comandos carregados e /hotkeys; o painel nativo é /hotkeys |
| /hooks | – | B | exact | /hooks do nycode |
| /ide | – | B | unsupported | sem integração de IDE |
| /import | – | B | partial | /import do nycode lê sessão JSONL do nycode, não de outros agentes; semântica mantida |
| /init | – | B | exact | /init do nycode |
| /insights | – | B | partial | /insights: estatísticas locais da sessão atual, não o relatório do Claude. Implementado localmente; verificação integrada pendente (gate); semântica pode diferir do Claude. |
| /install-github-app | – | B | unsupported | serviço do Claude |
| /install-slack-app | – | B | unsupported | serviço do Claude |
| /keybindings | – | B | exact | /keybindings (dev-commands) edita ~/.nycode/agent/keybindings.json |
| /list-agents | /peers | B | partial | /list-agents e /peers listam agentes definidos e subagentes em execução. Implementado localmente; verificação integrada pendente (gate); semântica pode diferir do Claude. |
| /login | – | B | partial | /login do nycode (provedores do nycode) |
| /logout | – | B | partial | /logout do nycode |
| /loop | /proactive | S | partial | /loop registrado (commands/agents/loop.ts). Implementado localmente; verificação integrada pendente (gate); semântica pode diferir do Claude. |
| /mcp | – | B | exact | /mcp nativo |
| /memory | – | B | exact | /memory do nycode |
| /mobile | /ios /android | B | partial | /mobile, /ios e /android mostram o QR/URL público do app (services/public.ts). Implementado localmente; verificação integrada pendente (gate); semântica pode diferir do Claude. |
| /model | – | B | exact | /model nativo; Alt+P abre o seletor |
| /output-style | – | B | exact | /output-style do nycode |
| /passes | – | B | unsupported | serviço do Claude |
| /permissions | /allowed-tools | B | partial | modos locais Ask/Auto(acceptEdits)/Plan e bypass independente (bypass on/off) pelo controlador e guard.py; nenhum atalho desliga salvaguardas; verificação integrada pendente (gate) |
| /plan | – | B | exact | /plan do nycode (ctrl+shift+p) |
| /plugin | – | B | partial | /plugin e /plugins listam/removem pacotes do nycode (settings.packages), não plugins do Claude. Implementado localmente; verificação integrada pendente (gate); semântica pode diferir do Claude. |
| /plugin-authoring | – | S | unsupported | sem skill empacotada |
| /powerup | – | B | unsupported | sem lições interativas |
| /pr-comments | – | R | removed | removido no Claude |
| /privacy-settings | – | B | unsupported | serviço do Claude |
| /radio | – | B | unsupported | sem rádio |
| /rate-limit-options | – | B | unsupported | sem limites de plano |
| /recap | – | B | partial | /recap: resumo determinístico dos últimos pedidos, sem modelo. Implementado localmente; verificação integrada pendente (gate); semântica pode diferir do Claude. |
| /release-notes | – | B | alias | /release-notes → /changelog (changelog do nycode, não do Claude Code) |
| /reload-plugins | – | B | alias | /reload-plugins → /reload (recarrega TODOS os recursos, não só plugins) |
| /reload-skills | – | B | alias | /reload-skills → /reload (recarrega TODOS os recursos, não só skills) |
| /remote-control | /rc | B | unsupported | sem controle remoto |
| /remote-env | – | B | unsupported | nuvem do Claude |
| /rename | – | B | exact | /rename (alias de /name) |
| /restart | /update | B | partial | /restart sob supervisor (claude-home/bin/lifecycle/supervisor.sh), mesma sessão; /update sem auto-update; verificação integrada pendente (gate) |
| /resume | /continue | B | exact | /resume nativo; /continue → /resume (sem argumentos) |
| /rewind | /checkpoint /undo | B | exact | /rewind do nycode (checkpoints de código e conversa); /checkpoint e /undo → /rewind |
| /run | – | S | partial | workflow de prompt do usuário (claude-home/commands/run.md, só pelo usuário; não é função nativa nem usa modelo automaticamente). Implementado localmente; verificação integrada pendente (gate); semântica pode diferir do Claude. |
| /run-skill-generator | – | S | partial | workflow de prompt do usuário (claude-home/commands/run-skill-generator.md, só pelo usuário; não é função nativa nem usa modelo automaticamente). Implementado localmente; verificação integrada pendente (gate); semântica pode diferir do Claude. |
| /sandbox | – | B | unsupported | sem sandbox do Claude |
| /schedule | /routines | B | unsupported | nuvem do Claude |
| /scroll-speed | – | B | partial | /scroll-speed registrado (commands/settings/config.ts). Implementado localmente; verificação integrada pendente (gate); semântica pode diferir do Claude. |
| /security-review | – | B | partial | skill security-audit (pedido explícito) |
| /setup-bedrock | – | B | unsupported | provedores via /login e models.json |
| /setup-vertex | – | B | unsupported | provedores via /login e models.json |
| /simplify | – | S | partial | skill code-simplification (/skill:code-simplification) |
| /skill-doctor | – | S | unsupported | sem skill empacotada |
| /skills | – | B | partial | /skills (extensions/claude-compat) lista as skills carregadas; sem painel interativo |
| /slides | – | S | unsupported | sem skill empacotada |
| /stats | – | B | alias | /stats → /session (só a sessão atual) |
| /status | – | B | alias | /status → /session (sem conta/conectividade) |
| /statusline | – | S | partial | workflow de prompt do usuário (claude-home/commands/statusline.md, só pelo usuário; não é função nativa nem usa modelo automaticamente). Implementado localmente; verificação integrada pendente (gate); semântica pode diferir do Claude. |
| /stickers | – | B | partial | /stickers público (services/public.ts). Implementado localmente; verificação integrada pendente (gate); semântica pode diferir do Claude. |
| /stop | – | B | partial | /stop registrado (commands/agents/listing.ts). Implementado localmente; verificação integrada pendente (gate); semântica pode diferir do Claude. |
| /subtask | – | B | unsupported | sem subtask |
| /tasks | /bashes | B | exact | /tasks do nycode; /bashes → /tasks |
| /team-onboarding | – | S | partial | workflow de prompt do usuário (claude-home/commands/team-onboarding.md, só pelo usuário; não é função nativa nem usa modelo automaticamente). Implementado localmente; verificação integrada pendente (gate); semântica pode diferir do Claude. |
| /teleport | /tp | B | unsupported | nuvem do Claude |
| /terminal-setup | – | B | partial | lifecycle/terminal-setup.ts grava configuração do terminal com backup .bak; verificação integrada pendente (gate) |
| /theme | – | B | alias | /theme → /settings (sem argumentos); /theme <nome> → /theme-set <nome> |
| /tui | – | B | alias | /tui → /settings (sem argumentos); /tui regular\|fullscreen → /tui-set (também --tui-mode) |
| /ultraplan | – | R | removed | removido no Claude |
| /ultrareview | – | B | unsupported | nuvem do Claude |
| /update-config | – | S | partial | workflow de prompt do usuário (claude-home/commands/update-config.md, só pelo usuário; não é função nativa nem usa modelo automaticamente). Implementado localmente; verificação integrada pendente (gate); semântica pode diferir do Claude. |
| /upgrade | – | B | partial | /upgrade abre a URL pública do plano (services/public.ts). Implementado localmente; verificação integrada pendente (gate); semântica pode diferir do Claude. |
| /usage-credits | – | B | unsupported | plano do Claude |
| /verify | – | S | partial | workflow de prompt do usuário (claude-home/commands/verify.md, só pelo usuário; não é função nativa nem usa modelo automaticamente). Implementado localmente; verificação integrada pendente (gate); semântica pode diferir do Claude. |
| /vim | – | R | removed | removido no Claude (virou configuração); /vim local: seis módulos implementados (extensions/claude-compat/vim), verificação integrada pendente; sem alegar paridade exata |
| /voice | – | B | unsupported | sem voz |
| /web-setup | – | B | unsupported | nuvem do Claude |
| /workflow-authoring | – | S | unsupported | sem skill empacotada |
| /workflows | – | B | unsupported | sem workflows do Claude |

### Atalhos

| Tecla | Claude | Status | nycode |
|---|---|---|---|
| Ctrl+C | interrompe; sem tarefa, 1º limpa o prompt, 2º sai | partial | UiEditor: ocupado → interrompe; ocioso → nativo (limpa; 2º toque em <500 ms sai); seleção/cópia não testada com agente ocupado; o texto limpo volta pelo histórico ↑ |
| Ctrl+D | sai (2 toques em 800 ms; com texto apaga o caractere) | partial | sai de uma vez com o editor vazio; com texto apaga o caractere (nativo) |
| Ctrl+Z | suspende para o shell | exact | app.suspend (sem padrão no Windows nativo) |
| Ctrl+G / Ctrl+X Ctrl+E | editor externo | exact | Ctrl+G e Ctrl+X Ctrl+E acionam o editor externo nativo |
| Ctrl+L | redesenha a tela | exact | UiEditor força redesenho; o seletor de modelo saiu de Ctrl+L |
| Ctrl+O | transcrição detalhada | partial | abre o viewer de transcript do nycode (interface/transcript.ts); sem verificação TUI integral e com semântica própria de rolagem/filtro; a expansão de ferramentas (app.tools.expand) foi para Alt+O |
| Ctrl+R | busca no histórico | exact | UiEditor: histórico de prompts |
| Ctrl+V | cola imagem (Alt+V no Windows/WSL) | exact | app.clipboard.pasteImage; Alt+V só existe como padrão no Windows/WSL |
| Ctrl+B | manda tarefas para background | partial | nycode fleet-ui/panel.ts: desanexa subagente em primeiro plano; chamada Bash em primeiro plano não vai para background |
| Ctrl+T | alterna a lista de tarefas | alias | UiEditor reencaminha para ctrl+shift+t (nycode todo); app.thinking.toggle foi para Alt+T |
| Ctrl+X Ctrl+K | para todos os subagentes em background (2 toques) | alias | duas vezes em até 3 s: cancela runs ativos pelo fleet da sessão, sem sinalizar PIDs diretamente |
| Ctrl+X Ctrl+S / Ctrl+Enter | envia agora | exact | send-now (extensão embutida): interrompe e envia o rascunho |
| Ctrl+X Enter | enfileira o prompt | alias | encaminha para o follow-up nativo Ctrl+Q |
| Ctrl+X B, Ctrl+X Ctrl+A, Ctrl+X Tab | base de diff, painel acima do prompt | unsupported | chords e painéis inexistentes |
| Ctrl+X =/-/_ (painéis) | não confirmado nas docs lidas | unsupported | não implementado |
| Ctrl+A / Ctrl+E / Ctrl+K / Ctrl+U / Ctrl+Y / Alt+Y / Alt+B / Alt+F / Alt+D | edição readline | exact | nativos do editor |
| Ctrl+W | apaga até o espaço anterior (um caminho inteiro) | partial | apaga a palavra anterior (tui.editor.deleteWordBackward) |
| Ctrl+_ / Ctrl+Shift+- | desfaz a última edição | exact | tui.editor.undo = ctrl+- e ctrl+_ (mesmo byte 0x1f em terminais legados) |
| Ctrl+P / Ctrl+N | cursor/histórico anterior e próximo | alias | UiEditor traduz para ↑/↓ nativos (cursor e, no limite, histórico); ciclo de modelo foi para ctrl+shift+. e ctrl+shift+, |
| Up / Down | histórico | exact | nativo |
| Alt+P | seletor de modelo | alias | app.model.select = alt+p (Ctrl+L deixou de abri-lo) |
| Alt+T | liga/desliga o raciocínio | partial | app.thinking.toggle recolhe/expande blocos de raciocínio; o nível muda com Alt+Shift+T ou /thinking |
| Alt+O | modo rápido | unsupported | sem modo rápido; no nycode a tecla expande/recolhe saída de ferramentas (app.tools.expand, realocada de Ctrl+O) |
| Shift+Tab / Meta+M | alterna modo de permissão | partial | Shift+Tab delega ao controlador de permissões real (default/acceptEdits/plan/bypass; AUTO indisponível: sem API); implementado, ainda não verificado pelo gate integrado; Meta+M é fallback exclusivo do Windows sem entrada VT (não verificado nessa plataforma), não requisito deste host Linux; raciocínio: Alt+Shift+T |
| Esc | cancela | exact | app.interrupt |
| Esc Esc | rewind/resumo | partial | ação do duplo Esc do nycode (settings); checkpoints de código: /rewind |
| Alt+Enter / Option+Enter / Shift+Enter / Ctrl+J | nova linha | exact | tui.input.newLine inclui alt+enter (o nycode enfileirava follow-up; segue em ctrl+q) |
| \ + Enter | nova linha em qualquer terminal | alias | remove a barra final e insere nova linha no editor, sem submeter |
| Ctrl+S | guarda o rascunho | exact | UiEditor |
| ? (vazio) | painel de atalhos | alias | painel de atalhos da extensão comandos (teclas efetivas); sem ela cai no /hotkeys. Todos os atalhos e como mudar: /atalhos |
| / ! @ | comando, shell, arquivo | exact | nativos do nycode (!cmd, !!cmd, @arquivo) |
| : (emoji) | atalho de emoji | unsupported | não existe |
| Cmd+K | limpa a tela | unsupported | depende do terminal; /clear inicia sessão nova |
| Space (voz) | push-to-talk | unsupported | sem voz |
| Modo vim (normal/insert, motions, text objects) | edição modal completa | partial | /vim: seis módulos em extensions/claude-compat/vim (modos, movimentos, operadores, visual, objetos, repetição) implementados; verificação pelo gate integrado pendente, sem alegar paridade exata |
| Teclas contextuais (Autocomplete, Confirm, Tabs, Transcript, Diff, ModelPicker, Footer…) | contextos do keybindings do Claude | partial | cada seletor do nycode tem suas teclas (tui.select.*, app.tree.*); personalizar: /keybindings |
| keybindings.json do Claude (command:<nome>, chords) | arquivo próprio | unsupported | formato do nycode: ids app.* / tui.*; sem chords |
