// Assistant error, interruption and retry notices: the hooks of the retry flow and of the assistant message.

import { type Component, Spacer, Text } from "@nycode/tui";
import { ThemedText } from "../components/themed-text.ts";
import type { Theme } from "../theme/theme.ts";
import {
	type Anfitriao,
	fgRgb,
	gravarGlobal,
	hora24,
	largura,
	lerGlobal,
	lumDe,
	MIN_INTERNO,
	mistura,
	parado,
	RECUO,
	tema,
	tocarRecarga,
	uiAtual,
	vista,
} from "./base.ts";
import { blocoErro, causa, linhaAviso, linhaCanceladas, linhaInterrompido, PULSO_MS } from "./causas.ts";

type Render = (w: number) => readonly string[];
interface Registro {
	container: { removeChild(c: Component): void };
	nos: Component[];
	em: number;
	msg?: string;
}
export interface EventoRetry {
	attempt: number;
	maxAttempts: number;
	errorMessage?: string;
}
export interface EventoRetryFim {
	attempt: number;
	finalError?: string;
}

const JANELA_MS = 2000; // retryInicio/retryFim follow the message_end that drew the error; older is another round
let abortado: Registro | undefined;
let ultimo: Registro | undefined;
let retry: { erro: string | undefined; max: number; t0: number } | undefined;

/** The error block of the last assistant message (read by the limit card to hide a red error it supersedes). */
export const ultimoErro = (): string | undefined => ultimo?.msg;

/** Block with a background inside the chat margin: draws at w-2·pad and puts pad plain spaces on both sides. */
export const naMargem =
	(pad: number, render: Render): Render =>
	(w) => {
		if (!(pad > 0) || w - 2 * pad < MIN_INTERNO) return render(w);
		const m = " ".repeat(pad);
		return render(w - 2 * pad).map((l) => m + l + m);
	};
/** Inner padding of chat blocks: RECUO columns on both sides; `bg` paints the indent. */
export const comRecuo =
	(bg: ((s: string) => string) | undefined, render: Render): Render =>
	(w) => {
		if (w - 2 * RECUO < MIN_INTERNO) return render(w);
		const r = bg ? bg(" ".repeat(RECUO)) : " ".repeat(RECUO);
		return render(w - 2 * RECUO).map((l) => r + l + (bg ? r : ""));
	};
export const fundoErro =
	(t: Theme): ((s: string) => string) =>
	(s) =>
		t.bg("toolErrorBg", s);
const comMargem = (txt: Text, pad: number, bg: (s: string) => string): Text => {
	txt.render = naMargem(pad, comRecuo(bg, txt.render.bind(txt)));
	return txt;
};

/** Draws the assistant error (replaces `Error: ...`) and remembers the nodes so a new attempt can hide them. */
export function erro(container: Anfitriao["chatContainer"], t: Theme, msg: string, pad: number): void {
	const [fg, bold] = tema(t);
	const nos = [
		new Spacer(1),
		comMargem(new Text(blocoErro(msg, fg, bold).join("\n"), pad, 1, fundoErro(t)), pad, fundoErro(t)),
	];
	for (const n of nos) container.addChild(n);
	ultimo = { container, nos, em: Date.now(), msg };
}

/** Esc in the middle of the answer: a discreet red strip. An extension's own message is kept. */
export function interrompido(
	container: Anfitriao["chatContainer"],
	t: Theme,
	msg: string | undefined,
	pad: number,
): void {
	const padrao =
		!msg || msg === "Operation aborted" || msg === "Request was aborted" || /^Aborted after \d+ retry/.test(msg);
	const linha = padrao
		? linhaInterrompido(
				(c, s) => t.fg(c, s),
				(s) => t.bold(s),
			)
		: t.fg("error", msg);
	const nos = [
		new Spacer(1),
		comMargem(faixaInterrompido(new Text(linha, 0, 0, fundoErro(t)), t, linha), pad, fundoErro(t)),
	];
	for (const n of nos) container.addChild(n);
	abortado = { container, nos, em: Date.now() };
}

/** One line on the error background: `linha` on the left, `esc · hour` dim on the right; pulses red twice when fresh. */
function faixaInterrompido(txt: Text, t: Theme, linha: string): Text {
	const dir = `${t.fg("dim", `esc · ${hora24(Date.now())}`)} `;
	const bg = fundoErro(t);
	const base = txt.render.bind(txt);
	const ini = performance.now();
	const cor = fgRgb(t, "error");
	const aberto = t.getFgAnsi("error");
	const pico = cor && mistura(cor, lumDe(cor) < 0.5 ? [255, 255, 255] : [0, 0, 0], 0.45);
	txt.render = (w) => {
		const g = w - largura(linha) - largura(dir);
		const ls =
			g >= 2
				? [bg(linha + " ".repeat(g) + dir)]
				: largura(linha) <= w
					? [bg(linha + " ".repeat(w - largura(linha)))]
					: base(w);
		const ms = performance.now() - ini;
		if (!cor || !pico || parado() || ms >= PULSO_MS) return ls;
		tocarRecarga(uiAtual(), ini + PULSO_MS);
		const k = 0.5 - 0.5 * Math.cos((ms / (PULSO_MS / 2)) * 2 * Math.PI);
		return ls.map((l) => l.split(aberto).join(`\x1b[38;2;${mistura(cor, pico, k).join(";")}m`));
	};
	return txt;
}

/** Esc during the attempt: the proposal shows only the two cancel lines, so this turn's `interrompido` goes away. */
function esconderAbortado(): void {
	const a = abortado;
	abortado = undefined;
	if (a && Date.now() - a.em <= JANELA_MS) for (const n of a.nos) a.container.removeChild(n);
}

/** Removes the error block that was just drawn (another attempt follows, or the final block replaces it). */
export function esconder(): void {
	const u = ultimo;
	ultimo = undefined;
	if (u && Date.now() - u.em <= JANELA_MS) for (const n of u.nos) u.container.removeChild(n);
}

interface Diag {
	sev: number;
	fonte: string;
	tipo: string;
	msg: string;
	detalhe: string;
	quieto: boolean;
}
/** Reports to the diagnostics sink (if installed); display never breaks because of it. */
function diag(ev: Diag): void {
	try {
		lerGlobal<(e: Diag) => void>(Symbol.for("nycode:diag"))?.(ev);
	} catch {}
}

/** auto_retry_start: hides the red error and keeps what the end of the sequence needs. */
export function retryInicio(ev: EventoRetry): void {
	esconder();
	retry = { erro: ev.errorMessage, max: ev.maxAttempts, t0: ev.attempt === 1 || !retry ? Date.now() : retry.t0 };
	diag({
		sev: 13,
		fonte: "modelo",
		tipo: "retry",
		msg: causa(ev.errorMessage).rotulo,
		detalhe: `tentativa ${ev.attempt} de ${ev.maxAttempts}\n${ev.errorMessage}`,
		quieto: true,
	});
}

/** auto_retry_end without success: cancelled by you (2 lines) or exhausted (3-line block). */
export function retryFim(host: object, ev: EventoRetryFim, t: Theme): void {
	esconder();
	const h = vista<Anfitriao>(host);
	const [fg, bold] = tema(t);
	const add = (fn: () => string) => h.chatContainer.addChild(new ThemedText(fn, h.outputPad, 0));
	h.chatContainer.addChild(new Spacer(1));
	const r = retry; // ThemedText evaluates the function on every render: do not read `retry`, zeroed below
	if (ev.finalError === "Retry cancelled") {
		// agent_settled does not say it was you (aborted=false): the avisos extension reads this mark.
		gravarGlobal(Symbol.for("nycode:retry-cancelado"), Date.now());
		esconderAbortado();
		if (r) add(() => linhaAviso(r.erro, fg));
		add(() => linhaCanceladas(ev.attempt, r?.max ?? ev.attempt, fg));
	} else {
		diag({
			sev: 17,
			fonte: "modelo",
			tipo: "retry-esgotado",
			msg: causa(ev.finalError || "Unknown error").rotulo,
			detalhe: `${ev.attempt} tentativas\n${ev.finalError ?? ""}`,
			quieto: true,
		});
		const segundos = r ? Math.round((Date.now() - r.t0) / 1000) : undefined;
		const linhas = blocoErro(ev.finalError || "Unknown error", fg, bold, { tentativas: ev.attempt, segundos }).join(
			"\n",
		);
		add(() => linhas);
	}
	retry = undefined;
}
