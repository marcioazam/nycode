/** Liga o renderer da mensagem `plan-mode-execute` (mensagem.ts) ao ramo da sessão atual. */
import type { ExtensionAPI } from "../../../core/extensions/types.ts";
import { tuiAtual } from "../compact.ts";
import { blocoPlano } from "./bloco.ts";
import { animador, renderPlano } from "./mensagem.ts";

type Gerente = { getBranch: () => Record<string, any>[]; getLeafId: () => string | null };

export default function plano(nycode: ExtensionAPI) {
	let sm: Gerente | undefined;
	let cache: { folha: string | null; ramo: Record<string, any>[] } | undefined;
	const guarda = (ctx: { sessionManager?: unknown }) => {
		sm = ctx.sessionManager as Gerente | undefined;
		cache = undefined;
	};
	nycode.on("session_start", (_e, ctx) => guarda(ctx));
	nycode.on("turn_start", (_e, ctx) => {
		if (!sm) guarda(ctx);
	});
	// O ramo só é relido quando a folha muda: o desenho roda a cada quadro.
	const entradas = () => {
		try {
			const folha = sm?.getLeafId() ?? null;
			if (!sm) return undefined;
			if (cache?.folha !== folha) cache = { folha, ramo: sm.getBranch() };
			return cache.ramo;
		} catch {
			return undefined;
		}
	};
	const animar = animador(() => (tuiAtual() as { requestRender?: () => void } | undefined)?.requestRender?.());
	// O patch plan-bloco-hook do nycode consulta este gancho a cada bloco de plano (tags, espera, bloqueio, cancelamento).
	(globalThis as { __nyPlanoBloco?: unknown }).__nyPlanoBloco = (e: Parameters<typeof blocoPlano>[0]) =>
		blocoPlano(e, { animar });
	nycode.registerMessageRenderer?.(
		"plan-mode-execute",
		(msg, o, theme) => renderPlano(msg as never, o.expanded, theme as never, { entradas, animar }) as never,
	);
}
