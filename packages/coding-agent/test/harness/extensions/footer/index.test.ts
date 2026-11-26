// Footer extension: renders only the extension statuses (sorted, joined by " · ", sanitized, truncated to the width),
// hiding HIDDEN keys and the keys the HUD absorbed through the bridge. Driven with a fake ExtensionAPI.
import { visibleWidth } from "@nycode/tui";
import { describe, expect, it } from "vitest";
import type { ExtensionAPI, ExtensionContext } from "../../../../src/core/extensions/types.ts";
import footerExtension from "../../../../src/extensions/footer/index.ts";

interface Bridge {
	footerData: { getExtensionStatuses(): Map<string, string> };
	absorbed: Set<string>;
	folded: boolean;
}

type Handler = (event: unknown, ctx: ExtensionContext) => void;
type Built = { render(width: number): string[] };

/** Mounts the footer with the given statuses; `onBridge` runs when the footer publishes on the bridge channel. */
function mount(statuses: Map<string, string>, onBridge?: (bridge: Bridge) => void, settings: object = {}) {
	let handler: Handler | undefined;
	let built: Built | undefined;
	let channel: string | undefined;
	let published: Bridge | undefined;
	const api = {
		getSettings: () => settings,
		on: (_name: string, fn: Handler) => {
			handler = fn;
		},
		events: {
			emit: (name: string, bridge: Bridge) => {
				channel = name;
				published = bridge;
				onBridge?.(bridge);
			},
		},
	};
	footerExtension(api as unknown as ExtensionAPI);
	const theme = { fg: (_color: string, text: string) => text };
	const footerData = { getExtensionStatuses: () => statuses };
	const ui = {
		setFooter: (factory: (tui: unknown, theme: unknown, data: unknown) => Built) => {
			built = factory(undefined, theme, footerData);
		},
	};
	const usage = { input: 1200, output: 340, cacheRead: 5000, cacheWrite: 0, cost: { total: 0.0421 } };
	const ctx = {
		ui,
		model: { id: "model-x" },
		getContextUsage: () => ({ tokens: 20_000, contextWindow: 200_000, percent: 10 }),
		sessionManager: { getEntries: () => [{ type: "message", message: { role: "assistant", usage } }] },
	};
	handler?.({}, ctx as unknown as ExtensionContext);
	return { footer: built as Built, channel, bridge: published as Bridge };
}

describe("footer extension", () => {
	it("publishes the provider on the footer bridge channel", () => {
		const { channel, bridge } = mount(new Map());
		expect(channel).toBe("nycode:footer-bridge");
		expect(bridge.absorbed.size).toBe(0);
		expect(bridge.folded).toBe(false);
	});

	it("the bridge hands the HUD the same data without the hidden statuses", () => {
		const { bridge } = mount(
			new Map([
				["nycode-status", "x"],
				["ponytail", "y"],
				["goal", "alvo"],
			]),
		);
		expect([...bridge.footerData.getExtensionStatuses().keys()]).toEqual(["goal"]);
	});

	it("renders the statuses sorted by key, joined by a dim separator, whitespace collapsed", () => {
		const statuses = new Map([
			["zeta", "last"],
			["alpha", "  first\tone\n"],
			["empty", ""],
		]);
		const { footer } = mount(statuses);
		expect(footer.render(80)).toEqual(["first one · last"]);
	});

	it("hides nycode-status, ponytail and the keys the HUD absorbed", () => {
		const statuses = new Map([
			["nycode-status", "turn 3 $0.10"],
			["ponytail", "PONYTAIL"],
			["plan-mode", "📋 3/8"],
			["bypass", "BYPASS"],
		]);
		const { footer, bridge } = mount(statuses, (b) => b.absorbed.add("plan-mode"));
		expect(footer.render(80)).toEqual(["BYPASS"]);
		expect(bridge.absorbed.has("plan-mode")).toBe(true);
	});

	it("renders nothing when no status is visible", () => {
		const { footer } = mount(new Map([["ponytail", "PONYTAIL"]]));
		expect(footer.render(80)).toEqual([]);
	});

	it("truncates to the width", () => {
		const { footer } = mount(new Map([["a", "x".repeat(40)]]));
		const lines = footer.render(10);
		expect(lines).toHaveLength(1);
		expect(visibleWidth(lines[0] ?? "")).toBeLessThanOrEqual(10);
	});

	it("footer.stats is off by default: no stats line", () => {
		const { footer } = mount(new Map([["a", "x"]]));
		expect(footer.render(80)).toEqual(["x"]);
	});

	it("footer.stats=true adds a tokens, cost, context and model line above the statuses", () => {
		const { footer } = mount(new Map([["a", "x"]]), undefined, { footer: { stats: true } });
		expect(footer.render(80)).toEqual(["↑1.2k ↓340 R5.0k $0.042 10.0%/200k model-x", "x"]);
		expect(mount(new Map(), undefined, { footer: { stats: true } }).footer.render(80)).toHaveLength(1);
	});
});
