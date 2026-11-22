// pt-BR notices of the interactive mode (K17): one function per hook point; each returns the new value when the
// avisos extension is on and undefined (or false) when off, so the upstream code runs unchanged.

import type { Component } from "@nycode/tui";
import { theme } from "../theme/theme.ts";
import { ativo, ligar } from "./base.ts";
import { caixaNeutra as caixa, compactada as compactadaCaixa, confianca as confiancaCaixa } from "./caixa.ts";
import { retryLinha as retryLinhaTexto } from "./causas.ts";
import { compactacao as compactacaoLinha } from "./compactacao.ts";
import {
	type EventoRetry,
	type EventoRetryFim,
	erro as erroBloco,
	interrompido as interrompidoBloco,
	retryFim as retryFimBloco,
	retryInicio as retryInicioGancho,
} from "./erro.ts";
import { recarregado as recarregadoTela, recarregando as recarregandoTela } from "./recarga.ts";

type Container = Parameters<typeof erroBloco>[0];

/** Off switch of the notices: NYCODE_AVISOS=0. */
export const avisosAtivos = ativo;
export const ligarAvisos = ligar;

/** auto_retry_start: true when handled (the red error is hidden and the sequence remembered). */
export function retryInicio(ev: EventoRetry): boolean {
	if (!ativo()) return false;
	retryInicioGancho(ev);
	return true;
}
/** auto_retry_end without success: true when the notices drew the final lines. */
export function retryFim(host: object, ev: EventoRetryFim): boolean {
	if (!ativo()) return false;
	retryFimBloco(host, ev, theme);
	return true;
}
/** Waiting line of the retry indicator, or undefined when off. */
export function retryLinha(
	erro: string | undefined,
	tentativa: number,
	max: number,
	segundos: number,
	tecla: string,
): string | undefined {
	return ativo() ? retryLinhaTexto(erro, tentativa, max, segundos, tecla) : undefined;
}
/** Assistant error block; true when drawn. */
export function erro(container: Container, msg: string, pad: number): boolean {
	if (!ativo()) return false;
	erroBloco(container, theme, msg, pad);
	return true;
}
/** Interrupted-by-you strip; true when drawn. */
export function interrompido(container: Container, msg: string | undefined, pad: number): boolean {
	if (!ativo()) return false;
	interrompidoBloco(container, theme, msg, pad);
	return true;
}
export function confianca(host: object): Component | undefined {
	return ativo() ? confiancaCaixa(host, theme) : undefined;
}
/** /reload confirmation; true when drawn. */
export function recarregado(host: object, confiancaSalva: boolean): boolean {
	if (!ativo()) return false;
	recarregadoTela(host, theme, confiancaSalva);
	return true;
}
export function recarregando(host: object): Component | undefined {
	return ativo() ? recarregandoTela(host, theme) : undefined;
}
/** Neutral box for informational extension notices; true when handled. */
export function caixaNeutra(host: object, message: string, type?: "info" | "warning" | "error"): boolean {
	return ativo() && caixa(host, theme, message, type);
}
/** Session already compacted; true when drawn. */
export function compactada(host: object, n: number): boolean {
	if (!ativo()) return false;
	compactadaCaixa(host, theme, n);
	return true;
}
/** Compaction bar line; replaces the content built by the upstream when on. */
export function compactacao(content: Parameters<typeof compactacaoLinha>[0], comp: object): void {
	if (ativo()) compactacaoLinha(content, comp);
}
/** Message without the `Error:`/`Warning:` prefix (the color already says it); undefined when off. */
export const semPrefixo = (mensagem: string): string | undefined => (ativo() ? mensagem : undefined);
/** True when the "/bug sends a report" hint must not appear (the notices carry their own cause line). */
export const semSugestaoDeBug = (): boolean => ativo();
/** Theme color of the retry text: warning with the notices, muted upstream. */
export const corRetry = (): "warning" | "muted" => (ativo() ? "warning" : "muted");
/** Indicator options of the retry line: no spinner frames with the notices, the default spinner upstream. */
export const indicadorRetry = (): { frames: string[] } | undefined => (ativo() ? { frames: [""] } : undefined);
