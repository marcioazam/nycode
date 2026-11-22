// plano/index.ts: wires the plan-mode-execute renderer and the block hook to the current session branch.
import { afterEach, describe, expect, it } from "vitest";
import type { ExtensionAPI } from "../../../../../src/core/extensions/types.ts";
import plano from "../../../../../src/extensions/ui-visual/plano/index.ts";

type Handler = (event: unknown, ctx: unknown) => void;
type Renderer = (msg: unknown, opts: { expanded: boolean }, theme: unknown) => unknown;

function setup() {
	const handlers: Record<string, Handler> = {};
	const renderers: Record<string, Renderer> = {};
	const api = {
		on: (name: string, h: Handler) => {
			handlers[name] = h;
		},
		registerMessageRenderer: (type: string, r: Renderer) => {
			renderers[type] = r;
		},
	} as unknown as ExtensionAPI;
	plano(api);
	return { handlers, renderers };
}

const hook = () => (globalThis as { __nyPlanoBloco?: unknown }).__nyPlanoBloco;

afterEach(() => {
	delete (globalThis as { __nyPlanoBloco?: unknown }).__nyPlanoBloco;
});

describe("plano wiring", () => {
	it("registers the renderer and the block hook", () => {
		const { renderers, handlers } = setup();
		expect(typeof renderers["plan-mode-execute"]).toBe("function");
		expect(typeof hook()).toBe("function");
		expect(Object.keys(handlers).sort()).toEqual(["session_start", "turn_start"]);
	});

	it("renders from the session branch, rereads it only when the leaf changes and survives a failing manager", () => {
		const { renderers, handlers } = setup();
		let leaf = "a";
		let reads = 0;
		const sessionManager = {
			getLeafId: () => leaf,
			getBranch: () => {
				reads++;
				return [];
			},
		};
		handlers.session_start?.({}, { sessionManager });
		const theme = { fg: (_c: string, t: string) => t, bold: (t: string) => t };
		const message = { content: "plano", timestamp: Date.now() - 60_000 };
		const component = renderers["plan-mode-execute"]?.(message, { expanded: false }, theme) as {
			render(width: number): string[];
		};
		expect(renderers["plan-mode-execute"]?.(message, { expanded: true }, theme)).toBeUndefined();
		component.render(80);
		component.render(80);
		expect(reads).toBe(1);
		leaf = "b";
		component.render(80);
		expect(reads).toBe(2);
		const broken = {
			getLeafId: () => {
				throw new Error("gone");
			},
			getBranch: () => [],
		};
		handlers.session_start?.({}, { sessionManager: broken });
		expect(() => component.render(80)).not.toThrow();
	});

	it("keeps the first session manager on turn_start and the block hook ignores a state without theme", () => {
		const { handlers } = setup();
		const manager = { getLeafId: () => "x", getBranch: () => [] };
		handlers.turn_start?.({}, { sessionManager: manager });
		handlers.turn_start?.({}, { sessionManager: undefined });
		const bloco = hook() as (s: unknown) => unknown;
		expect(bloco({ kind: "tags", nums: [], reason: "" })).toBeUndefined();
	});
});
