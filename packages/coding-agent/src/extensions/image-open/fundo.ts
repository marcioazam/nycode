/**
 * Imagem de resultado de tool dentro do fundo da tool: o nycode desenha o Spacer e a
 * Image fora do Box com fundo, e a imagem fica "flutuando" no fundo do terminal. Pintamos as últimas linhas
 * (spacer + imagem) com o mesmo fundo e o mesmo recuo do Box.
 * Kitty (C=1, o cursor não anda): recuo, sequência e então espaços até a largura; a imagem (z=0) fica sobre o texto.
 * iTerm2 move o cursor: essa linha fica intacta.
 */
import { NASCE_MS, nasce } from "../ui-visual/moldura/nasce.ts";
import { anima } from "../ui-visual/motion/motion.ts";

// ponytail: largura do fallback ignora só SGR; texto não-ASCII (largura incerta) fica sem pintura para nunca estourar.
const visibleWidth = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "").length;

const KITTY = "\x1b_G";
const ITERM = "\x1b]1337;File=";

/** Colunas (c=) e linhas (r=) dos parâmetros kitty (antes do primeiro `;`); undefined se faltar algum. */
function kittyCelulas(line: string): { cols: number; rows: number } | undefined {
	const i = line.indexOf(KITTY);
	const ctrl = line.slice(i + KITTY.length).split(";", 1)[0];
	const c = /(?:^|,)c=(\d+)(?:,|$)/.exec(ctrl)?.[1];
	const r = /(?:^|,)r=(\d+)(?:,|$)/.exec(ctrl)?.[1];
	const cols = Number(c);
	const rows = Number(r);
	return cols > 0 && rows > 0 ? { cols, rows } : undefined;
}

/**
 * Pinta as `n` últimas linhas (spacers e imagens) com `bg`, recuo `pad` e largura `width`, e fecha com uma linha de fundo.
 * Com `fg`, cada imagem kitty (c=/r= conhecidos, spacer antes, cabendo em `width`) ganha moldura fina arredondada:
 * o spacer vira a borda de cima, a de baixo é inserida após as linhas reservadas.
 */
export type Ficha = { linhas: string[][]; cor: (i: number, s: string) => string };
/** Com `ficha`, a k-ésima imagem emoldurada ganha à direita as linhas `ficha.linhas[k]` (texto puro, cortado com …),
 * centradas na moldura (3 linhas com moldura de altura ímpar, 2 com par; as últimas se juntam com ` · `). */
export function pintarImagem(
	lines: string[],
	n: number,
	width: number,
	bg: (s: string) => string,
	pad: number,
	fg?: (s: string) => string,
	ficha?: Ficha,
	marco?: (s: string) => string,
): string[] {
	if (n <= 0) return lines;
	// Moldura do resultado: `│` dos dois lados e `╰─…─╯` embaixo, em volta da caixa;
	// sem miniatura emoldurada (iTerm2, estreito, sem cor) fica o desenho de antes, e o cabeçalho (ui-visual) também não dobra.
	if (marco && fg && width >= 24) {
		const r = pintarImagem(lines, n, width - 2, bg, 1, fg, ficha),
			ini = lines.length - n;
		if (r.slice(ini).some((l) => l.includes("╭")))
			return [
				...r.slice(0, ini),
				...r.slice(ini).map((l) => (l.includes(ITERM) ? l : marco("│") + l + marco("│"))),
				marco(`╰${"─".repeat(width - 2)}╯`),
			];
	}
	let nImg = 0;
	const indent = " ".repeat(pad);
	const start = lines.length - n;
	const rest = (used: number) => " ".repeat(Math.max(0, width - used));
	const out: string[] = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (i < start) {
			out.push(line);
			continue;
		}
		if (line.includes(ITERM) || (!line.includes(KITTY) && /[^\x00-\x7f]/.test(line))) {
			out.push(line);
			continue;
		}
		if (line.includes(KITTY)) {
			const cel = fg && kittyCelulas(line);
			const framed =
				cel &&
				i - 1 >= start &&
				lines[i - 1] === "" &&
				out[out.length - 1] === bg(" ".repeat(width)) &&
				2 * pad + cel.cols + 2 <= width &&
				i + cel.rows <= lines.length &&
				lines.slice(i + 1, i + cel.rows).every((l) => l === "");
			if (framed) {
				const { cols, rows } = cel;
				const used = pad + cols + 2;
				const bar = "─".repeat(cols);
				// Ficha ao lado: 3 colunas depois da moldura.
				const livre = width - used - 3;
				const fl = ficha && livre >= 6 ? [...(ficha.linhas[nImg] ?? [])] : [];
				// Alinhada à moldura: a moldura tem F = rows+2 linhas; a ficha ocupa 3 linhas se F é
				// ímpar e 2 se é par (as últimas se juntam com ` · `), começando em floor((F-n)/2): o centro do texto é o da moldura. Granularidade
				// de célula: com F ímpar o centro é uma linha; com F par, entre duas.
				const alvo = (rows + 2) % 2 === 1 ? 3 : 2;
				while (fl.length > alvo && fl.length > 1) fl.splice(-2, 2, fl.slice(-2).join(" · "));
				const ini = Math.floor((rows + 2 - fl.length) / 2);
				const lado = (f: number) => {
					const t = fl[f - ini];
					if (!t) return rest(used);
					const c = t.length > livre ? `${t.slice(0, livre - 1)}…` : t;
					return `   ${ficha!.cor(f - ini, c)}${rest(used + 3 + c.length)}`;
				};
				out[out.length - 1] = bg(indent + fg(`╭${bar}╮`) + lado(0));
				out.push(`${bg(indent + fg("│"))}${line}${bg(" ".repeat(cols) + fg("│") + lado(1))}`);
				for (let k = 1; k < rows; k++) out.push(bg(indent + fg("│") + " ".repeat(cols) + fg("│") + lado(k + 1)));
				out.push(bg(indent + fg(`╰${bar}╯`) + lado(rows + 1)));
				i += rows - 1;
				nImg++;
				continue;
			}
			nImg++;
			out.push(`${bg(indent)}${line}${bg(rest(pad))}`);
			continue;
		}
		if (line === "") {
			out.push(bg(" ".repeat(width)));
			continue;
		}
		const body = indent + line;
		out.push(bg(body + rest(visibleWidth(body))));
	}
	// Margem inferior com o fundo: a imagem fecha dentro do bloco da tool, como o texto.
	return [...out, bg(" ".repeat(width))];
}

type Img = {
	render(w: number): string[];
	invalidate?(): void;
	options?: { maxWidthCells?: number };
	mimeType?: string;
	base64Data?: string;
	dimensions?: { widthPx: number; heightPx: number };
};
type Tool = {
	toolName?: string;
	args?: { path?: unknown; file_path?: unknown };
	imageComponents?: Img[];
	imageSpacers?: { render(w: number): string[] }[];
	isPartial?: boolean;
	result?: { isError?: boolean; details?: { truncation?: { truncated?: boolean } } };
	outputPad?: number;
};

// O nycode não exporta `theme`; o tema vivo fica em globalThis sob esta chave (theme.js, compartilhada entre loaders).
const THEME_KEY = Symbol.for("@nycode/coding-agent:theme");
type Theme = {
	bg(k: string, s: string): string;
	fg?(k: string, s: string): string;
	getBgAnsi?(k: string): string;
	getFgAnsi?(k: string): string;
};
const temaVivo = (): Theme | undefined => (globalThis as Record<symbol, Theme | undefined>)[THEME_KEY];
const rgb = (ansi: string | undefined) =>
	/\[(?:38|48);2;(\d+);(\d+);(\d+)m/
		.exec(ansi ?? "")
		?.slice(1)
		.map(Number);

/** Fundo atrás da imagem (antes o verde de sucesso / ciano em execução): neutro (customMessageBg); erro
 * em toolErrorBg; aviso (truncado) no neutro puxado 28% ao âmbar, como a pílula de truncado do Read. */
function fundoDe(tool: Tool, theme: Theme): (s: string) => string {
	if (tool.result?.isError) return (s) => theme.bg("toolErrorBg", s);
	if (tool.result?.details?.truncation?.truncated) {
		try {
			const b = rgb(theme.getBgAnsi?.("customMessageBg")),
				w = rgb(theme.getFgAnsi?.("warning"));
			if (b && w)
				return (s) => `\x1b[48;2;${b.map((v, i) => Math.round(v + (w[i]! - v) * 0.28)).join(";")}m${s}\x1b[49m`;
		} catch {
			/* tema sem cor: neutro */
		}
	}
	return (s) => theme.bg("customMessageBg", s);
}

const imagem = (l: string) => l.includes(KITTY) || l.includes(ITERM);

/** Miniatura do Read: imagem lida em MINI_COLS colunas, com nome, tipo, tamanho e o clique ao lado. */
export const MINI_COLS = 16;
const EXT: Record<string, string> = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/jpg": "jpg",
	"image/gif": "gif",
	"image/webp": "webp",
};
const tamanho = (b64: string) => {
	const b = Math.floor((b64.length * 3) / 4);
	return b < 1024 * 1024
		? `${Math.max(1, Math.round(b / 1024))} KB`
		: `${(b / 1024 / 1024).toFixed(1).replace(/\./, ",")} MB`;
};
export function fichaDe(tool: Tool, img: Img): string[] {
	const p = String(tool.args?.path ?? tool.args?.file_path ?? "");
	const d = img.dimensions;
	const meta = [
		EXT[img.mimeType ?? ""] ?? img.mimeType ?? "imagem",
		d ? `${d.widthPx}×${d.heightPx}` : "",
		img.base64Data ? tamanho(img.base64Data) : "",
	]
		.filter(Boolean)
		.join(" · ");
	return [p.split("/").pop() || "imagem", meta, "clique abre"];
}

/** Envolve ToolExecutionComponent.prototype.render; sem tema ou com erro, devolve o render nativo.
 * Margem do chat: quando o chat-margin roda por dentro, as linhas de spacer chegam como 2×margem espaços;
 * a pintura vai na largura interna e a margem volta sem fundo dos dois lados. */
const instalados = new WeakSet<object>();
const vistos = new WeakMap<object, { parcial: boolean; t0?: number }>();
export function instalarFundo(
	proto: { render(w: number): string[] },
	tema: () => Theme | undefined = temaVivo,
	agora: () => number = () => performance.now(),
): void {
	const orig = proto.render;
	if (instalados.has(orig)) return;
	const render = function (this: Tool, width: number): string[] {
		const leitura = this.toolName === "read";
		// Nasce do fundo: só quem foi visto executando sobe em NASCE_MS; o histórico já nasce assentado.
		const v = vistos.get(this) ?? { parcial: false };
		vistos.set(this, v);
		if (this.isPartial) v.parcial = true;
		else if (v.parcial && v.t0 === undefined) v.t0 = agora();
		if (leitura)
			for (const im of this.imageComponents ?? [])
				if (im.options && im.options.maxWidthCells !== MINI_COLS) {
					im.options.maxWidthCells = MINI_COLS;
					im.invalidate?.();
				}
		const lines = orig.call(this, width);
		const imgs = this.imageComponents ?? [];
		if (!imgs.length || !lines.length) return lines;
		const theme = tema();
		if (!theme) return lines;
		try {
			const m = this.outputPad ?? 0,
				vazio = " ".repeat(2 * m);
			const medir = (w: number) => {
				let n = 0;
				for (let i = 0; i < imgs.length; i++)
					n += (this.imageSpacers?.[i]?.render(w).length ?? 0) + imgs[i].render(w).length;
				return Math.min(n, lines.length);
			};
			const iw = width - 2 * m;
			const nIn = m > 0 && iw >= 20 ? medir(iw) : 0;
			const regiao = lines.slice(lines.length - nIn);
			const margem = nIn > 0 && regiao.some((l) => l === vazio) && regiao.every((l) => l === vazio || imagem(l));
			const w = margem ? iw : width;
			const n = margem ? nIn : medir(width);
			const pad = w - 4 >= 20 ? 2 : 1;
			// A linha da imagem também chega com a margem dos dois lados (` ␛_G… `): sem tirá-la, a moldura e a ficha andavam 2 colunas
			//.
			const mm0 = " ".repeat(m),
				semMargem = (l: string) =>
					l.length > 2 * m && l.startsWith(mm0) && l.endsWith(mm0) ? l.slice(m, l.length - m) : l;
			const fonte = margem
				? [...lines.slice(0, lines.length - n), ...regiao.map((l) => (l === vazio ? "" : semMargem(l)))]
				: lines;
			const ficha =
				leitura && theme.fg
					? {
							linhas: imgs.map((im) => fichaDe(this, im)),
							cor: (k: number, s: string) => theme.fg!(k === 0 ? "text" : k === 2 ? "accent" : "dim", s),
						}
					: undefined;
			const cor = this.result?.isError ? "error" : "borderMuted";
			const pintado = pintarImagem(
				fonte,
				n,
				w,
				fundoDe(this, theme),
				pad,
				theme.fg && ((s) => theme.fg!("dim", s)),
				ficha,
				leitura && theme.fg ? (s) => theme.fg!(cor, s) : undefined,
			);
			const idade = leitura && v.t0 !== undefined && anima() ? agora() - v.t0 : undefined;
			const ini0 = fonte.length - n;
			const out =
				idade !== undefined && idade < NASCE_MS
					? [...pintado.slice(0, ini0), ...nasce(pintado.slice(ini0), theme, idade)]
					: pintado;
			if (!margem) return out;
			const mm = " ".repeat(m),
				ini = lines.length - n;
			return out.map((l, i) => (i < ini ? l : mm + l + mm));
		} catch {
			return lines;
		}
	};
	instalados.add(render);
	proto.render = render;
}
