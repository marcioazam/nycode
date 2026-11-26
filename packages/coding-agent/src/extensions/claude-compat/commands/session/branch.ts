/** /clone-as <nome> (de `/branch <nome>`; `/branch` sem nome segue /clone): fork no ponto atual e nome na nova sessão. */
import type { ExtensionAPI } from "../../../../core/extensions/types.ts";

const PENDING = Symbol.for("claude-compat.pending-branch-name");
const holder = globalThis as Record<symbol, string | undefined>;

export function validName(raw: string): string | undefined {
	const n = raw.trim();
	return n && n.length <= 80 && !/[\u0000-\u001f\u007f]/.test(n) ? n : undefined;
}

export function registerBranch(nycode: ExtensionAPI): void {
	// O fork recarrega as extensões: o nome atravessa a troca por globalThis e é aplicado no session_start 'fork'.
	nycode.on("session_start", async (event) => {
		if (event.reason !== "fork") return;
		const name = holder[PENDING];
		holder[PENDING] = undefined;
		if (name) nycode.setSessionName(name);
	});
	nycode.registerCommand("clone-as", {
		description: "Cria uma cópia da conversa no ponto atual com nome: /branch <nome>",
		handler: async (args, ctx) => {
			const name = validName(args);
			if (!name)
				return ctx.ui.notify(
					"Nome inválido (1-80 caracteres, sem controle). Sem nome use /branch (= /clone).",
					"error",
				);
			if (!ctx.isIdle()) return ctx.ui.notify("Agente ocupado: interrompa (Esc) antes de /branch.", "warning");
			const leaf = ctx.sessionManager.getLeafId();
			if (!leaf) return ctx.ui.notify("A sessão ainda não tem mensagens para copiar.", "error");
			holder[PENDING] = name;
			try {
				const { cancelled } = await ctx.fork(leaf, { position: "at" });
				if (cancelled) {
					holder[PENDING] = undefined;
					ctx.ui.notify("/branch cancelado; a sessão atual foi mantida.", "info");
				}
			} catch (e) {
				holder[PENDING] = undefined;
				ctx.ui.notify(`/branch falhou: ${e instanceof Error ? e.message : String(e)}`, "error");
			}
		},
	});
}
