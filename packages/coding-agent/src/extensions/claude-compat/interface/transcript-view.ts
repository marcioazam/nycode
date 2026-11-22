/** Visão rolável de transcrição (interface.md §4): componente do @nycode/tui, só leitura, render limitado às linhas visíveis. */
import { matchesKey, truncateToWidth, wrapTextWithAnsi } from "@nycode/tui";
import { type Block, plainText } from "./transcript-model.ts";

export const COLLAPSED_LINES = 12;
export const MISSING_SCROLLBACK =
	"Capacidade ausente: o TUI do nycode não expõe a extensões o despejo no scrollback nativo; nada foi simulado.";
export const SNAPSHOT =
	"instantâneo da conversa ao abrir (não acompanha respostas em andamento; feche e reabra para atualizar)";
const B = ["\x1b[1m", "\x1b[22m"];
const D = ["\x1b[2m", "\x1b[22m"];
const COLLAPSIBLE = new Set(["thinking", "tool-call", "tool-result", "bash"]);
const HELP = [
	"↑/↓ PgUp/PgDn Home/End  rolar",
	"{ / }                   prompt anterior / próximo",
	"Ctrl+E                  mostrar tudo (ferramentas e raciocínio completos) / recolher",
	"v                       abrir o texto completo no $VISUAL/$EDITOR (arquivo privado, não altera a conversa)",
	"[                       despejar no scrollback nativo (capacidade ausente neste TUI)",
	"?                       esta ajuda",
	"q / Esc / Ctrl+C / Ctrl+O  fechar",
];

export interface ViewOptions {
	rows(): number;
	done(): void;
	requestRender(): void;
	/** Abre o texto completo fora do TUI e devolve a mensagem de status. */
	openFull(text: string): string;
}

export class TranscriptView {
	private cache?: { width: number; all: boolean; lines: string[]; users: number[] };
	private top = 0;
	private all = false;
	private help = false;
	private status = "";

	private blocks: Block[];
	private dropped: number;
	private o: ViewOptions;

	constructor(blocks: Block[], dropped: number, o: ViewOptions) {
		this.blocks = blocks;
		this.dropped = dropped;
		this.o = o;
	}

	invalidate(): void {
		this.cache = undefined;
	}

	private build(width: number): { lines: string[]; users: number[] } {
		if (this.cache && this.cache.width === width && this.cache.all === this.all) return this.cache;
		const lines: string[] = [];
		const users: number[] = [];
		const w = Math.max(10, width - 2);
		lines.push(truncateToWidth(`${D[0]}${SNAPSHOT}${D[1]}`, width), "");
		if (this.dropped) lines.push(`${D[0]}[${this.dropped} blocos anteriores omitidos por limite]${D[1]}`, "");
		for (const b of this.blocks) {
			if (b.kind === "user") users.push(lines.length);
			lines.push(truncateToWidth(`${B[0]}${b.title}${B[1]}`, width));
			let src = b.text;
			let more = 0;
			if (!this.all && COLLAPSIBLE.has(b.kind)) {
				const all = src.split("\n");
				more = Math.max(0, all.length - COLLAPSED_LINES);
				src = all
					.slice(0, COLLAPSED_LINES)
					.map((l) => l.slice(0, 2000))
					.join("\n");
			}
			for (const l of wrapTextWithAnsi(src, w)) lines.push(`  ${l}`);
			if (more) lines.push(`  ${D[0]}… +${more} linhas (Ctrl+E mostra tudo)${D[1]}`);
			if (b.clipped) lines.push(`  ${D[0]}[bloco truncado em 20000 caracteres]${D[1]}`);
			lines.push("");
		}
		this.cache = { width, all: this.all, lines, users };
		return this.cache;
	}

	private page(): number {
		return Math.max(1, this.o.rows() - 3);
	}

	render(width: number): string[] {
		const page = this.page();
		const head = truncateToWidth(
			`${B[0]}Transcrição${B[1]} ${D[0]}? ajuda · q fecha${this.all ? " · tudo" : ""}${D[1]}`,
			width,
		);
		if (this.help)
			return [
				head,
				...HELP.slice(0, page).map((l) => truncateToWidth(l, width)),
				truncateToWidth(`${D[0]}qualquer tecla volta${D[1]}`, width),
			];
		const { lines } = this.build(width);
		this.top = Math.min(this.top, Math.max(0, lines.length - page));
		const body = lines.slice(this.top, this.top + page).map((l) => truncateToWidth(l, width));
		const foot = this.status || `${Math.min(lines.length, this.top + page)}/${lines.length}`;
		return [head, ...body, truncateToWidth(`${D[0]}${foot}${D[1]}`, width)];
	}

	handleInput(data: string): void {
		if (this.help) {
			this.help = false;
			this.o.requestRender();
			return;
		}
		this.status = "";
		const total = this.cache?.lines.length ?? 0;
		const maxTop = Math.max(0, total - this.page());
		if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c") || matchesKey(data, "ctrl+o") || data === "q") {
			this.o.done();
			return;
		}
		if (matchesKey(data, "up")) this.top = Math.max(0, this.top - 1);
		else if (matchesKey(data, "down")) this.top = Math.min(maxTop, this.top + 1);
		else if (matchesKey(data, "pageUp")) this.top = Math.max(0, this.top - this.page());
		else if (matchesKey(data, "pageDown")) this.top = Math.min(maxTop, this.top + this.page());
		else if (matchesKey(data, "home")) this.top = 0;
		else if (matchesKey(data, "end")) this.top = maxTop;
		else if (matchesKey(data, "ctrl+e")) {
			this.all = !this.all;
			this.top = 0;
			this.status = this.all ? "mostrando tudo" : "recolhido";
		} else if (data === "?") this.help = true;
		else if (data === "{" || data === "}") this.jump(data === "}" ? 1 : -1);
		else if (data === "v") this.status = this.o.openFull(plainText(this.blocks));
		else if (data === "[") this.status = MISSING_SCROLLBACK;
		else return;
		this.o.requestRender();
	}

	private jump(dir: 1 | -1): void {
		const users = this.cache?.users ?? [];
		const target = dir > 0 ? users.find((l) => l > this.top) : [...users].reverse().find((l) => l < this.top);
		if (target === undefined) this.status = dir > 0 ? "sem prompt seguinte" : "sem prompt anterior";
		else this.top = target;
	}
}
