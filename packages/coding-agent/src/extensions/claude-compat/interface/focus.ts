/**
 * /focus e viewMode (interface.md §3). `/focus` alterna e persiste `viewMode` global; `/focus on|off` só vale na sessão.
 * O filtro é visual e vive no core (controlador global); aqui só validação, persistência e ciclo de vida.
 */
import type { ExtensionAPI } from "../../../core/extensions/types.ts";
import { getSetting, type Opener, readSettings, realOpener, setSetting } from "../commands/settings/store.ts";
import { type Controls, echo, getControls, MISSING } from "./controls.ts";

export interface FocusDeps {
	open?: Opener;
	controls?: () => Controls | undefined;
}

type Ctx = { cwd: string; ui: { notify(m: string, t?: "info" | "warning" | "error"): void } };

const USAGE = "Uso: /focus (alterna e salva) | /focus on | /focus off (só esta sessão, nada é salvo).";

export async function focusCommand(args: string, ctx: Ctx, d: FocusDeps = {}): Promise<void> {
	const controls = (d.controls ?? getControls)();
	if (!controls) return ctx.ui.notify(MISSING, "error");
	const a = args.trim().toLowerCase();
	if (a !== "" && a !== "on" && a !== "off")
		return ctx.ui.notify(`Argumento "${echo(args)}" inválido. ${USAGE}`, "error");
	const next = a === "" ? !controls.isFocus() : a === "on";
	try {
		controls.setFocus(next);
	} catch (e) {
		return ctx.ui.notify(`Modo foco indisponível: ${e instanceof Error ? e.message : String(e)}`, "error");
	}
	const label = next ? "ligado" : "desligado";
	if (a !== "") return ctx.ui.notify(`Modo foco ${label} só nesta sessão (nada foi salvo).`, "info");
	const r = await setSetting(d.open ?? realOpener, ctx.cwd, "viewMode", next ? "focus" : "default");
	if (r.ok) ctx.ui.notify(`Modo foco ${label}; viewMode = "${r.value}" salvo em settings.json.`, "info");
	else ctx.ui.notify(`Modo foco ${label} agora, mas não foi possível salvar: ${r.error}`, "warning");
}

/** Aplica o `viewMode` salvo (valor inválido ou tela regular = vista normal, sem erro fatal). */
export async function applyViewMode(ctx: Ctx, d: FocusDeps = {}): Promise<void> {
	const controls = (d.controls ?? getControls)();
	if (!controls) return;
	const cur = await readSettings(d.open ?? realOpener, ctx.cwd);
	const want = cur.ok && getSetting(cur.data, "viewMode") === "focus" && controls.mode() === "fullscreen";
	try {
		controls.setFocus(want);
	} catch (e) {
		ctx.ui.notify(`Modo foco não aplicado: ${e instanceof Error ? e.message : String(e)}`, "warning");
	}
}

export function registerFocus(nycode: ExtensionAPI, d: FocusDeps = {}): void {
	nycode.registerCommand("focus", {
		description:
			"Modo foco (tela cheia): só o último prompt, resumo das ferramentas e a resposta final. /focus on|off vale só na sessão",
		handler: async (args, ctx) => focusCommand(args, ctx, d),
	});
	nycode.on("session_start", async (_e, ctx) => applyViewMode(ctx, d));
	nycode.on("session_shutdown", async () => {
		try {
			(d.controls ?? getControls)()?.reset();
		} catch {
			/* o core pode já estar encerrando */
		}
	});
}
