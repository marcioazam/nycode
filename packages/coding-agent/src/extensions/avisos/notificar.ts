/**
 * Notificação de fim de turno: textos, sanitização e bytes OSC (99 no kitty; 9 no iTerm2, foot e Windows Terminal;
 * 777 nos demais; terminal não reconhecido recebe 777 e BEL, Onda 10 P23).
 * Título e mensagem vêm de dados externos (nome da sessão, erro do provedor): nada de ESC, BEL, `;` (OSC 777) nem quebra.
 */

import { movimento } from "../ui/a11y.ts";
import type { Canal, Evento } from "./config.ts";

export type Tipo = Evento | "teste";
type Env = Record<string, string | undefined>;

const MAX = 120;

/** Remove controles C0/C1 (ESC, BEL, quebras), junta espaços e corta; `;` vira `,` quando o separador do OSC importa. */
export function sanitizar(texto: string, semPontoEVirgula = false): string {
	let s = String(texto)
		.replace(/[\x00-\x1f\x7f-\x9f\u2028\u2029]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	if (semPontoEVirgula) s = s.replace(/;/g, ",");
	return s.length > MAX ? `${s.slice(0, MAX - 1)}…` : s;
}

export interface Info {
	duracao?: string;
	rotulo?: string;
	resultado?: string;
	pergunta?: string;
}

export function corpo(tipo: Tipo, info: Info = {}): string {
	if (tipo === "terminou") {
		const resumo = resumir(info.resultado);
		return resumo
			? `Terminou${info.duracao ? ` em ${info.duracao}` : ""}: ${resumo}`
			: `Terminou${info.duracao ? ` · ${info.duracao}` : ""}`;
	}
	if (tipo === "precisa") {
		const resumo = resumir(info.pergunta);
		return resumo ? `Pergunta: ${resumo}` : "Precisa de você · pergunta aberta";
	}
	if (tipo === "erro") return `Parou com erro · ${info.rotulo ?? "falha no nycode"}`;
	return "Teste · o aviso chegou";
}

/** Só a primeira linha com texto; não inclui anexos, raciocínio ou saída de tools. */
const resumir = (texto?: string): string =>
	sanitizar(
		texto
			?.split(/\r?\n/)
			.find((linha) => linha.trim())
			?.replace(/^\s{0,3}#{1,6}\s+/, "") ?? "",
	);

/** Nunca 2 (crítica): nada do nycode justifica furar o Não Perturbe. */
export const urgencia = (tipo: Tipo): 0 | 1 => (tipo === "precisa" || tipo === "erro" ? 1 : 0);

export const osc99 = (id: string, titulo: string, texto: string, u: 0 | 1): string[] => [
	`\x1b]99;i=${id}:d=0:p=title:u=${u};${sanitizar(titulo)}\x1b\\`,
	`\x1b]99;i=${id}:d=1:p=body;${sanitizar(texto)}\x1b\\`,
];
export const osc99Fechar = (id: string): string => `\x1b]99;i=${id}:p=close;\x1b\\`;
export const osc777 = (titulo: string, texto: string): string =>
	`\x1b]777;notify;${sanitizar(titulo, true)};${sanitizar(texto, true)}\x07`;

/** `OSC 9;texto`: texto que começa com dígito e `;` seria lido como subcomando (9;4 é progresso), então ganha prefixo. */
export const osc9 = (titulo: string, texto: string): string => {
	const s = sanitizar(`${titulo} · ${texto}`);
	return `\x1b]9;${/^\d/.test(s) ? `nycode: ${s}` : s}\x07`;
};

export type Protocolo = "99" | "9" | "777" | "desconhecido";
/** Qual sequência o terminal mostra; sem pista, `desconhecido` (777 e BEL: o sino chega em quase todo terminal). */
export function protocolo(env: Env = process.env): Protocolo {
	if (env.KITTY_WINDOW_ID) return "99";
	if (env.TERM_PROGRAM === "iTerm.app" || env.WT_SESSION || /^foot/.test(env.TERM ?? "")) return "9";
	if (env.TERM_PROGRAM === "ghostty" || env.TERM_PROGRAM === "WezTerm" || env.VTE_VERSION || env.TMUX) return "777";
	return "desconhecido";
}

export interface Notificador {
	enviar(canal: Canal, tipo: Tipo, titulo: string, info?: Info): void;
	/** Foco voltou: fecha a notificação do kitty (p=close com o mesmo id). */
	fechar(): void;
}

/** `id` fixo por sessão: a notificação nova substitui a anterior. */
export function criarNotificador(
	escrever: (s: string) => void,
	env: Env = process.env,
	id = `nycode-${process.pid}`,
): Notificador {
	const proto = protocolo(env);
	const kitty = proto === "99";
	let aberta = false;
	return {
		enviar(canal, tipo, titulo, info) {
			if (canal === "desligado" || movimento(env) === "desligado") return;
			if (canal !== "sino") {
				const texto = corpo(tipo, info);
				if (kitty) {
					osc99(id, titulo, texto, urgencia(tipo)).forEach(escrever);
					aberta = true;
				} else if (proto === "9") escrever(osc9(titulo, texto));
				else escrever(osc777(titulo, texto));
			}
			if (canal === "sino" || canal === "ambos" || proto === "desconhecido") escrever("\x07");
		},
		fechar() {
			if (!kitty || !aberta) return;
			aberta = false;
			escrever(osc99Fechar(id));
		},
	};
}
