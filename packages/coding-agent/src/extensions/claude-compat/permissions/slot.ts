/** Slot global do controlador de modos: o UiEditor/outras extensões chamam current()/cycle()/select()/setBypass(). */
import type { ModeResult, PermissionModes } from "./controller.ts";

export const PERMISSION_MODES_SLOT = Symbol.for("nycode.permission-modes");
const g = globalThis as Record<symbol, unknown>;

const isApi = (v: unknown): v is PermissionModes => {
	if (!v || typeof v !== "object") return false;
	const o = v as Record<string, unknown>;
	return (
		typeof o.current === "function" &&
		typeof o.cycle === "function" &&
		typeof o.select === "function" &&
		typeof o.setBypass === "function" &&
		typeof o.status === "function"
	);
};

/** Registra a API pública; o retorno remove SÓ o slot próprio (um controlador novo pode já ter assumido). */
export function registerPermissionModes(api: PermissionModes): () => void {
	g[PERMISSION_MODES_SLOT] = api;
	return () => {
		if (g[PERMISSION_MODES_SLOT] === api) delete g[PERMISSION_MODES_SLOT];
	};
}

export function getPermissionModes(): PermissionModes | undefined {
	const v = g[PERMISSION_MODES_SLOT];
	return isApi(v) ? v : undefined;
}

/** Atalho para o UiEditor: nunca lança; sem controlador devolve erro explícito (o chamador usa o fallback manual/plan). */
export function cyclePermissionMode(): ModeResult | undefined {
	try {
		return getPermissionModes()?.cycle();
	} catch (e) {
		return { ok: false, error: `Falha ao trocar o modo de permissão: ${e instanceof Error ? e.message : String(e)}` };
	}
}
