/**
 * /config-set (de /config k=v), /theme, /tui, /scroll-speed, /autocompact, /effort.
 * Persistência: SettingsManager nativo (store.ts). Aplicação ao vivo: tema por ui.setTheme, thinking por nycode.setThinkingLevel,
 * demais chaves por ctx.reload() quando ocioso (o reload do nycode relê as configurações); tuiMode ao vivo pelo controlador ui-controls (setTuiMode), senão no próximo início.
 */
import type { ExtensionAPI, ExtensionCommandContext } from "../../../../core/extensions/types.ts";
import { type Controls, getControls } from "../../interface/controls.ts";
import {
	getSetting,
	KEYS,
	type Opener,
	readSettings,
	realOpener,
	setSetting,
	THINKING_LEVELS,
	type Thinking,
} from "./store.ts";

type Ctx = Pick<ExtensionCommandContext, "ui" | "cwd" | "isIdle" | "reload">;
type Levels = Pick<ExtensionAPI, "getThinkingLevel" | "setThinkingLevel">;
export interface Deps {
	open?: Opener;
	nycode?: Levels;
	controls?: () => Controls | undefined;
}
const openerOf = (d?: Deps) => d?.open ?? realOpener;
const isLevel = (s: unknown): s is Thinking => (THINKING_LEVELS as readonly string[]).includes(s as string);

function setLevel(nycode: Levels, level: Thinking, ctx: Pick<Ctx, "ui">): void {
	nycode.setThinkingLevel(level);
	const got = nycode.getThinkingLevel();
	ctx.ui.notify(
		got === level ? `Esforço aplicado agora: ${got}` : `Esforço pedido ${level}, mas o modelo limita a ${got}.`,
		got === level ? "info" : "warning",
	);
}

const NEXT_START = "O modo de tela vale a partir do próximo início do nycode.";

/** Só depois de gravar: aplica pelo controlador nativo; nunca diz "aplicado" se o core recusou. */
function applyTuiMode(mode: string, ctx: Pick<Ctx, "ui">, d?: Deps): void {
	const controls = (d?.controls ?? getControls)();
	if (!controls?.setTuiMode || (mode !== "regular" && mode !== "fullscreen"))
		return void ctx.ui.notify(NEXT_START, "info");
	try {
		controls.setTuiMode(mode);
		ctx.ui.notify(`Modo de tela ${mode} aplicado agora.`, "info");
	} catch (e) {
		ctx.ui.notify(
			`Gravado, mas o modo não foi trocado agora: ${e instanceof Error ? e.message : String(e)}. ${NEXT_START}`,
			"warning",
		);
	}
}

/** Persiste e aplica; devolve se gravou. A aplicação ao vivo nunca finge: o texto diz o que vale agora e o que espera. */
async function apply(key: string, raw: string, ctx: Ctx, d?: Deps): Promise<boolean> {
	if (key === "theme") {
		const name = raw.trim();
		const names = ctx.ui.getAllThemes().map((t) => t.name);
		if (!names.includes(name)) {
			ctx.ui.notify(`Tema "${name}" não existe. Disponíveis: ${names.join(", ")}`, "error");
			return false;
		}
	}
	const r = await setSetting(openerOf(d), ctx.cwd, key, raw);
	if (!r.ok) {
		ctx.ui.notify(r.error, "error");
		return false;
	}
	ctx.ui.notify(`${r.key} = ${JSON.stringify(r.value)} (gravado em settings.json)`, "info");
	if (key === "theme") {
		const t = ctx.ui.setTheme(String(r.value));
		ctx.ui.notify(
			t.success ? "Tema aplicado agora." : `Gravado, mas o tema não pôde ser aplicado agora: ${t.error ?? "erro"}`,
			t.success ? "info" : "warning",
		);
	} else if (key === "defaultThinkingLevel" && d?.nycode && isLevel(r.value)) setLevel(d.nycode, r.value, ctx);
	else if (key === "tuiMode") applyTuiMode(String(r.value), ctx, d);
	else if (ctx.isIdle()) {
		ctx.ui.notify("Recarregando para aplicar agora…", "info");
		await ctx.reload(); // terminal para este handler
	} else ctx.ui.notify("Agente ocupado: a mudança vale após o próximo /reload.", "warning");
	return true;
}

async function show(key: string, ctx: Ctx, d: Deps | undefined, fallback: unknown): Promise<void> {
	const cur = await readSettings(openerOf(d), ctx.cwd);
	ctx.ui.notify(
		cur.ok ? `${key} = ${JSON.stringify(getSetting(cur.data, key) ?? fallback)}` : cur.error,
		cur.ok ? "info" : "error",
	);
}

/** `/config-set` lista; `chave=valor` grava; `chave` mostra. */
export async function configCommand(args: string, ctx: Ctx, d?: Deps): Promise<void> {
	const a = args.trim();
	if (!a) {
		const cur = await readSettings(openerOf(d), ctx.cwd);
		if (!cur.ok) return void ctx.ui.notify(cur.error, "error");
		return void ctx.ui.notify(
			[
				"Configuráveis:",
				...Object.keys(KEYS).map((k) => `  ${k} = ${JSON.stringify(getSetting(cur.data, k) ?? null)}`),
			].join("\n"),
			"info",
		);
	}
	const eq = a.indexOf("=");
	if (eq < 0) {
		if (!Object.hasOwn(KEYS, a)) return void ctx.ui.notify(`chave "${a}" não é configurável aqui.`, "error");
		return show(a, ctx, d, null);
	}
	await apply(a.slice(0, eq).trim(), a.slice(eq + 1), ctx, d);
}

export async function themeCommand(args: string, ctx: Ctx, d?: Deps): Promise<void> {
	const name = args.trim();
	if (!name) {
		const names = ctx.ui.getAllThemes().map((t) => t.name);
		const cur = await readSettings(openerOf(d), ctx.cwd);
		return void ctx.ui.notify(
			`Tema configurado: ${cur.ok ? JSON.stringify(getSetting(cur.data, "theme") ?? "system") : cur.error}. Disponíveis: ${names.join(", ")}`,
			"info",
		);
	}
	await apply("theme", name, ctx, d);
}

export async function tuiCommand(args: string, ctx: Ctx, d?: Deps): Promise<void> {
	if (!args.trim()) return show("tuiMode", ctx, d, "fullscreen");
	await apply("tuiMode", args, ctx, d);
}

export async function scrollSpeedCommand(args: string, ctx: Ctx, d?: Deps): Promise<void> {
	if (!args.trim()) return show("fullscreenWheelScrollLines", ctx, d, "auto");
	await apply("fullscreenWheelScrollLines", args, ctx, d);
}

export async function autocompactCommand(args: string, ctx: Ctx, d?: Deps): Promise<void> {
	if (!args.trim()) return show("compaction.enabled", ctx, d, true);
	await apply("compaction.enabled", args, ctx, d);
}

/** `auto` volta ao `defaultThinkingLevel` configurado (padrão medium); níveis fora da lista são recusados. Só muda a sessão (não grava). */
export async function effortCommand(nycode: Levels, args: string, ctx: Ctx, d?: Deps): Promise<void> {
	const a = args.trim().toLowerCase();
	if (!a || a === "status")
		return void ctx.ui.notify(
			`Esforço (thinking) atual: ${nycode.getThinkingLevel()}. Níveis: auto, ${THINKING_LEVELS.join(", ")}`,
			"info",
		);
	let level: string = a;
	if (a === "auto") {
		const cur = await readSettings(openerOf(d), ctx.cwd);
		const def = cur.ok ? getSetting(cur.data, "defaultThinkingLevel") : undefined;
		level = isLevel(def) ? def : "medium";
	}
	if (!isLevel(level))
		return void ctx.ui.notify(`Nível "${a}" inválido. Use auto ou ${THINKING_LEVELS.join(", ")}.`, "error");
	setLevel(nycode, level, ctx);
}

export function registerConfig(nycode: ExtensionAPI, d: Deps = {}): void {
	const dd: Deps = { ...d, nycode };
	nycode.registerCommand("config-set", {
		description: "Lista/mostra/grava configurações suportadas (chave=valor)",
		handler: (a, ctx) => configCommand(a, ctx, dd),
	});
	nycode.registerCommand("theme-set", {
		description: "Troca o tema (ao vivo) e grava [nome]",
		handler: (a, ctx) => themeCommand(a, ctx, dd),
	});
	nycode.registerCommand("tui-set", {
		description: "Modo de tela regular|fullscreen (aplica ao vivo; senão no próximo início)",
		handler: (a, ctx) => tuiCommand(a, ctx, dd),
	});
	nycode.registerCommand("scroll-speed", {
		description: "Linhas por evento de roda no fullscreen (1-100|auto)",
		handler: (a, ctx) => scrollSpeedCommand(a, ctx, dd),
	});
	nycode.registerCommand("autocompact", {
		description: "Compactação automática on|off",
		handler: (a, ctx) => autocompactCommand(a, ctx, dd),
	});
	nycode.registerCommand("effort", {
		description: "Esforço de raciocínio da sessão: status|auto|off…max",
		handler: (a, ctx) => effortCommand(nycode, a, ctx, dd),
	});
}
