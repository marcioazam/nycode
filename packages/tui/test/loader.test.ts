import assert from "node:assert";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { Loader } from "../src/components/loader.ts";
import type { TUI } from "../src/tui.ts";

// Loader reads performance.now(); node:test mocks only the timers, so the clock is stubbed alongside them.
let now = 0;
const realNow = performance.now.bind(performance);

function advance(ms: number): void {
	for (let step = 0; step < ms; step++) {
		now += 1;
		mock.timers.tick(1);
	}
}

function makeLoader(): { loader: Loader; renders: () => number } {
	let count = 0;
	const ui = { requestRender: () => count++ } as unknown as TUI;
	const loader = new Loader(
		ui,
		(s) => s,
		(s) => s,
		"msg",
		{ frames: ["a", "b", "c", "d"], intervalMs: 80 },
	);
	count = 0;
	return { loader, renders: () => count };
}

const frameOf = (loader: Loader): string => loader.render(20)[1]!.trim()[0]!;

describe("Loader", () => {
	beforeEach(() => {
		now = 0;
		Object.defineProperty(performance, "now", { value: () => now, configurable: true });
		mock.timers.enable({ apis: ["setTimeout"] });
	});
	afterEach(() => {
		mock.timers.reset();
		Object.defineProperty(performance, "now", { value: realNow, configurable: true });
	});

	it("advances one frame per interval and asks for a render when nothing else drew it", () => {
		const { loader, renders } = makeLoader();
		assert.strictEqual(frameOf(loader), "a");
		advance(800);
		assert.strictEqual(renders(), 9); // wakes at 120, 200, …, 760 ms: half a frame after each boundary
		assert.strictEqual(frameOf(loader), "c"); // 800 ms / 80 ms = frame 10, 10 % 4 = 2
		loader.stop();
	});

	it("adds no render of its own while another animation renders every frame", () => {
		const { loader, renders } = makeLoader();
		const seen: string[] = [];
		for (let t = 0; t < 800; t += 33) {
			advance(33);
			seen.push(frameOf(loader));
		}
		assert.strictEqual(renders(), 0);
		assert.deepStrictEqual([...new Set(seen)].sort(), ["a", "b", "c", "d"]);
		loader.stop();
	});

	it("stops asking for renders after stop() and resumes from the shown frame on start()", () => {
		const { loader, renders } = makeLoader();
		advance(100);
		assert.strictEqual(frameOf(loader), "b");
		loader.stop();
		const before = renders();
		advance(1000);
		assert.strictEqual(renders(), before);
		assert.strictEqual(frameOf(loader), "b");
		loader.start();
		assert.strictEqual(frameOf(loader), "b");
		loader.stop();
	});

	it("a single frame never schedules a timer", () => {
		let count = 0;
		const ui = { requestRender: () => count++ } as unknown as TUI;
		const loader = new Loader(
			ui,
			(s) => s,
			(s) => s,
			"msg",
			{ frames: ["●"] },
		);
		count = 0;
		advance(500);
		assert.strictEqual(count, 0);
		assert.strictEqual(frameOf(loader), "●");
	});
});
