import assert from "node:assert";
import type { EventEmitter } from "node:events";
import { describe, it } from "node:test";
import { Text } from "../src/components/text.ts";
import {
	getPrimaryScrollSnapshot,
	isSelectionPressActive,
	observeTerminalInput,
	replaceScrollToEndIndicator,
} from "../src/public-hooks.ts";
import { TuiAltScreen } from "../src/tui-alt-screen.ts";
import { TuiMainScreen } from "../src/tui-main-screen.ts";
import { VirtualTerminal } from "./virtual-terminal.ts";

const content = Array.from({ length: 30 }, (_, i) => `line ${i}`).join("\n");

describe("public hooks (seam K10)", () => {
	it("reads the primary scroll area of the last frame and scrolls it", async () => {
		const terminal = new VirtualTerminal(20, 5);
		const tui = new TuiAltScreen(terminal);
		try {
			tui.addChild(new Text(content, 0, 0));
			assert.strictEqual(getPrimaryScrollSnapshot(tui), undefined, "no frame yet");
			tui.start();
			await terminal.waitForRender();
			const snapshot = getPrimaryScrollSnapshot(tui);
			assert.ok(snapshot);
			assert.strictEqual(snapshot.contentLines.length, 30);
			assert.deepStrictEqual(snapshot.rect, { x: 0, y: 0, width: 20, height: 5 });
			assert.strictEqual(snapshot.scrollTop, 25, "follows the end of the content");
			assert.strictEqual(snapshot.isFollowingEnd, true);

			snapshot.scrollTo(3, { disableFollow: true });
			await terminal.waitForRender();
			assert.strictEqual(getPrimaryScrollSnapshot(tui)?.scrollTop, 3);
			assert.strictEqual(getPrimaryScrollSnapshot(tui)?.isFollowingEnd, false, "scrolled away from the end");
		} finally {
			tui.stop();
		}
	});

	it("has no scroll snapshot and no selection outside fullscreen mode", async () => {
		const terminal = new VirtualTerminal(20, 5);
		const tui = new TuiMainScreen(terminal);
		try {
			tui.addChild(new Text(content, 0, 0));
			tui.start();
			await terminal.waitForRender();
			assert.strictEqual(getPrimaryScrollSnapshot(tui), undefined);
			assert.strictEqual(isSelectionPressActive(tui), false);
		} finally {
			tui.stop();
		}
	});

	it("reports a mouse press as an active selection until the release", async () => {
		const terminal = new VirtualTerminal(20, 5);
		const tui = new TuiAltScreen(terminal);
		try {
			tui.addChild(new Text(content, 0, 0));
			tui.start();
			await terminal.waitForRender();
			assert.strictEqual(isSelectionPressActive(tui), false);
			terminal.sendInput("\x1b[<0;3;2M");
			assert.strictEqual(isSelectionPressActive(tui), true);
			terminal.sendInput("\x1b[<0;3;2m");
			assert.strictEqual(isSelectionPressActive(tui), false);
		} finally {
			tui.stop();
		}
	});

	it("observes raw stdin chunks until unsubscribed, without consuming them", () => {
		const seen: string[] = [];
		const stdin = process.stdin as unknown as EventEmitter;
		const before = stdin.listenerCount("data");
		const off = observeTerminalInput((chunk) => seen.push(chunk));
		stdin.emit("data", Buffer.from("\x1b[I"));
		stdin.emit("data", "abc");
		assert.deepStrictEqual(seen, ["\x1b[I", "abc"]);
		off();
		stdin.emit("data", "later");
		assert.deepStrictEqual(seen, ["\x1b[I", "abc"]);
		assert.strictEqual(stdin.listenerCount("data"), before);
		process.stdin.pause(); // a data listener put stdin in flowing mode, which would keep the test process alive
	});

	it("replaces the jump-to-end label while scrolled away and restores the previous one", async () => {
		const terminal = new VirtualTerminal(30, 5);
		const tui = new TuiAltScreen(terminal, false, undefined, { scrollToEndIndicator: () => "ORIGINAL" });
		try {
			tui.addChild(new Text(content, 0, 0));
			tui.start();
			await terminal.waitForRender();
			let seen: (() => string) | undefined;
			const restore = replaceScrollToEndIndicator(tui, (current) => {
				seen = current;
				return () => " VOLTAR AO FIM ";
			});
			assert.strictEqual(seen?.(), "ORIGINAL");
			getPrimaryScrollSnapshot(tui)?.scrollTo(3, { disableFollow: true });
			await terminal.waitForRender();
			assert.ok(terminal.getViewport().join("\n").includes("VOLTAR AO FIM"));
			restore();
			getPrimaryScrollSnapshot(tui)?.scrollTo(4, { disableFollow: true });
			await terminal.waitForRender();
			assert.ok(terminal.getViewport().join("\n").includes("ORIGINAL"));
		} finally {
			tui.stop();
		}
	});

	it("restoring the jump-to-end label after the renderer left fullscreen mode does not throw", () => {
		// InteractiveMode hands extensions a stable reference whose target changes when the renderer is replaced.
		const alt = new TuiAltScreen(new VirtualTerminal(20, 5), false, undefined, {
			scrollToEndIndicator: () => "ORIGINAL",
		});
		const main = new TuiMainScreen(new VirtualTerminal(20, 5));
		let current: TuiAltScreen | TuiMainScreen = alt;
		const reference = new Proxy({} as TuiAltScreen, {
			get: (_target, property) => {
				const value = Reflect.get(current, property, current);
				return typeof value === "function" ? value.bind(current) : value;
			},
			getPrototypeOf: () => Reflect.getPrototypeOf(current),
		});
		const restore = replaceScrollToEndIndicator(reference, () => () => "NOVO");
		assert.strictEqual(alt.getScrollToEndIndicator()?.(), "NOVO");
		current = main;
		assert.doesNotThrow(restore);
	});

	it("replacing the jump-to-end label is a no-op outside fullscreen mode", () => {
		const tui = new TuiMainScreen(new VirtualTerminal(20, 5));
		let called = false;
		const restore = replaceScrollToEndIndicator(tui, () => {
			called = true;
			return () => "";
		});
		restore();
		assert.strictEqual(called, false);
	});
});
