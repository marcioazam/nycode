/** Leitor validado do controlador global do patch ui-controls (docs/specs/claude-code-parity/interface.md §2). */
export const CONTROLS_KEY = Symbol.for("nycode.ui-controls");
export const COLOR_NAMES = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"] as const;
export type ColorName = (typeof COLOR_NAMES)[number];

export interface Controls {
	apiVersion: 1;
	mode(): "regular" | "fullscreen";
	setFocus(on: boolean): void;
	/** Troca o modo de tela ao vivo (switchTuiMode do core); lança com o motivo se o core recusar. Ausente em runtimes antigos. */
	setTuiMode?(mode: "regular" | "fullscreen"): void;
	isFocus(): boolean;
	setPromptColor(name: ColorName | "default"): void;
	getPromptColor(): string;
	reset(): void;
}

const METHODS = ["mode", "setFocus", "isFocus", "setPromptColor", "getPromptColor", "reset"] as const;

/** Devolve o controlador só se a forma bate; ausente ou de outra versão = `undefined` (capacidade ausente, nada simulado). */
export function getControls(holder: object = globalThis): Controls | undefined {
	const c = (holder as Record<symbol, unknown>)[CONTROLS_KEY] as Record<string, unknown> | undefined;
	if (!c || typeof c !== "object" || c.apiVersion !== 1) return undefined;
	return METHODS.every((m) => typeof c[m] === "function") ? (c as unknown as Controls) : undefined;
}

export const MISSING =
	"Capacidade ausente: o core do nycode não tem o controle de interface (patch ui-controls, ainda não portado). Nada foi alterado.";

/** Eco seguro de um argumento digitado: sem controles/escape nas mensagens. */
export const echo = (raw: string): string =>
	raw
		.trim()
		.slice(0, 20)
		.replace(/[\u0000-\u001f\u007f-\u009f]/g, "?");
