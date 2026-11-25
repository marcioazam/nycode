/**
 * Event shaping of the monitor tool, after Claude Code's Monitor: stdout lines within BATCH_WINDOW_MS of the first form
 * one event; lines and events are cut at fixed lengths; each event spends a token of an allowance (FLOOD_BURST at once,
 * one more every FLOOD_REFILL_MS); suppressed events are counted and the count goes out before the next delivered one;
 * a monitor suppressed for SUPPRESSION_LIMIT_MS without a break is stopped. Time is a monotonic clock.
 */

import { performance } from "node:perf_hooks";

export const DEFAULT_DEADLINE_MS = 5 * 60_000;
export const MAX_DEADLINE_MS = 30 * 60_000;
export const MIN_DEADLINE_MS = 1_000;
export const BATCH_WINDOW_MS = 200;
export const MAX_LINE_CHARS = 500;
export const MAX_EVENT_CHARS = 3_000;
const MAX_PARTIAL_CHARS = 1_048_576;
export const FLOOD_BURST = 10;
export const FLOOD_REFILL_MS = 2_000;
export const SUPPRESSION_LIMIT_MS = 30_000;
const TRUNCATED = "...(truncated)";

/** Monotonic milliseconds: a wall clock stepped back would refill nothing, or everything. */
export const monotonic = (): number => performance.now();

export const suppressionNotice = (count: number): string =>
	`[${count} events suppressed: output rate too high. Consider using task_stop to restart this monitor with a more selective filter.]`;

export interface EventGate {
	/** Spends a token on an event; the count suppressed before it is sent first. */
	admit: () => boolean;
	/** Sends the event, or suppresses it and stops a monitor suppressed for too long. */
	offer: (event: string) => void;
}

export function eventGate(o: {
	send: (event: string) => void;
	stop: (notice: string) => void;
	capacity?: number;
	refillMs?: number;
	suppressionLimitMs?: number;
	now?: () => number;
}): EventGate {
	const capacity = o.capacity ?? FLOOD_BURST;
	const refillMs = o.refillMs ?? FLOOD_REFILL_MS;
	const limitMs = o.suppressionLimitMs ?? SUPPRESSION_LIMIT_MS;
	const now = o.now ?? monotonic;
	let tokens = capacity;
	let refilledAt = now();
	let suppressed = 0;
	let suppressedSince: number | undefined;
	let lastEventAt = now();
	const refill = (): void => {
		const gained = Math.floor((now() - refilledAt) / refillMs);
		if (gained <= 0) return;
		tokens = Math.min(capacity, tokens + gained);
		refilledAt += gained * refillMs;
	};
	const admit = (): boolean => {
		const at = now();
		refill();
		// Suppression is unbroken until the monitor was quiet for three refills or its allowance is whole again.
		if (at - lastEventAt > refillMs * 3 || tokens === capacity) suppressedSince = undefined;
		lastEventAt = at;
		if (tokens === 0) {
			suppressed++;
			suppressedSince ??= at;
			return false;
		}
		tokens--;
		if (suppressed > 0) o.send(suppressionNotice(suppressed));
		suppressed = 0;
		return true;
	};
	return {
		admit,
		offer(event) {
			if (admit()) return o.send(event);
			const lasted = now() - (suppressedSince ?? now());
			if (lasted > limitMs)
				o.stop(
					`[Monitor stopped: too much output (${suppressed} events suppressed over ${Math.round(lasted / 1000)}s). Restart with a more selective source.]`,
				);
		},
	};
}

const cut = (text: string, max: number, mark: string): string =>
	text.length > max ? `${text.slice(0, max)}${mark}` : text;

export interface LineBatcher {
	push: (text: string) => void;
	/** What is queued now, the unterminated last line included; stops the timer. */
	drain: () => string | undefined;
}

export function lineBatcher(o: { emit: (event: string) => void; windowMs?: number; now?: () => number }): LineBatcher {
	const windowMs = o.windowMs ?? BATCH_WINDOW_MS;
	const now = o.now ?? monotonic;
	let partial = "";
	let lines: string[] = [];
	let chars = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let openedAt = 0;
	const queue = (raw: string): void => {
		const line = cut(raw.trim(), MAX_LINE_CHARS, TRUNCATED);
		// An event already past its cut takes no more lines: a command printing without pause queues nothing unbounded.
		if (line === "" || chars > MAX_EVENT_CHARS) return;
		lines.push(line);
		chars += line.length + (lines.length > 1 ? 1 : 0);
	};
	const take = (): string | undefined => {
		if (lines.length === 0) return undefined;
		const event = cut(lines.join("\n"), MAX_EVENT_CHARS, `\n${TRUNCATED}`);
		lines = [];
		chars = 0;
		return event;
	};
	const fire = (): void => {
		if (timer) clearTimeout(timer);
		timer = undefined;
		const event = take();
		if (event !== undefined) o.emit(event);
	};
	return {
		push(text) {
			// A busy pipe can starve the timer: a window the clock has closed is emitted from here.
			if (timer && now() - openedAt >= windowMs) fire();
			const parts = (partial + text).split("\n");
			partial = (parts.pop() ?? "").slice(-MAX_PARTIAL_CHARS);
			for (const part of parts) queue(part);
			if (timer || lines.length === 0) return;
			openedAt = now();
			timer = setTimeout(fire, windowMs);
			timer.unref?.();
		},
		drain() {
			if (timer) clearTimeout(timer);
			timer = undefined;
			queue(partial);
			partial = "";
			return take();
		},
	};
}

/** The deadline a watch gets: the default when none is asked for, capped at the maximum. */
export function deadlineMs(requested: number | undefined): number {
	if (requested === undefined) return DEFAULT_DEADLINE_MS;
	if (!Number.isFinite(requested) || requested < MIN_DEADLINE_MS)
		throw new Error(
			`timeout_ms must be a number of milliseconds, at least ${MIN_DEADLINE_MS} (a value over ${MAX_DEADLINE_MS} is capped)`,
		);
	return Math.min(Math.floor(requested), MAX_DEADLINE_MS);
}
