// Funções puras do sticky-prompt (sem import do @nycode/tui, para testar com node:test).
// Mensagem de uma linha: o core põe fim e início na mesma linha (`133;B 133;C 133;A texto`), então o A pode vir depois de
// B/C (antes só `^133;A`, e o sticky nunca achava prompt de uma linha).
const ZONE_START = /^(?:\x1b\]133;[BC](?:\x07|\x1b\\))*\x1b\]133;A(?:\x07|\x1b\\)/;
const ZONE_END = /\x1b\]133;B(?:\x07|\x1b\\)/;

export interface Sticky {
	row: number;
	text: string;
}

const KEY_CHARS = 30;
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

// Prompt do usuário = zona OSC 133 (user e assistente marcam) cujo texto começa como uma mensagem do usuário da sessão.
// Não usa a cor de fundo: no tema mono userMessageBg é vazio.
export function userMatcher(texts: readonly string[]): UserTest {
	const keys = texts.map((t) => norm(t).slice(0, KEY_CHARS)).filter(Boolean);
	const test = (zone: string) => {
		const z = norm(zone);
		return keys.some((k) => z.startsWith(k));
	};
	return Object.assign(test, { prefixChars: KEY_CHARS });
}

/** `prefixChars`: the answer depends only on the first N letters and digits of the zone (norm), so findSticky reads only
 * that much of each zone it rejects. Without it every candidate zone is read whole. */
export type UserTest = ((zone: string) => boolean) & { prefixChars?: number };

interface ZoneIndex {
	lines: readonly string[];
	len: number;
	last: string;
	starts: number[];
	ends: number[];
}
/** Último índice: o próximo reaproveita o prefixo de linhas idênticas (as do histórico não mudam entre quadros). */
let lastIndex: ZoneIndex | undefined;
let memo:
	| {
			lines: readonly string[];
			len: number;
			last: string;
			scrollTop: number;
			isUser: unknown;
			strip: unknown;
			result: Sticky | undefined;
	  }
	| undefined;

// Suposição: o @nycode/tui (renderCached) entrega um array novo a cada render; para a mesma referência e o mesmo comprimento
// só a última linha (stream) pode ter mudado, por isso ela entra na chave do índice e do memo.
// Array novo: as linhas iguais do início (comparação de strings, quase sempre a mesma referência) mantêm suas zonas e só
// o resto passa pelas regexes; antes, cada quadro do stream varria o transcript inteiro (perf 2026-11-24).
function zoneIndex(lines: readonly string[]): ZoneIndex {
	const len = lines.length,
		last = lines[len - 1] ?? "";
	const prev = lastIndex;
	if (prev && prev.lines === lines && prev.len === len && prev.last === last) return prev;
	let from = 0;
	// O mesmo array mutado não tem com o que comparar: varre tudo. A última linha antiga pode ter mudado (stream): refaz.
	if (prev && prev.lines !== lines) {
		const shared = Math.min(prev.len - 1, len);
		while (from < shared && lines[from] === prev.lines[from]) from++;
	}
	const idx: ZoneIndex = {
		lines,
		len,
		last,
		starts: from > 0 && prev ? prev.starts.slice(0, lowerBound(prev.starts, from)) : [],
		ends: from > 0 && prev ? prev.ends.slice(0, lowerBound(prev.ends, from)) : [],
	};
	for (let i = from; i < len; i++) {
		if (ZONE_START.test(lines[i] ?? "")) idx.starts.push(i);
		if (ZONE_END.test(lines[i] ?? "")) idx.ends.push(i);
	}
	lastIndex = idx;
	return idx;
}

/** Primeiro índice de `a` (ordenado) com a[i] >= x. */
function lowerBound(a: number[], x: number): number {
	let lo = 0,
		hi = a.length;
	while (lo < hi) {
		const m = (lo + hi) >> 1;
		if (a[m] < x) lo = m + 1;
		else hi = m;
	}
	return lo;
}

export function findSticky(
	lines: readonly string[],
	scrollTop: number,
	isUser: UserTest,
	strip: (s: string) => string,
): Sticky | undefined {
	const len = lines.length,
		last = lines[len - 1] ?? "";
	if (
		memo &&
		memo.lines === lines &&
		memo.len === len &&
		memo.last === last &&
		memo.scrollTop === scrollTop &&
		memo.isUser === isUser &&
		memo.strip === strip
	)
		return memo.result;
	const { starts, ends } = zoneIndex(lines);
	let result: Sticky | undefined;
	for (let i = lowerBound(starts, Math.min(scrollTop, len)) - 1; i >= 0; i--) {
		const row = starts[i];
		const e = lowerBound(ends, row);
		const stop = e < ends.length ? ends[e] : len - 1;
		// The streaming reply is the zone right above the window: reading it whole was 21% of the bytes allocated per
		// second while streaming (perf 2026-11-24). A prefix matcher reads only its prefix; a match reads the whole zone.
		const head = zoneText(lines, row, stop, strip, isUser.prefixChars);
		if (isUser(head)) {
			result = { row, text: isUser.prefixChars === undefined ? head : zoneText(lines, row, stop, strip) };
			break;
		}
	}
	memo = { lines, len, last, scrollTop, isUser, strip, result };
	return result;
}

/** Stripped, trimmed, non-empty lines of a zone joined by spaces; with `prefixChars`, it stops at the first line that
 * reaches that many letters and digits. */
function zoneText(
	lines: readonly string[],
	row: number,
	stop: number,
	strip: (s: string) => string,
	prefixChars?: number,
): string {
	const parts: string[] = [];
	let letters = 0;
	for (let r = row; r <= stop; r++) {
		const t = strip(lines[r] ?? "").trim();
		if (!t) continue;
		parts.push(t);
		if (prefixChars === undefined) continue;
		letters += norm(t).length;
		if (letters >= prefixChars) break;
	}
	return parts.join(" ");
}

export function stickyLine(
	text: string,
	width: number,
	truncate: (s: string, w: number, e: string) => string,
	measure: (s: string) => number,
	style: (s: string) => string,
): string {
	// A mensagem já vem com a setinha e a hora do envio (ui-visual): aqui entra só o texto.
	const lead = width >= 20 ? "   " : " "; // padding interno padrão simétrico (1 + recuo 2 dos dois lados): o ❯ na mesma coluna da mensagem enviada
	const body = truncate(
		`❯ ${text.replace(/^[❯>]\s+/, "").replace(/\s{2,}\d\d:\d\d\s*$/, "")}`,
		Math.max(1, width - 2 * lead.length),
		"…",
	);
	return style(`${lead}${body}${" ".repeat(Math.max(0, width - lead.length - measure(body)))}`);
}

/** Lab /rolagem desenho 6 "Duas linhas" (antes só a faixa com `❯ texto`): em cima, sem fundo, o rótulo
 * `▎ você · HH:MM` (a hora do envio que a mensagem traz) em accent e dim, uma coluna antes do ❯; embaixo a faixa de sempre. */
export function stickyLinhas(
	text: string,
	width: number,
	truncate: (s: string, w: number, e: string) => string,
	measure: (s: string) => number,
	style: (s: string) => string,
	fg: (c: "accent" | "dim", s: string) => string,
): string[] {
	const hora = /\s{2,}(\d\d:\d\d)\s*$/.exec(text)?.[1];
	const lead = width >= 20 ? "  " : "";
	const rotulo = truncate(`${lead}${fg("accent", "▎ você")}${hora ? fg("dim", ` · ${hora}`) : ""}`, width, "");
	return [
		rotulo + " ".repeat(Math.max(0, width - measure(rotulo))),
		stickyLine(text, width, truncate, measure, style),
	];
}

/**
 * Jump-to-end label (lab /rolagem desenho 6): a selectedBg pill with `↓ voltar ao fim · shortcut`, or
 * `N novas · ↓ shortcut` (count in green) when replies arrived while scrolled away.
 */
export function indicadorFim(novas: number, atalho: string, t: StickyLabelTheme): string {
	const tecla = atalho ? ` · ${atalho}` : "";
	const meio =
		novas > 0
			? `${t.fg("success", `${novas} ${novas === 1 ? "nova" : "novas"}`)}${t.fg("text", ` · ↓${atalho ? ` ${atalho}` : ""}`)}`
			: t.fg("text", `↓ voltar ao fim${tecla}`);
	return t.bg("selectedBg", ` ${meio} `);
}

/** Coluna e largura da linha fixa: dentro da margem do chat (outputPad), como os demais blocos, e sem a coluna da
 * barra de rolagem. Estreito demais: a largura toda menos a barra. */
export function stickyRect(rect: { x: number; width: number }, pad: number): { col: number; width: number } {
	const free = rect.width - 1;
	return pad > 0 && free - 2 * pad >= 20
		? { col: rect.x + pad, width: free - 2 * pad }
		: { col: rect.x, width: Math.max(1, free) };
}

export interface StickyLabelTheme {
	fg(c: "accent" | "dim" | "success" | "text", s: string): string;
	bg(c: "selectedBg", s: string): string;
}

export interface StickyTheme {
	getFgAnsi(c: "text"): string;
	getBgAnsi(c: "selectedBg"): string;
}

// Estilo do tema ativo (selectedBg/text). Lido a cada chamada: o tema muda em runtime.
// Cor vazia (tema mono, NO_COLOR) vira o reset padrão (39/49) no nycode: sem cor própria, não emite SGR.
export function stickyStyle(theme: StickyTheme): (s: string) => string {
	return (s) => {
		const fg = theme.getFgAnsi("text"),
			bg = theme.getBgAnsi("selectedBg");
		const hasFg = fg !== "" && fg !== "\x1b[39m",
			hasBg = bg !== "" && bg !== "\x1b[49m";
		const open = `${hasBg ? bg : ""}${hasFg ? fg : ""}`;
		const body = open ? s.replace(/\x1b\[0?m/g, (m) => m + open) : s;
		return `${open}${body}${hasFg ? "\x1b[39m" : ""}${hasBg ? "\x1b[49m" : ""}`;
	};
}
