/**
 * /color [nome] (interface.md §3): cor da barra do prompt só da sessão atual, guardada por appendEntry (resume/fork).
 * O desenho vive no controlador do core (constantes SGR fixas); aqui só validação, sorteio e restauração.
 */
import type { ExtensionAPI } from "../../../core/extensions/types.ts";
import { COLOR_NAMES, type ColorName, type Controls, echo, getControls, MISSING } from "./controls.ts";

export const COLOR_ENTRY = "claude-prompt-color";

export interface ColorDeps {
	controls?: () => Controls | undefined;
	random?: () => number;
}
type Ctx = {
	ui: { notify(m: string, t?: "info" | "warning" | "error"): void };
	sessionManager: { getEntries(): unknown[] };
};

const isColor = (v: unknown): v is ColorName | "default" =>
	v === "default" || (COLOR_NAMES as readonly string[]).includes(v as string);

/** Última cor válida guardada na sessão (entradas copiadas por resume/fork); sem entrada = default. */
export function savedColor(entries: unknown[]): ColorName | "default" {
	for (let i = entries.length - 1; i >= 0; i--) {
		const e = entries[i] as { type?: string; customType?: string; data?: { color?: unknown } };
		if (e?.type === "custom" && e.customType === COLOR_ENTRY && isColor(e.data?.color)) return e.data.color;
	}
	return "default";
}

export async function colorCommand(
	args: string,
	ctx: Ctx,
	nycode: Pick<ExtensionAPI, "appendEntry">,
	d: ColorDeps = {},
): Promise<void> {
	const controls = (d.controls ?? getControls)();
	if (!controls) return ctx.ui.notify(MISSING, "error");
	const a = args.trim().toLowerCase();
	let pick: ColorName | "default";
	if (a === "") {
		const pool = COLOR_NAMES.filter((c) => c !== controls.getPromptColor());
		pick = pool[Math.min(pool.length - 1, Math.floor((d.random ?? Math.random)() * pool.length))];
	} else if (isColor(a)) pick = a;
	else
		return ctx.ui.notify(`Cor "${echo(args)}" inválida. Cores: ${[...COLOR_NAMES, "default"].join(", ")}.`, "error");
	try {
		controls.setPromptColor(pick);
	} catch (e) {
		return ctx.ui.notify(`Cor não aplicada: ${e instanceof Error ? e.message : String(e)}`, "error");
	}
	nycode.appendEntry(COLOR_ENTRY, { color: pick });
	ctx.ui.notify(
		pick === "default" ? "Barra do prompt restaurada à cor padrão." : `Barra do prompt: ${pick} (só esta sessão).`,
		"info",
	);
}

export function registerColor(nycode: ExtensionAPI, d: ColorDeps = {}): void {
	nycode.registerCommand("color", {
		description:
			"Cor da barra do prompt desta sessão: red, blue, green, yellow, purple, orange, pink, cyan ou default; sem argumento sorteia",
		handler: async (args, ctx) => colorCommand(args, ctx, nycode, d),
	});
	nycode.on("session_start", async (_e, ctx) => {
		try {
			(d.controls ?? getControls)()?.setPromptColor(savedColor(ctx.sessionManager.getEntries()));
		} catch {
			/* nunca bloqueia a sessão */
		}
	});
}
