/** Atalhos do Claude Code: o que vai em keybindings.json, os padrões do nycode para detectar conflitos e a matriz. */

/** Aplicado ao ~/.nycode/agent/keybindings.json (merge; as demais chaves do usuário ficam). */
export const CLAUDE_KEYBINDINGS: Readonly<Record<string, string | string[]>> = {
	"app.model.cycleForward": "ctrl+shift+.", // Ctrl+P/N viram ↑/↓ no UiEditor (cursor e, no limite, histórico); simétrico ao cycleBackward ctrl+shift+,
	"app.model.select": "alt+p",
	"tui.editor.undo": ["ctrl+-", "ctrl+_"],
	"tui.input.newLine": ["shift+enter", "ctrl+j", "alt+enter"],
	"app.message.followUp": "ctrl+q", // libera Alt+Enter também em uma instalação sem preferências anteriores
	"app.message.dequeue": "shift+left", // edita as mensagens enfileiradas sem Alt (↑ fica exclusivo para o histórico)
	"app.thinking.toggle": "alt+t", // Ctrl+T fica para a lista de tarefas (UiEditor → ctrl+shift+t do nycode)
	"app.thinking.cycle": "alt+shift+t", // Shift+Tab alterna manual/plan pelo mecanismo protegido do nycode
	"app.tools.expand": "alt+o", // Ctrl+O abre o transcript (interface/transcript.ts); a expansão de ferramentas muda de tecla
	"app.tree.filter.cycleForward": "alt+shift+o", // Ctrl+O é o transcript; sem isto o nycode avisa conflito de atalho a cada início (o filtro da árvore usa ctrl+o por padrão)
	"app.thinking.save": [], // Ctrl+S já é o rascunho do UiEditor (captura antes); sem isto /atalhos mostra conflito
};

/** Padrões do nycode 1.5.2 (docs/keybindings.md) das ações de escopo global/editor, para checar colisões. */
export const PI_DEFAULTS: Readonly<Record<string, string[]>> = {
	"app.interrupt": ["escape"],
	"app.clear": ["ctrl+c"],
	"app.exit": ["ctrl+d"],
	"app.suspend": ["ctrl+z"],
	"app.editor.external": ["ctrl+g"],
	"app.clipboard.pasteImage": ["ctrl+v"],
	"app.model.select": ["ctrl+l"],
	"app.model.cycleForward": ["ctrl+p"],
	"app.model.cycleBackward": ["shift+ctrl+p"],
	"app.thinking.cycle": ["shift+tab"],
	"app.thinking.toggle": ["ctrl+t"],
	"app.tools.expand": ["ctrl+o"],
	"app.message.copy": ["ctrl+x"],
	"app.message.followUp": ["alt+enter"],
	"app.message.dequeue": ["alt+up"],
	"tui.editor.cursorUp": ["up"],
	"tui.editor.cursorDown": ["down"],
	"tui.editor.cursorLeft": ["left", "ctrl+b"],
	"tui.editor.cursorRight": ["right", "ctrl+f"],
	"tui.editor.cursorWordLeft": ["alt+left", "ctrl+left", "alt+b"],
	"tui.editor.cursorWordRight": ["alt+right", "ctrl+right", "alt+f"],
	"tui.editor.cursorLineStart": ["home", "ctrl+a"],
	"tui.editor.cursorLineEnd": ["end", "ctrl+e"],
	"tui.editor.jumpForward": ["ctrl+]"],
	"tui.editor.jumpBackward": ["ctrl+alt+]"],
	"tui.editor.pageUp": ["pageUp", "ctrl+pageUp"],
	"tui.editor.pageDown": ["pageDown", "ctrl+pageDown"],
	"tui.editor.deleteCharBackward": ["backspace"],
	"tui.editor.deleteCharForward": ["delete"],
	"tui.editor.deleteWordBackward": ["ctrl+w", "alt+backspace"],
	"tui.editor.deleteWordForward": ["alt+d", "alt+delete"],
	"tui.editor.deleteToLineStart": ["ctrl+u"],
	"tui.editor.deleteToLineEnd": ["ctrl+k"],
	"tui.editor.yank": ["ctrl+y"],
	"tui.editor.yankPop": ["alt+y"],
	"tui.editor.undo": ["ctrl+-"],
	"tui.input.newLine": ["shift+enter", "ctrl+j"],
	"tui.input.submit": ["enter"],
	"tui.input.tab": ["tab"],
};

const norm = (k: string) => k.toLowerCase().split("+").sort().join("+");

/** Teclas de `added` que outra ação do mesmo escopo também usa (defaults do nycode sobrepostos por `user` e `added`). */
export function keyConflicts(
	added: Readonly<Record<string, string | string[]>>,
	user: Readonly<Record<string, string | string[]>> = {},
): string[] {
	const scope = new Set(Object.keys(PI_DEFAULTS));
	const eff: Record<string, string[]> = { ...PI_DEFAULTS };
	for (const [id, v] of Object.entries({ ...user, ...added })) if (scope.has(id) || id in added) eff[id] = [v].flat();
	const out: string[] = [];
	for (const [id, v] of Object.entries(added)) {
		for (const key of [v].flat()) {
			const other = Object.entries(eff).filter(([o, keys]) => o !== id && keys.some((k) => norm(k) === norm(key)));
			for (const [o] of other) out.push(`${key}: ${id} × ${o}`);
		}
	}
	return out;
}

/** Chaves cujo valor personalizado do usuário vence o nosso (só o padrão ctrl+o do nycode é trocado). */
const KEEP_USER_CUSTOM = new Set(["app.tools.expand"]);

/** Merge puro: preserva tudo do usuário que não é chave nossa e não sobrescreve personalização de `KEEP_USER_CUSTOM`. */
export function mergeKeybindings(existing: Record<string, unknown>): Record<string, unknown> {
	const out = { ...existing, ...CLAUDE_KEYBINDINGS };
	for (const id of KEEP_USER_CUSTOM) {
		const u = [existing[id]].flat().filter((k): k is string => typeof k === "string");
		if (id in existing && !(u.length === 1 && norm(u[0]) === norm("ctrl+o"))) out[id] = existing[id];
	}
	return out;
}

export type Status = "exact" | "alias" | "partial" | "unsupported" | "removed";
export interface KeyRow {
	key: string;
	claude: string;
	status: Status;
	nycode: string;
}

export const SHORTCUTS: readonly KeyRow[] = [
	{
		key: "Ctrl+C",
		claude: "interrompe; sem tarefa, 1º limpa o prompt, 2º sai",
		status: "partial",
		nycode:
			"UiEditor: ocupado → interrompe; ocioso → nativo (limpa; 2º toque em <500 ms sai); seleção/cópia não testada com agente ocupado; o texto limpo volta pelo histórico ↑",
	},
	{
		key: "Ctrl+D",
		claude: "sai (2 toques em 800 ms; com texto apaga o caractere)",
		status: "partial",
		nycode: "sai de uma vez com o editor vazio; com texto apaga o caractere (nativo)",
	},
	{
		key: "Ctrl+Z",
		claude: "suspende para o shell",
		status: "exact",
		nycode: "app.suspend (sem padrão no Windows nativo)",
	},
	{
		key: "Ctrl+G / Ctrl+X Ctrl+E",
		claude: "editor externo",
		status: "exact",
		nycode: "Ctrl+G e Ctrl+X Ctrl+E acionam o editor externo nativo",
	},
	{
		key: "Ctrl+L",
		claude: "redesenha a tela",
		status: "exact",
		nycode: "UiEditor força redesenho; o seletor de modelo saiu de Ctrl+L",
	},
	{
		key: "Ctrl+O",
		claude: "transcrição detalhada",
		status: "partial",
		nycode:
			"abre o viewer de transcript do nycode (interface/transcript.ts); sem verificação TUI integral e com semântica própria de rolagem/filtro; a expansão de ferramentas (app.tools.expand) foi para Alt+O",
	},
	{ key: "Ctrl+R", claude: "busca no histórico", status: "exact", nycode: "UiEditor: histórico de prompts" },
	{
		key: "Ctrl+V",
		claude: "cola imagem (Alt+V no Windows/WSL)",
		status: "exact",
		nycode: "app.clipboard.pasteImage; Alt+V só existe como padrão no Windows/WSL",
	},
	{
		key: "Ctrl+B",
		claude: "manda tarefas para background",
		status: "partial",
		nycode:
			"nycode fleet-ui/panel.ts: desanexa subagente em primeiro plano; chamada Bash em primeiro plano não vai para background",
	},
	{
		key: "Ctrl+T",
		claude: "alterna a lista de tarefas",
		status: "alias",
		nycode: "UiEditor reencaminha para ctrl+shift+t (nycode todo); app.thinking.toggle foi para Alt+T",
	},
	{
		key: "Ctrl+X Ctrl+K",
		claude: "para todos os subagentes em background (2 toques)",
		status: "alias",
		nycode: "duas vezes em até 3 s: cancela runs ativos pelo fleet da sessão, sem sinalizar PIDs diretamente",
	},
	{
		key: "Ctrl+X Ctrl+S / Ctrl+Enter",
		claude: "envia agora",
		status: "exact",
		nycode: "send-now (extensão embutida): interrompe e envia o rascunho",
	},
	{
		key: "Ctrl+X Enter",
		claude: "enfileira o prompt",
		status: "alias",
		nycode: "encaminha para o follow-up nativo Ctrl+Q",
	},
	{
		key: "Ctrl+X B, Ctrl+X Ctrl+A, Ctrl+X Tab",
		claude: "base de diff, painel acima do prompt",
		status: "unsupported",
		nycode: "chords e painéis inexistentes",
	},
	{
		key: "Ctrl+X =/-/_ (painéis)",
		claude: "não confirmado nas docs lidas",
		status: "unsupported",
		nycode: "não implementado",
	},
	{
		key: "Ctrl+A / Ctrl+E / Ctrl+K / Ctrl+U / Ctrl+Y / Alt+Y / Alt+B / Alt+F / Alt+D",
		claude: "edição readline",
		status: "exact",
		nycode: "nativos do editor",
	},
	{
		key: "Ctrl+W",
		claude: "apaga até o espaço anterior (um caminho inteiro)",
		status: "partial",
		nycode: "apaga a palavra anterior (tui.editor.deleteWordBackward)",
	},
	{
		key: "Ctrl+_ / Ctrl+Shift+-",
		claude: "desfaz a última edição",
		status: "exact",
		nycode: "tui.editor.undo = ctrl+- e ctrl+_ (mesmo byte 0x1f em terminais legados)",
	},
	{
		key: "Ctrl+P / Ctrl+N",
		claude: "cursor/histórico anterior e próximo",
		status: "alias",
		nycode:
			"UiEditor traduz para ↑/↓ nativos (cursor e, no limite, histórico); ciclo de modelo foi para ctrl+shift+. e ctrl+shift+,",
	},
	{ key: "Up / Down", claude: "histórico", status: "exact", nycode: "nativo" },
	{
		key: "Alt+P",
		claude: "seletor de modelo",
		status: "alias",
		nycode: "app.model.select = alt+p (Ctrl+L deixou de abri-lo)",
	},
	{
		key: "Alt+T",
		claude: "liga/desliga o raciocínio",
		status: "partial",
		nycode: "app.thinking.toggle recolhe/expande blocos de raciocínio; o nível muda com Alt+Shift+T ou /thinking",
	},
	{
		key: "Alt+O",
		claude: "modo rápido",
		status: "unsupported",
		nycode:
			"sem modo rápido; no nycode a tecla expande/recolhe saída de ferramentas (app.tools.expand, realocada de Ctrl+O)",
	},
	{
		key: "Shift+Tab / Meta+M",
		claude: "alterna modo de permissão",
		status: "partial",
		nycode:
			"Shift+Tab delega ao controlador de permissões real (default/acceptEdits/plan/bypass; AUTO indisponível: sem API); implementado, ainda não verificado pelo gate integrado; Meta+M é fallback exclusivo do Windows sem entrada VT (não verificado nessa plataforma), não requisito deste host Linux; raciocínio: Alt+Shift+T",
	},
	{ key: "Esc", claude: "cancela", status: "exact", nycode: "app.interrupt" },
	{
		key: "Esc Esc",
		claude: "rewind/resumo",
		status: "partial",
		nycode: "ação do duplo Esc do nycode (settings); checkpoints de código: /rewind",
	},
	{
		key: "Alt+Enter / Option+Enter / Shift+Enter / Ctrl+J",
		claude: "nova linha",
		status: "exact",
		nycode: "tui.input.newLine inclui alt+enter (o nycode enfileirava follow-up; segue em ctrl+q)",
	},
	{
		key: "\\ + Enter",
		claude: "nova linha em qualquer terminal",
		status: "alias",
		nycode: "remove a barra final e insere nova linha no editor, sem submeter",
	},
	{ key: "Ctrl+S", claude: "guarda o rascunho", status: "exact", nycode: "UiEditor" },
	{
		key: "? (vazio)",
		claude: "painel de atalhos",
		status: "alias",
		nycode:
			"painel de atalhos da extensão comandos (teclas efetivas); sem ela cai no /hotkeys. Todos os atalhos e como mudar: /atalhos",
	},
	{
		key: "/ ! @",
		claude: "comando, shell, arquivo",
		status: "exact",
		nycode: "nativos do nycode (!cmd, !!cmd, @arquivo)",
	},
	{ key: ": (emoji)", claude: "atalho de emoji", status: "unsupported", nycode: "não existe" },
	{
		key: "Cmd+K",
		claude: "limpa a tela",
		status: "unsupported",
		nycode: "depende do terminal; /clear inicia sessão nova",
	},
	{ key: "Space (voz)", claude: "push-to-talk", status: "unsupported", nycode: "sem voz" },
	{
		key: "Modo vim (normal/insert, motions, text objects)",
		claude: "edição modal completa",
		status: "partial",
		nycode:
			'setting `editorMode: "vim"`: seis módulos em extensions/claude-compat/vim (modos, movimentos, operadores, visual, objetos, repetição) implementados; verificação pelo gate integrado pendente, sem alegar paridade exata',
	},
	{
		key: "Teclas contextuais (Autocomplete, Confirm, Tabs, Transcript, Diff, ModelPicker, Footer…)",
		claude: "contextos do keybindings do Claude",
		status: "partial",
		nycode: "cada seletor do nycode tem suas teclas (tui.select.*, app.tree.*); personalizar: /keybindings",
	},
	{
		key: "keybindings.json do Claude (command:<nome>, chords)",
		claude: "arquivo próprio",
		status: "unsupported",
		nycode: "formato do nycode: ids app.* / tui.*; sem chords",
	},
];
