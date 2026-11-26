import { afterEach, describe, expect, it, vi } from "vitest";
import { cancelIdleCollection, collectWhenIdle } from "../src/modes/interactive/mode-actions/events.ts";

describe("collectWhenIdle", () => {
	afterEach(() => {
		cancelIdleCollection();
		vi.useRealTimers();
	});

	it("runs one forced collection after the quiet time, restarting it on each call", () => {
		vi.useFakeTimers();
		const gc = vi.fn();
		collectWhenIdle(100, gc);
		vi.advanceTimersByTime(60);
		collectWhenIdle(100, gc);
		vi.advanceTimersByTime(60);
		expect(gc).not.toHaveBeenCalled();
		vi.advanceTimersByTime(40);
		expect(gc).toHaveBeenCalledOnce();
		expect(gc).toHaveBeenCalledWith(true);
		vi.advanceTimersByTime(1000);
		expect(gc).toHaveBeenCalledOnce();
	});

	it("does not collect once a run starts", () => {
		vi.useFakeTimers();
		const gc = vi.fn();
		collectWhenIdle(100, gc);
		cancelIdleCollection();
		vi.advanceTimersByTime(1000);
		expect(gc).not.toHaveBeenCalled();
	});

	it("schedules nothing without a runtime collector (Node)", () => {
		vi.useFakeTimers();
		collectWhenIdle(100, undefined);
		expect(vi.getTimerCount()).toBe(0);
	});
});
