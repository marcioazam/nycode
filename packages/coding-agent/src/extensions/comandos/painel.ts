/** Painel “?”: teclas efetivas em cápsulas, 3 colunas (1 coluna abaixo de 60), ancorado embaixo; setas rolam, Esc ou q fecha. */

import { matchesKey, truncateToWidth, visibleWidth } from "@nycode/tui";
import type { ExtensionContext } from "../../core/extensions/types.ts";
import { rule, type ThemeLike } from "../folha/sheet.ts";
import { ascii } from "../ui-visual/icons.ts";
import { type KbLike, teclaEfetiva } from "./teclas.ts";

export interface Item {
	rotulo: string;
	tecla: string;
}
export interface Grupo {
	titulo: string;
	itens: Item[];
}
export const OVERLAY = {
	overlay: true,
	overlayOptions: { anchor: "bottom-center", width: "100%", maxHeight: "70%" },
} as const;
export const COLUNA_MIN = 60; // abaixo disso, uma coluna

const GRUPOS: [string, [string, string][]][] = [
	[
		"Essenciais",
		[
			["Enviar", "tui.input.submit"],
			["Nova linha", "tui.input.newLine"],
			["Interromper", "app.interrupt"],
			["Enfileirar", "app.message.followUp"],
			["Editar fila", "app.message.dequeue"],
			["Excluir da fila", "ext.dropqueue"],
			["Histórico", "ext.history"],
			["Editor externo", "app.editor.external"],
		],
	],
	[
		"Ver",
		[
			["Expandir tools", "app.tools.expand"],
			["Raciocínio", "app.thinking.toggle"],
			["Trocar modelo", "app.model.select"],
			["Plano", "ext.plan"],
			["Tarefas", "ext.tasks"],
			["Redesenhar", "ext.redraw"],
		],
	],
	[
		"Sessão",
		[
			["Copiar", "app.message.copy"],
			["Colar imagem", "app.clipboard.pasteImage"],
			["Rascunho", "ext.stash"],
			["Fleet", "ext.fleet"],
			["Sair", "app.exit"],
		],
	],
];

/** Grupos com a tecla efetiva de cada ação (ação sem tecla some). */
export function painelGrupos(kb: KbLike): Grupo[] {
	const vistas = new Set<string>(); // uma tecla aparece uma vez só
	return GRUPOS.map(([titulo, itens]) => ({
		titulo,
		itens: itens.flatMap(([rotulo, id]) => {
			const tecla = teclaEfetiva(kb, id);
			if (!tecla || vistas.has(tecla)) return [];
			vistas.add(tecla);
			return [{ rotulo, tecla }];
		}),
	}));
}

const SIMBOLO: Record<string, string> = { Ctrl: "⌃", Alt: "⌥", Shift: "⇧" };
const SETA: Record<string, string> = { "←": "left", "→": "right", "↑": "up", "↓": "down" };

/** `Ctrl+Shift+P` → `⌃⇧P`, `Enter` → `⏎`, `Esc` → `esc`; em ASCII sem símbolos (`ctrl+shift+p`). */
export function rotuloTecla(tecla: string, plano = ascii(process.env)): string {
	const p = tecla.split("+");
	const base = p.pop() ?? "";
	const mods = p.map((m) => (plano ? m.toLowerCase() : (SIMBOLO[m] ?? m))).join(plano ? "+" : "");
	const nome = plano
		? (SETA[base] ?? base.toLowerCase())
		: base === "Enter"
			? "⏎"
			: base.length === 1
				? base.toUpperCase()
				: base.toLowerCase();
	return mods ? mods + (plano ? "+" : "") + nome : nome;
}

const pad = (s: string, w: number) => s + " ".repeat(Math.max(0, w - visibleWidth(s)));

export class Painel {
	private readonly t: ThemeLike;
	private readonly grupos: Grupo[];
	private readonly done: (v?: string) => void;
	private rolagem = 0;

	constructor(t: ThemeLike, grupos: Grupo[], done: (v?: string) => void) {
		this.t = t;
		this.grupos = grupos;
		this.done = done;
	}

	handleInput(data: string): void {
		if (matchesKey(data, "escape") || data === "q" || matchesKey(data, "ctrl+c")) {
			this.done();
			return;
		}
		if (matchesKey(data, "up")) this.rolagem = Math.max(0, this.rolagem - 1);
		else if (matchesKey(data, "down")) this.rolagem += 1;
	}

	/** Cápsula como a de `teclas()` (fundo customMessageBg); sem fundo no tema, a tecla fica em negrito. */
	private cap(k: string): string {
		try {
			return this.t.bg("customMessageBg", ` ${k} `);
		} catch {
			return this.t.bold(` ${k} `);
		}
	}

	private bloco(g: Grupo, w: number): string[] {
		const teclas = g.itens.map((i) => rotuloTecla(i.tecla));
		const kw = Math.max(0, ...teclas.map((k) => visibleWidth(k))); // cápsulas da coluna com a mesma largura
		return [
			this.t.fg("dim", g.titulo),
			...g.itens.map((i, n) => {
				const rotulo = truncateToWidth(i.rotulo, Math.max(1, w - kw - 4), "…");
				return `${this.cap(pad(teclas[n]!, kw))}  ${this.t.fg("muted", rotulo)}`;
			}),
		];
	}

	render(width: number): string[] {
		const fitLine = (s: string) => pad(truncateToWidth(s, width, "…"), width);
		const out = [rule(this.t, width, "Atalhos")];
		if (width >= COLUNA_MIN) {
			const w = Math.floor((width - 2 - 3 * (this.grupos.length - 1)) / this.grupos.length);
			const cols = this.grupos.map((g) => this.bloco(g, w));
			for (let i = 0; i < Math.max(...cols.map((c) => c.length)); i++)
				out.push(fitLine(` ${cols.map((c) => pad(c[i] ?? "", w)).join("   ")}`));
		} else {
			for (const g of this.grupos) for (const l of this.bloco(g, width - 2)) out.push(fitLine(` ${l}`));
		}
		out.push(fitLine(this.t.fg("dim", " /atalhos mostra todos e deixa mudar")), rule(this.t, width));
		const cab = out[0]!;
		const rodape = out.slice(-2);
		const corpo = out.slice(1, -2);
		return [cab, ...corpo.slice(this.rolagem), ...rodape];
	}

	invalidate(): void {}
}

/** Abre o painel; o caractere digitado para fechá-lo volta ao editor por `inserir`. */
export async function abrirPainel(ctx: ExtensionContext, inserir: (s: string) => void, kb?: KbLike): Promise<void> {
	if (!ctx?.hasUI) return;
	const r: string | undefined = await ctx.ui.custom(
		(_tui, theme, kbInj, done: (v?: string) => void) => new Painel(theme, painelGrupos(kb ?? kbInj), done),
		OVERLAY,
	);
	if (r) inserir(r);
}
