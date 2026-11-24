/** Confirmação em cartão: foco inicial seguro, severidade só visual e fallback para seleção segura. */
import { matchesKey, truncateToWidth, visibleWidth, wrapTextWithAnsi } from "@nycode/tui";
import type { ThemeLike } from "./sheet.ts";

type Opts = { signal?: AbortSignal; timeout?: number } | undefined;
type Select = (title: string, options: string[], opts?: Opts) => Promise<string | undefined>;
type Confirm = (title: string, message: string, opts?: Opts) => Promise<boolean>;
export type Labels = { title: string; safe: string; action: string };

const CATALOG: Record<string, Labels> = {
	"Trust this project?": { title: "Confiar neste projeto?", safe: "Não confiar", action: "Confiar e carregar" },
	"Run project-local agents?": { title: "Executar agentes deste projeto?", safe: "Não executar", action: "Executar" },
	"Load imports from outside this project?": {
		title: "Carregar imports de fora deste projeto?",
		safe: "Não carregar",
		action: "Carregar",
	},
	"Allow this command?": { title: "Permitir este comando?", safe: "Não permitir", action: "Permitir" },
};

export function labelsFor(title: string): Labels {
	const known = CATALOG[title];
	if (known) return known;
	const allow = /^Allow (.+)\?$/s.exec(title);
	if (allow) return { title: `Permitir ${allow[1]}?`, safe: "Não permitir", action: "Permitir" };
	return { title, safe: "Não", action: "Sim" };
}

/** true só se o resultado for exatamente o rótulo de ação; Esc, timeout e qualquer outra string dão false. */
export function safeConfirm(select: Select): Confirm {
	return async (title, message, opts) => {
		const l = labelsFor(title);
		return (await select(`${l.title}\n${message}`, [l.safe, l.action], opts)) === l.action;
	};
}

/** Classificação visual, não concede permissões nem substitui o guard. */
export function riscoDe(title: string, message: string): "error" | "warning" | "text" {
	const s = `${title}\n${message}`;
	if (
		/\b(?:excluir|apagar|deletar|delete) (?:a |o |the )?(?:sessão|arquivo|pasta|session|file|folder)\b/i.test(s) ||
		/\b(?:rm\s+-[\w]*r|git\s+(?:reset\s+--hard|clean\s+-[\w]*f|push\s+[^\n]*--force\b|branch\s+-D)|mkfs\b|shred\b|dd\s+if=|chmod\s+-R|DROP\s+TABLE|TRUNCATE\s+TABLE|kubectl\s+delete|terraform\s+destroy)/.test(
			s,
		)
	)
		return "error";
	return /\b(?:sudo|rm|git\s+(?:push|rebase)|publish|confiar|trust|run project-local agents|imports? (?:de fora|from outside))\b/i.test(
		s,
	)
		? "warning"
		: "text";
}

export class CartaoConfirmar {
	private acao = false;
	private cabe = false;
	private readonly altura: () => number;
	constructor(
		theme: ThemeLike,
		labels: Labels,
		message: string,
		done: (v: boolean) => void,
		redraw: () => void,
		altura = () => Infinity,
	) {
		this.t = theme;
		this.l = labels;
		this.message = message.replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, " ");
		this.done = done;
		this.redraw = redraw;
		this.altura = altura;
	}
	private readonly t: ThemeLike;
	private readonly l: Labels;
	private readonly message: string;
	private readonly done: (v: boolean) => void;
	private readonly redraw: () => void;

	handleInput(data: string): void {
		if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
			this.done(false);
			return;
		}
		if (matchesKey(data, "enter")) {
			this.done(this.acao && this.cabe);
			return;
		}
		if (
			matchesKey(data, "left") ||
			matchesKey(data, "right") ||
			matchesKey(data, "tab") ||
			matchesKey(data, "shift+tab")
		) {
			this.acao = !this.acao;
			this.redraw();
		}
	}

	render(width: number): string[] {
		const t = this.t;
		const w = Math.max(1, width - 4);
		const ascii = Boolean(process.env.NYCODE_ASCII_ICONS) || /^(?:dumb|linux)$/.test(process.env.TERM ?? "");
		const [tl, tr, bl, br, rg, v] = ascii ? ["+", "+", "+", "+", "-", "|"] : ["╭", "╮", "╰", "╯", "─", "│"];
		const borda = (x: string) => t.fg("borderMuted", x);
		const row = (s: string) => {
			const txt = truncateToWidth(s, w, "…");
			return truncateToWidth(
				`${borda(v)} ${txt}${" ".repeat(Math.max(0, w - visibleWidth(txt)))} ${borda(v)}`,
				width,
				"",
			);
		};
		const botao = (label: string, ativo: boolean, cor: string) => {
			const txt = t.fg(cor, `[ ${label} ]`);
			return ativo ? `\x1b[7m${t.bold(txt)}\x1b[27m` : txt;
		};
		const botoes = [
			botao(this.l.safe, !this.acao, "text"),
			botao(this.l.action, this.acao, riscoDe(this.l.title, this.message)),
		];
		const junto = botoes.join("   ");
		// Em largura estreita, não trunca o rótulo da ação selecionada para acomodar o outro.
		const acoes = visibleWidth(junto) <= w ? [junto] : botoes;
		const corpo = this.message.trim() ? wrapTextWithAnsi(this.message, w) : [];
		this.cabe =
			corpo.length + acoes.length + 4 <= this.altura() &&
			[this.l.title, ...acoes].every((s) => visibleWidth(s) <= w);
		if (!this.cabe)
			return [row(t.bold(this.l.title)), row(t.fg("warning", "Aumente a janela ou use esc para cancelar."))];
		return [
			borda(tl + rg.repeat(Math.max(0, width - 2)) + tr),
			row(t.bold(this.l.title)),
			...corpo.map((s: string) => row(t.fg("muted", s))),
			row(""),
			...acoes.map((s) => row(" ".repeat(Math.max(0, w - visibleWidth(s))) + s)),
			borda(bl + rg.repeat(Math.max(0, width - 2)) + br),
		].map((s) => truncateToWidth(s, width, ""));
	}

	invalidate(): void {}
}

const MARK = Symbol.for("nycode.folha.confirm");

export function installConfirm(ui: any): void {
	if (!ui || ui[MARK] || typeof ui.select !== "function" || typeof ui.confirm !== "function") return;
	const original: Confirm = ui.confirm.bind(ui);
	const safe = safeConfirm((t, o, opts) => ui.select(t, o, opts));
	ui.confirm = async (title: string, message: string, opts?: Opts) => {
		if (opts?.signal?.aborted) return false;
		if (typeof ui.custom === "function") {
			let cancelar: (() => void) | undefined;
			let timer: ReturnType<typeof setTimeout> | undefined;
			try {
				return (
					(await ui.custom(
						(
							tui: { requestRender(): void; terminal?: { rows: number } },
							t: ThemeLike,
							_kb: unknown,
							done: (r: boolean) => void,
						) => {
							const card = new CartaoConfirmar(
								t,
								labelsFor(title),
								message,
								done,
								() => tui.requestRender(),
								() => tui.terminal?.rows ?? Infinity,
							);
							cancelar = () => done(false);
							opts?.signal?.addEventListener("abort", cancelar, { once: true });
							if (opts?.signal?.aborted) queueMicrotask(cancelar);
							if (opts?.timeout && opts.timeout > 0) timer = setTimeout(cancelar, opts.timeout);
							return card;
						},
						{
							overlay: true,
							overlayOptions: { anchor: "center", width: "80%" },
							blocked: { kind: "permission", message: labelsFor(title).title },
						},
					)) === true
				);
			} catch {
				if (opts?.signal?.aborted) return false;
			} finally {
				if (cancelar) opts?.signal?.removeEventListener("abort", cancelar);
				clearTimeout(timer);
			}
		}
		try {
			return await safe(title, message, opts);
		} catch {
			return original(title, message, opts);
		}
	};
	ui[MARK] = true;
}
