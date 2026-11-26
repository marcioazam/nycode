// Splits a Devin model uid into its base uid and reasoning effort. Logic from JoShMiQueL/devin-core effort.ts
// (MIT, Copyright (c) JoShMiQueL), see ../LICENSE.

const EFFORTS: readonly string[] = ["none", "minimal", "low", "medium", "high", "xhigh", "max"];

/**
 * `opus-4-8-high` -> `opus-4-8` + `high`. The effort is not always last (`gpt-5-6-sol-none-priority`), so the last
 * effort word wins, and the first segment is never one: a bare effort word is not a suffix.
 */
export function splitEffortSuffix(modelUid: string): { baseUid: string; effort?: string } {
	const segments = modelUid.split("-");
	for (let i = segments.length - 1; i > 0; i--) {
		if (EFFORTS.includes(segments[i])) {
			return { baseUid: [...segments.slice(0, i), ...segments.slice(i + 1)].join("-"), effort: segments[i] };
		}
	}
	return { baseUid: modelUid };
}

// Fast, priority and lightning variants bill extra credits: never offered (devin-core's `never_route`).
export const EXTRA_COST_VARIANT = /(^|-)(fast|priority|lightning)(-|$)/;
