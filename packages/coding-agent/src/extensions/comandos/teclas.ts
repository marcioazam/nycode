/** Teclas efetivas, marcas (conflito real × intencional × Alt) e gravação segura de keybindings.json. */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { validateKeybindings } from "../dev-commands/keybindings.ts";
import {
	ACTION_LABELS,
	type Context,
	contextOf,
	EXT_ACTIONS,
	type ExtAction,
	NATIVOS_DUPLOS,
	PARIDADE_ALT,
} from "./catalog.ts";

type Teclas = string | string[] | undefined;
/** O que usamos do KeybindingsManager do nycode (injetado em ctx.ui.custom). */
export interface KbLike {
	getResolvedBindings(): Record<string, Teclas>;
	getUserBindings(): Record<string, Teclas>;
	getDefinition(id: string): { defaultKeys: string | string[]; description?: string };
}

export type Marca = "conflito" | "intencional";
export interface Linha {
	id: string;
	rotulo: string;
	teclas: string[];
	padrao: string[];
	contexto: Context;
	origem: "padrão" | "seu" | "extensão" | "harness";
	marca?: Marca;
	alt: boolean;
	fixa: boolean;
	outros: string[];
	altOk?: boolean;
}

const lista = (v: Teclas): string[] => (v === undefined ? [] : [v].flat());
export const norm = (k: string): string => k.toLowerCase().split("+").sort().join("+");

const ORDEM = ["ctrl", "alt", "shift", "meta", "super"];
const NOMES: Record<string, string> = {
	up: "↑",
	down: "↓",
	left: "←",
	right: "→",
	escape: "Esc",
	pageup: "PageUp",
	pagedown: "PageDown",
};
/** `shift+ctrl+p` → `Ctrl+Shift+P`. */
export function fmtTecla(k: string): string {
	const p = k.toLowerCase().split("+");
	const mods = ORDEM.filter((m) => p.includes(m)).map((m) => m[0]!.toUpperCase() + m.slice(1));
	const base = p
		.filter((x) => !ORDEM.includes(x))
		.map((x) => NOMES[x] ?? (x.length === 1 ? x.toUpperCase() : x[0]!.toUpperCase() + x.slice(1)));
	return [...mods, ...(base.length ? base : p.slice(-1))].join("+");
}

/** Ordem canônica dos modificadores (ctrl+alt+shift): `shift+ctrl+g` → `ctrl+shift+g`. */
export function canonica(k: string): string {
	const p = k.toLowerCase().split("+");
	return [...ORDEM.filter((m) => p.includes(m)), ...p.filter((x) => !ORDEM.includes(x))].join("+");
}

/** Ações do harness que valem agora: as condicionadas somem quando o nycode já usa a tecla (mesma regra do UiEditor). */
export function extAtivas(kb: Pick<KbLike, "getResolvedBindings">): ExtAction[] {
	const r = kb.getResolvedBindings();
	return EXT_ACTIONS.filter(
		(a) => !a.unless || !lista(r[a.unless]).some((k) => a.keys.some((x) => norm(x) === norm(k))),
	);
}

/** Primeira tecla efetiva da ação, formatada; undefined se a ação está sem tecla. */
export function teclaEfetiva(kb: Pick<KbLike, "getResolvedBindings">, id: string): string | undefined {
	const ext = EXT_ACTIONS.find((a) => a.id === id);
	if (ext && !extAtivas(kb).includes(ext)) return undefined;
	const k = (ext ? ext.keys : lista(kb.getResolvedBindings()[id]))[0];
	return k === undefined ? undefined : fmtTecla(k);
}

export function montarLinhas(kb: KbLike): Linha[] {
	const resolvidas = kb.getResolvedBindings();
	const user = kb.getUserBindings();
	const base: Linha[] = Object.keys(resolvidas).map((id) => {
		const teclas = lista(resolvidas[id]);
		const padrao = lista(kb.getDefinition(id).defaultKeys);
		const mudou = user[id] !== undefined && norm(lista(user[id]).join(" ")) !== norm(padrao.join(" "));
		return {
			id,
			rotulo: ACTION_LABELS[id] ?? kb.getDefinition(id).description ?? id,
			teclas,
			padrao,
			contexto: contextOf(id),
			origem: mudou ? "seu" : "padrão",
			alt: false,
			fixa: false,
			outros: [],
		};
	});
	const ext: Linha[] = extAtivas(kb).map((a) => ({
		id: a.id,
		rotulo: a.label,
		teclas: a.keys,
		padrao: a.keys,
		contexto: a.contexto ?? "editor",
		origem: a.origin,
		alt: false,
		fixa: true,
		outros: [],
	}));
	const todas = [...base, ...ext];
	const grupos = new Map<string, Linha[]>();
	for (const l of todas) {
		l.alt = l.origem !== "padrão" && l.teclas.some((k) => /(^|\+)(alt|meta)(\+|$)/.test(k.toLowerCase()));
		l.altOk =
			l.alt &&
			l.teclas.every(
				(k) => !/(^|\+)(alt|meta)(\+|$)/.test(k.toLowerCase()) || (PARIDADE_ALT[l.id] ?? []).includes(canonica(k)),
			);
		// the second key of a chord (after the copy prefix) is not a standalone key: it cannot conflict
		if (l.id === "app.message.sendNowChord") continue;
		for (const k of l.teclas) {
			const chave = `${l.contexto}|${norm(k)}`;
			grupos.set(chave, [...(grupos.get(chave) ?? []), l]);
		}
	}
	for (const membros of grupos.values()) {
		if (membros.length < 2) continue;
		const ids = new Set(membros.map((m) => m.id));
		const intencional =
			membros.some((m) => EXT_ACTIONS.find((a) => a.id === m.id)?.intentional) ||
			NATIVOS_DUPLOS.some((par) => [...ids].every((i) => par.includes(i)));
		for (const m of membros) {
			if (!intencional) m.marca = "conflito";
			else m.marca ??= "intencional";
			for (const o of membros) if (o !== m && !m.outros.includes(o.rotulo)) m.outros.push(o.rotulo);
		}
	}
	return todas;
}

/** Mescla `mudancas` no arquivo (valida antes e depois, `.bak` do anterior); nada é gravado se houver erro. */
export function gravarMudancas(
	path: string,
	mudancas: Record<string, string | string[]>,
): { erros: string[]; avisos: string[] } {
	const existe = existsSync(path);
	const antes = existe ? readFileSync(path, "utf8") : "{}";
	const v0 = validateKeybindings(antes);
	if (v0.errors.length) return { erros: v0.errors.map((e) => `arquivo atual: ${e}`), avisos: [] };
	const texto = `${JSON.stringify({ ...JSON.parse(antes), ...mudancas }, null, 2)}\n`;
	const v1 = validateKeybindings(texto);
	if (v1.errors.length) return { erros: v1.errors, avisos: [] };
	mkdirSync(dirname(path), { recursive: true });
	if (existe) copyFileSync(path, `${path}.bak`);
	writeFileSync(path, texto);
	return { erros: [], avisos: v1.warnings };
}

// Padrões do nycode das ações que a paleta mostra (a paleta não recebe o KeybindingsManager; lê o arquivo do usuário por cima).
const PADROES: Record<string, string> = {
	"app.model.select": "ctrl+l",
	"app.thinking.cycle": "shift+tab",
	"app.model.cycleForward": "ctrl+p",
	"app.message.copy": "ctrl+x",
	"app.exit": "ctrl+d",
};

/** Teclas efetivas só das ações da paleta: padrão do nycode sobreposto por keybindings.json (relido a cada chamada). */
export function teclasDoArquivo(path: string): Pick<KbLike, "getResolvedBindings"> {
	return {
		getResolvedBindings: () => {
			try {
				const user: unknown = JSON.parse(readFileSync(path, "utf8"));
				return { ...PADROES, ...(user && typeof user === "object" ? (user as Record<string, Teclas>) : {}) };
			} catch {
				return { ...PADROES };
			}
		},
	};
}
