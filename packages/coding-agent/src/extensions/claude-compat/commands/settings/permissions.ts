/**
 * /permissions e /allowed-tools: troca o modo local (ask|auto|plan; aliases default|manual|acceptEdits) e liga/desliga o bypass
 * (`bypass on|off`, independente do modo) pelo controlador e exibe o estado; `tools on|off` só RESTRINGE ferramentas ativas (reversível apenas para o que este comando desligou).
 * A autorização é do motor nativo de permissões (core/permissions); aqui não há decisão de permissão. Auto = acceptEdits.
 */
import type { ExtensionAPI, ExtensionCommandContext } from "../../../../core/extensions/types.ts";
import type { PermissionModes } from "../../permissions/controller.ts";
import { PLAN_MODE_CHANNEL } from "../../permissions/plan-bridge.ts";
import { installPermissionModes, sinkFor } from "../../permissions/wiring.ts";

export { PLAN_MODE_CHANNEL };
const MODE_WORDS = ["ask", "default", "manual", "auto", "acceptedits", "plan"];
type Events = Pick<ExtensionAPI, "events">;

/** Observa o plan mode pelo barramento do nycode (sem importar o módulo dele). */
export function trackPlanMode(nycode: Events): () => boolean {
	let active = false;
	nycode.events.on(PLAN_MODE_CHANNEL, (d: unknown) => {
		if (d && typeof d === "object" && typeof (d as { active?: unknown }).active === "boolean")
			active = (d as { active: boolean }).active;
	});
	return () => active;
}

type Tools = Pick<ExtensionAPI, "getActiveTools" | "getAllTools" | "setActiveTools">;
type Ctx = Pick<ExtensionCommandContext, "ui">;

export function createPermissions(
	tools: Tools,
	planActive: () => boolean,
	env: NodeJS.ProcessEnv = process.env,
	modes?: PermissionModes,
) {
	const disabled = new Set<string>();
	return (args: string, ctx: Ctx): void => {
		const [sub, verb, name] = args.trim().split(/\s+/).filter(Boolean);
		const active = tools.getActiveTools();
		// bypassPermissions (legado) = bypass on; o bypass é independente do modo (bypass-orthogonal.md).
		const on =
			sub?.toLowerCase() === "bypasspermissions"
				? true
				: sub?.toLowerCase() === "bypass" && (verb === "on" || verb === "off")
					? verb === "on"
					: undefined;
		if (on !== undefined) {
			if (modes) modes.setBypass(on, { explicit: true });
			else ctx.ui.notify("Controlador de modos indisponível: o bypass não foi alterado.", "error");
			return;
		}
		if (sub?.toLowerCase() === "bypass") {
			ctx.ui.notify("Uso: /permissions bypass on|off", "error");
			return;
		}
		if (sub && MODE_WORDS.includes(sub.toLowerCase())) {
			// O controlador notifica o resultado (sucesso ou erro) pelo sink da sessão.
			if (!modes)
				return void ctx.ui.notify(
					"Controlador de modos indisponível: o modo de permissão não foi alterado.",
					"error",
				);
			modes.select(sub, { explicit: true });
			return;
		}
		if (!sub || sub === "show" || sub === "status") {
			const st = modes?.status();
			const bypass = st ? st.bypass : env.NYCODE_BYPASS_PERMISSIONS === "1";
			return void ctx.ui.notify(
				[
					st
						? `Modo de permissão: ${st.label} · bypass: ${bypass ? "ligado" : "desligado"}${st.bypassAvailable ? "" : " (indisponível: --safe; /permissions bypass on opta)"}`
						: "",
					`Plan mode: ${planActive() ? "ativo" : "inativo"}${st ? "" : ` | bypass: ${bypass ? "ligado (nycode --safe ou /bypass desliga)" : "desligado"}`}`,
					`Ferramentas ativas (${active.length}): ${active.join(", ")}`,
					disabled.size ? `Desligadas por este comando: ${[...disabled].join(", ")}` : "",
					"Uso: /permissions ask|auto|plan|status · bypass on|off · tools on|off <ferramenta>. Deny, segredos e guardas não mudam em nenhum modo.",
				]
					.filter(Boolean)
					.join("\n"),
				"info",
			);
		}
		if (sub !== "tools" || (verb !== "on" && verb !== "off") || !name)
			return void ctx.ui.notify(
				"Uso: /permissions [status] | ask|auto|plan | bypass on|off | tools on|off <ferramenta>",
				"error",
			);
		if (planActive()) return void ctx.ui.notify("Plan mode ativo: as ferramentas não podem ser alteradas.", "error");
		if (!tools.getAllTools().some((t) => t.name === name))
			return void ctx.ui.notify(`Ferramenta "${name}" desconhecida.`, "error");
		if (verb === "off") {
			if (!active.includes(name)) return void ctx.ui.notify(`"${name}" já está inativa.`, "info");
			tools.setActiveTools(active.filter((t) => t !== name));
			disabled.add(name);
			return void ctx.ui.notify(`"${name}" desligada nesta sessão.`, "info");
		}
		if (!disabled.has(name))
			return void ctx.ui.notify(
				`"${name}" não foi desligada por este comando; só o que ele restringiu pode ser religado.`,
				"error",
			);
		tools.setActiveTools([...active, name]);
		disabled.delete(name);
		ctx.ui.notify(`"${name}" religada.`, "info");
	};
}

export function registerPermissions(nycode: ExtensionAPI, planActive: () => boolean): void {
	const controller = installPermissionModes(nycode);
	const run = createPermissions(nycode, planActive, process.env, controller);
	for (const n of ["permissions", "allowed-tools"]) {
		nycode.registerCommand(n, {
			description: "Modo de permissão (ask|auto|plan|status), bypass on|off e tools on|off",
			handler: async (a, ctx) => {
				controller.bind(sinkFor(ctx));
				run(a, ctx);
			},
		});
	}
}
