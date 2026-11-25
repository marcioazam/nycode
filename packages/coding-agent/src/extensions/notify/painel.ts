/** Panel `/notifications` (alias `/avisos`): notices grouped by time and the notification settings. */

import { matchesKey, truncateToWidth, visibleWidth } from "@nycode/tui";
import { teclas } from "../folha/sheet.ts";
import { CANAIS, type Canal, type Config, EVENTOS, type Evento } from "./config.ts";

export const MAX_RECENTES = 50;
export type Glifo = "✕" | "✓" | "▲"; // erro, feito, atenção (vocabulário de estado, ui-visual/icons.ts)
export interface Aviso {
	hora: number;
	glifo: Glifo;
	texto: string;
}

/** Mais novo primeiro, no máximo MAX_RECENTES. */
export const adicionar = (lista: Aviso[], aviso: Aviso): Aviso[] => [aviso, ...lista].slice(0, MAX_RECENTES);

type Aba = "recentes" | "ajustes";
const ABAS: Aba[] = ["recentes", "ajustes"];
const NOME: Record<Evento, string> = { terminou: "terminou", precisa: "precisa de mim", erro: "erro" };
const CANAL: Record<Canal, string> = {
	sistema: "notificação do sistema",
	sino: "sino do terminal",
	ambos: "sistema e sino",
	desligado: "desligado",
};
const LINHAS = ["Avisar quando eu estiver fora", "Canal", "Som", "Progresso na aba do terminal", "Testar agora"];
const PRESETS: Evento[][] = [[...EVENTOS], ["precisa", "erro"], ["erro"], []];

export const rotuloEventos = (e: Evento[]): string =>
	e.length
		? EVENTOS.filter((x) => e.includes(x))
				.map((x) => NOME[x])
				.join(" · ")
		: "nenhum";

const proximo = (atual: Evento[]): Evento[] => {
	const i = PRESETS.findIndex((p) => p.join() === atual.join());
	return PRESETS[(i + 1) % PRESETS.length]!;
};

/** Próximo valor da linha de ajuste `i` (0 avisar, 1 canal, 2 som, 3 progresso); outras linhas não mudam nada. */
export function girar(config: Config, i: number): Config {
	if (i === 0) return { ...config, avisar: proximo(config.avisar) };
	if (i === 1) return { ...config, canal: CANAIS[(CANAIS.indexOf(config.canal) + 1) % CANAIS.length]! };
	if (i === 2) return { ...config, som: proximo(config.som) };
	if (i === 3) return { ...config, progresso: !config.progresso };
	return config;
}

interface ThemeLike {
	fg(c: string, s: string): string;
	bg(c: string, s: string): string;
	bold(s: string): string;
}
export interface Acoes {
	recentes: () => Aviso[];
	config: () => Config;
	salvar: (c: Config) => void;
	testar: () => void;
	agora?: () => number;
}

const hhmm = (t: number) => new Date(t).toTimeString().slice(0, 5);

export class PainelAvisos {
	aba: Aba = "recentes";
	index = 0;
	rolagem = 0;
	private readonly theme: ThemeLike;
	private readonly acoes: Acoes;
	private readonly done: () => void;
	private readonly redraw: () => void;

	constructor(theme: ThemeLike, acoes: Acoes, done: () => void, redraw: () => void) {
		this.theme = theme;
		this.acoes = acoes;
		this.done = done;
		this.redraw = redraw;
	}

	handleInput(data: string): void {
		if (matchesKey(data, "escape") || matchesKey(data, "q") || matchesKey(data, "ctrl+c")) {
			this.done();
			return;
		}
		if (matchesKey(data, "tab")) this.aba = ABAS[(ABAS.indexOf(this.aba) + 1) % ABAS.length]!;
		else if (this.aba === "recentes") {
			if (matchesKey(data, "up")) this.rolagem = Math.max(0, this.rolagem - 1);
			else if (matchesKey(data, "down")) this.rolagem += 1;
			else return;
		} else if (this.aba !== "ajustes") return;
		else if (matchesKey(data, "up")) this.index = Math.max(0, this.index - 1);
		else if (matchesKey(data, "down")) this.index = Math.min(LINHAS.length - 1, this.index + 1);
		else if (data === " " || matchesKey(data, "enter")) {
			if (this.index === LINHAS.length - 1) this.acoes.testar();
			else this.acoes.salvar(girar(this.acoes.config(), this.index));
		} else return;
		this.redraw();
	}

	private valores(c: Config): string[] {
		return [rotuloEventos(c.avisar), CANAL[c.canal], rotuloEventos(c.som), c.progresso ? "ligado" : "desligado", ""];
	}

	render(width: number): string[] {
		const t = this.theme;
		const dim = (s: string) => t.fg("dim", s);
		const rule = (s: string) => t.fg("borderMuted", s);
		const pad = (s: string) => s + " ".repeat(Math.max(0, width - visibleWidth(s)));
		const fitLine = (s: string) => pad(truncateToWidth(s, width, "…"));
		const tabs = ABAS.map((a) => (a === this.aba ? t.bg("selectedBg", t.bold(` ${a} `)) : dim(a))).join("   ");
		const fill = width - visibleWidth(tabs) - 14; // "── Avisos " + " " + " ──"
		const out = [
			fill >= 1
				? rule("── ") + t.bold("Avisos") + rule(` ${"─".repeat(fill)} `) + tabs + rule(" ──")
				: fitLine(tabs),
		];
		if (this.aba === "recentes") {
			const lista = this.acoes.recentes();
			if (!lista.length) out.push(fitLine(dim(" Nenhum aviso nesta sessão · Tab abre os ajustes")));
			const rotulos = { "✕": ["error", "erro"], "▲": ["warning", "atenção"], "✓": ["success", "terminou"] } as const;
			const corte = (this.acoes.agora?.() ?? Date.now()) - 15 * 60_000;
			for (const [nome, avisos] of [
				["Agora há pouco", lista.filter((a) => a.hora >= corte)],
				["Mais cedo", lista.filter((a) => a.hora < corte)],
			] as const) {
				if (!avisos.length) continue;
				out.push(fitLine(dim(` ${nome}`)));
				for (const a of avisos) {
					const [cor, estado] = rotulos[a.glifo];
					const esq = truncateToWidth(` ${t.fg(cor, estado.padEnd(8))}  ${a.texto}`, Math.max(1, width - 8), "…");
					out.push(
						width < 18
							? fitLine(` ${estado} ${a.texto}`)
							: fitLine(`${esq}${" ".repeat(Math.max(1, width - visibleWidth(esq) - 6))}${dim(hhmm(a.hora))} `),
					);
				}
			}
			out.push(
				fitLine(
					` ${teclas(t, [
						["↑↓", "rola"],
						["tab", "ajustes"],
						["esc", "fecha"],
					])}`,
				),
			);
			const cab = out[0]!;
			const corpo = out.slice(1);
			return [cab, ...corpo.slice(this.rolagem), rule("─".repeat(width))];
		} else {
			const valores = this.valores(this.acoes.config());
			const larg = Math.max(...LINHAS.map((l) => l.length)) + 2;
			LINHAS.forEach((l, i) => {
				const texto = `${l.padEnd(larg)}${valores[i] ?? ""}`;
				out.push(
					i === this.index
						? t.bg(
								"selectedBg",
								pad(` ${t.fg("accent", "❯")} ${truncateToWidth(texto, Math.max(1, width - 4), "…")}`),
							)
						: pad(`   ${truncateToWidth(texto, Math.max(1, width - 4), "…")}`),
				);
			});
			out.push(
				fitLine(
					` ${teclas(t, [
						["↑↓", "escolhe"],
						["espaço", "muda"],
						["tab", "recentes"],
						["esc", "fecha"],
					])}`,
				),
			);
		}
		out.push(rule("─".repeat(width)));
		return out;
	}

	invalidate(): void {}
}
