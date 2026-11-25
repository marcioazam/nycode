/** Ícones em três conjuntos: ASCII (terminal.asciiIcons, TERM=dumb|linux), Nerd Font (kitty ou terminal.nerdFont=true), Unicode de largura simples. NO_COLOR só tira cor. Contrato usado por tools.ts. */

export type IconName =
	| "read"
	| "bash"
	| "edit"
	| "write"
	| "grep"
	| "find"
	| "ls"
	| "ok"
	| "err"
	| "pending"
	| "warn"
	| "branch"
	| "clock"
	| "think"
	| "todo"
	| "agent"
	| "question"
	| "web"
	| "memory"
	| "lsp"
	| "plan"
	| "run"
	| "tool"
	| "hook"
	| "swap";
export type Env = Record<string, string | undefined>;

// Nerd Fonts (glyphnames.json): ferramentas em Codicons (traço fino, estilo VS Code).
const NERD: Record<IconName, string> = {
	read: "\ueabc", // D1 (onda 12): ler ○ cod-circle, escrever ● cod-circle_filled, executar ▸ cod-triangle_right
	bash: "\u{f018d}", // md-console, opção 6 (antes '\uebca' cod-terminal_bash e '\ueb91' cod-debug_alt)
	edit: "\uea73", // cod-edit: lápis (antes o círculo do write)
	write: "\uea71",
	grep: "\ueabc",
	find: "\ueabc",
	ls: "\ueabc",
	ok: "\uf42e",
	err: "\uea76",
	pending: "\uf444",
	warn: "\uf421",
	branch: "\uf418",
	clock: "\uf43a",
	think: "\u{f0336}", // lâmpada (md-lightbulb_outline); o cérebro ficou para a memória
	todo: "\ueb67", // cod-tasklist: checklist próprio para Task, distinto da prancheta U+EB9D do Plano
	agent: "\u{f06a9}", // md-robot preenchido (escolha: opção 7)
	question: "\ueac7", // dois balões (cod-comment_discussion)
	web: "\ueb01",
	memory: "\uea71",
	lsp: "\ueabc",
	plan: "\ueb9d", // cod-clippy prancheta (escolha: opção 1)
	run: "\ueb70",
	tool: "\ueb6d",
	hook: "\uf024", // fa-flag: o ⚑ dos hooks e gates, mas ampliado pelo kitty como os outros ícones
	swap: "\u{f06a9}", // md-robot unificado no aviso subagent-background (escolha: opção 7)
};

const UNICODE: Record<IconName, string> = {
	read: "○",
	bash: "▸",
	edit: "●",
	write: "●",
	grep: "○",
	find: "○",
	ls: "○",
	ok: "✓",
	err: "✕",
	pending: "●",
	warn: "▲",
	branch: "⎇",
	clock: "◷",
	think: "◇",
	todo: "☰",
	agent: "◎",
	question: "?",
	web: "⊕",
	memory: "●",
	lsp: "○",
	plan: "◈",
	run: "▸",
	tool: "•",
	hook: "⚑",
	swap: "⇄",
};

const ASCII: Record<IconName, string> = {
	read: ">",
	bash: "$",
	edit: "~",
	write: "+",
	grep: "?",
	find: "/",
	ls: "=",
	ok: "+",
	err: "x",
	pending: "*",
	warn: "!",
	branch: "@",
	clock: "#",
	think: "!",
	todo: "-",
	agent: "&",
	question: "?",
	web: "%",
	memory: '"',
	lsp: "<",
	plan: "^",
	run: ">",
	tool: "*",
	hook: "!",
	swap: ":",
};

const set = (v: string | undefined): boolean => (v ?? "") !== "";

/** Preferências terminal.nerdFont / terminal.asciiIcons já resolvidas (env NYCODE_* > settings.json > padrão). */
export type IconPrefs = { nerdFont: boolean | "auto"; asciiIcons: boolean };

let prefs: IconPrefs = { nerdFont: "auto", asciiIcons: false };

/** Chamado no session_start de ui-visual; o estado é do processo, como o tema. */
export const setIconPrefs = (next: IconPrefs): void => {
	prefs = next;
};

export const ascii = (env: Env = process.env, p: IconPrefs = prefs): boolean =>
	p.asciiIcons || set(env.NYCODE_ASCII_ICONS) || env.TERM === "dumb" || env.TERM === "linux";

/** ASCII vence tudo; senão Nerd Font por kitty ou terminal.nerdFont=true (terminal desconhecido = Unicode, sem sondar fontes). */
export const nerdFont = (env: Env = process.env, p: IconPrefs = prefs): boolean => {
	if (ascii(env, p)) return false;
	return p.nerdFont === true || env.NYCODE_NERD_FONT === "1" || env.TERM === "xterm-kitty" || set(env.KITTY_WINDOW_ID);
};

export const icon = (name: IconName, env: Env = process.env, p: IconPrefs = prefs): string =>
	ascii(env, p) ? ASCII[name] : nerdFont(env, p) ? NERD[name] : UNICODE[name];

/** Espaço depois de um ícone. O kitty desenha o ícone Nerd Font por cima do espaço seguinte (2 células), então ali o
 * texto precisa de dois espaços para não encostar no ícone. */
export const iconGap = (env: Env = process.env): string =>
	!ascii(env) && (env.TERM === "xterm-kitty" || set(env.KITTY_WINDOW_ID)) ? "  " : " ";

const BUILTIN = new Set(["read", "bash", "edit", "write", "grep", "find", "ls"]);
/** Generic words only, no provider names; `tool_search` finds tools, not pages. */
const WEB = /fetch|web|search|scrape|crawl/;

/** Ferramenta → ícone; a primeira regra que casa vence: nativas, todo, agent, question, web, memory, lsp_, plan, run, tool. */
export const toolIcon = (toolName: string): IconName => {
	if (BUILTIN.has(toolName)) return toolName as IconName;
	if (toolName.includes("todo")) return "todo";
	if (toolName.includes("agent")) return "agent";
	if (toolName === "question") return "question";
	if (toolName !== "tool_search" && WEB.test(toolName)) return "web";
	if (toolName === "memory") return "memory";
	if (toolName.startsWith("lsp_")) return "lsp";
	if (toolName.includes("plan")) return "plan";
	if (toolName === "run") return "run";
	return "tool";
};

// ── estado ───────────────────────────────────────────────────────────────────
// Vocabulário único: ● ciano = executando, ▲ amarelo = pede atenção, ✓ verde = feito, ✕ vermelho = erro.
// O fundo acompanha o estado. Ciano = `syntaxType` (o único token ciano dos temas); o aviso não tem token de fundo, é derivado.

export type Estado = "run" | "warn" | "ok" | "err";
type EstadoTheme = {
	fg: (c: string, s: string) => string;
	bg?: (c: string, s: string) => string;
	getBgAnsi?: (c: string) => string;
	getFgAnsi?: (c: string) => string;
};
const ESTADO: Record<Estado, { icon: IconName; fg: string; bg?: string }> = {
	run: { icon: "pending", fg: "syntaxType", bg: "toolPendingBg" },
	warn: { icon: "warn", fg: "warning" },
	ok: { icon: "ok", fg: "success", bg: "toolSuccessBg" },
	err: { icon: "err", fg: "error", bg: "toolErrorBg" },
};
export const estadoGlyph = (e: Estado, theme: Pick<EstadoTheme, "fg">, env: Env = process.env): string =>
	theme.fg(ESTADO[e].fg, icon(ESTADO[e].icon, env));
/** No chat o estado sai só como nome na cor dele, sem ícone; `nome` troca o rótulo padrão. */
export const ESTADO_NOME: Record<Estado, string> = { run: "executando", warn: "atenção", ok: "concluído", err: "erro" };
export const estadoNome = (e: Estado, theme: Pick<EstadoTheme, "fg">, nome: string = ESTADO_NOME[e]): string =>
	theme.fg(ESTADO[e].fg, nome);

/** Fundo do aviso: o amarelo do tema diluído (WARN_TINT) sobre o fundo neutro das mensagens, reescalado para o brilho
 * desse fundo (o matiz muda, o contraste do texto não). Não depende dos fundos de sucesso/erro. */
export const WARN_TINT = 0.2;
const lum = (c: number[]): number => [0.2126, 0.7152, 0.0722].reduce((a, w, k) => a + w * (c[k]! / 255) ** 2.2, 0);
export const warnBgRgb = (base: number[], warn: number[]): number[] => {
	const mix = base.map((b, k) => b * (1 - WARN_TINT) + warn[k]! * WARN_TINT);
	const f = (lum(base) / Math.max(lum(mix), 1e-6)) ** (1 / 2.2);
	return mix.map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
};
const rgbOf = (ansi: string | undefined): number[] | undefined => {
	const m = /[34]8;2;(\d+);(\d+);(\d+)/.exec(ansi ?? "");
	return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : undefined;
};
const safe = <T>(f: () => T): T | undefined => {
	try {
		return f();
	} catch {
		return undefined;
	}
};
/** Pintor de fundo do estado. Sem cor no tema devolve o texto; aviso sem truecolor cai no fundo neutro. */
export const estadoBg = (e: Estado, theme: EstadoTheme): ((s: string) => string) => {
	if (!theme.bg) return (s) => s;
	const bg = (c: string, s: string) => theme.bg!(c, s); // método do Theme: precisa do `this`
	const name = ESTADO[e].bg;
	if (name) return (s) => bg(name, s);
	const [base, warn] = [
		safe(() => theme.getBgAnsi?.("customMessageBg")),
		safe(() => theme.getFgAnsi?.("warning")),
	].map(rgbOf);
	if (!base || !warn) return (s) => bg("customMessageBg", s);
	const open = `\x1b[48;2;${warnBgRgb(base, warn).join(";")}m`;
	return (s) => `${open}${s}\x1b[49m`;
};

/** Dica de atalho (`alt+o abre`): a tecla no azul do tema (`accent`), o verbo em dim. */
export const dicaTecla = (theme: Pick<EstadoTheme, "fg">, tecla: string, verbo: string): string =>
	theme.fg("accent", tecla) + theme.fg("dim", ` ${verbo}`);

/** Bolinha de "executando" pulsando: um quadro a cada PULSE_MS, sempre 1 coluna. */
export const PULSE_MS = 240;
const PULSE = ["∙", "•", "●", "•"];
export const pulseFrame = (ms: number): string =>
	icon("pending") === "*" ? "*" : PULSE[Math.floor(ms / PULSE_MS) % PULSE.length]!;

// ── mensagem do usuário ──────────────────────────────────────────────────────
// Setinha nas mensagens enviadas. Só a exibição muda (transformador de Markdown).
export const BLOCO_MD = /^\s*(#{1,6} |[-*+] |\d+[.)] |```|~~~|>|\|)/;

/** Medida de colunas (sem ANSI). O padrão conta code points; quem tem o @nycode/tui à mão passa `visibleWidth` (CJK e emoji largos ocupam 2). */
export type Medir = (t: string) => number;
const codePoints: Medir = (t) => [...t.replace(/\x1b\[[0-9;]*m/g, "")].length;

/** `❯ texto`; se a mensagem começa com um bloco Markdown (título, lista, cerca, citação, tabela) a marca vai em linha própria para não quebrá-lo.
 * Com `hora` e `w` (largura útil), a hora do envio vai à direita da 1ª linha; texto longo é quebrado antes dela. */
export const marcaUsuario = (
	md: string,
	fg: (color: string, text: string) => string,
	env: Env = process.env,
	hora = "",
	w = 0,
	medir: Medir = codePoints,
): string => {
	if (!md.trim()) return md;
	const marca = fg("accent", ascii(env) ? ">" : "❯");
	const out = BLOCO_MD.test(md) ? `${marca}\n\n${md}` : `${marca} ${md}`;
	if (!hora || !w) return out;
	const fim = out.indexOf("\n") < 0 ? out.length : out.indexOf("\n");
	const gap = w - medir(out.slice(0, fim)) - medir(hora);
	const h = fg("dim", hora);
	const teto = w - medir(hora) - 2;
	if (gap >= 2) return out.slice(0, fim) + " ".repeat(gap) + h + coluna(out.slice(fim), teto, medir);
	// Não cabe: quebra a 1ª linha (na palavra; sem espaço, no corte) para a hora ficar em cima, como nos demais blocos.
	const linha = out.slice(0, fim);
	const plano = linha.replace(/\x1b\[[0-9;]*m/g, "");
	const extra = linha.length - plano.length; // cores da marca, todas no começo
	const horaW = medir(hora);
	if (teto < 4) return out;
	// Corte por colunas: o maior prefixo que cabe em `teto`.
	let fimCol = 0;
	for (let i = 0, cols = 0; i < plano.length; ) {
		const cp = String.fromCodePoint(plano.codePointAt(i)!);
		cols += medir(cp);
		if (cols > teto) break;
		i += cp.length;
		fimCol = i;
	}
	const esp = plano.lastIndexOf(" ", fimCol);
	const corte = esp > 2 ? esp : fimCol;
	const cima = linha.slice(0, corte + extra);
	return `${cima}${" ".repeat(Math.max(0, w - horaW - medir(plano.slice(0, corte))))}${h}${coluna(`\n${linha.slice(corte + extra).trimStart()}${out.slice(fim)}`, teto, medir)}`;
};

/** Texto do usuário fora da coluna da hora: cada linha comum quebra em `teto` colunas (na palavra; sem
 * espaço, no corte). Cercas de código e linhas de bloco Markdown (lista, título, citação, tabela) ficam como estão. */
function coluna(texto: string, teto: number, medir: Medir): string {
	if (teto < 4) return texto;
	let cerca = false;
	return texto
		.split("\n")
		.flatMap((l) => {
			if (/^\s*(```|~~~)/.test(l)) {
				cerca = !cerca;
				return [l];
			}
			if (cerca || BLOCO_MD.test(l) || medir(l) <= teto) return [l];
			const out: string[] = [];
			let atual = "";
			const poe = (p: string) => {
				for (const cp of p) {
					if (medir(atual + cp) > teto) {
						out.push(atual);
						atual = "";
					}
					atual += cp;
				}
			};
			for (const palavra of l.split(" ")) {
				const junto = atual ? `${atual} ${palavra}` : palavra;
				if (medir(junto) <= teto) atual = junto;
				else if (medir(palavra) <= teto) {
					out.push(atual);
					atual = palavra;
				} else {
					if (atual) {
						out.push(atual);
						atual = "";
					}
					poe(palavra);
				}
			}
			return [...out, atual];
		})
		.join("\n");
}
