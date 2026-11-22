// K18: the per-session compaction limit (/contexto) moves the native reserve; K9 reads the same override.
import { afterEach, describe, expect, it } from "vitest";
import {
	getSessionCompactAt,
	reserveWithSessionLimit,
	setSessionCompactAt,
} from "../../../../src/core/compaction/session-limit.ts";
import { SettingsManager } from "../../../../src/core/settings-manager.ts";

afterEach(() => setSessionCompactAt(undefined));

describe("session compaction limit", () => {
	it("only a positive safe integer counts", () => {
		setSessionCompactAt(400_000);
		expect(getSessionCompactAt()).toBe(400_000);
		for (const bad of [0, -1, Number.NaN, 1.5, undefined]) {
			setSessionCompactAt(bad);
			expect(getSessionCompactAt()).toBeUndefined();
		}
	});

	it("reserve is window - limit, never earlier than the configured one and never with the limit above the window", () => {
		expect(reserveWithSessionLimit(16_384, 1_000_000)).toBe(16_384);
		setSessionCompactAt(400_000);
		expect(reserveWithSessionLimit(16_384, 1_000_000)).toBe(16_384); // 600k reserve would compact earlier: keep the configured
		expect(reserveWithSessionLimit(700_000, 1_000_000)).toBe(600_000);
		expect(reserveWithSessionLimit(700_000, 400_000)).toBe(700_000); // window not above the limit
		expect(reserveWithSessionLimit(700_000, undefined)).toBe(700_000);
	});

	it("K18: the settings manager applies it to the reserve of the model in use", () => {
		const settings = SettingsManager.inMemory({ compaction: { reserveTokens: 700_000 } });
		const model = { provider: "p", id: "m", contextWindow: 1_000_000 };
		expect(settings.getCompactionSettings(model).reserveTokens).toBe(700_000);
		setSessionCompactAt(500_000);
		expect(settings.getCompactionSettings(model).reserveTokens).toBe(500_000);
		expect(settings.getCompactionReserveTokens({ provider: "p", id: "m" })).toBe(700_000); // no window: unchanged
		setSessionCompactAt(undefined);
		expect(settings.getCompactionSettings(model).reserveTokens).toBe(700_000);
	});
});
