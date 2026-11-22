import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Opener } from "../../../../../src/extensions/claude-compat/commands/settings/store.ts";

export const tmp = () => mkdtempSync(join(tmpdir(), "cc-local-"));

/** ctx mínimo: notifica em `notes`; `confirm`/`select` respondem o que o teste definir. */
export function mkCtx(
	o: {
		idle?: boolean;
		hasUI?: boolean;
		confirm?: boolean;
		pick?: string;
		branch?: unknown[];
		entries?: unknown[];
		themes?: string[];
		leaf?: string | null;
		cwd?: string;
		themeFails?: boolean;
	} = {},
) {
	const notes: { m: string; t?: string }[] = [];
	const calls: string[] = [];
	const ctx: any = {
		cwd: o.cwd ?? "/tmp",
		hasUI: o.hasUI ?? true,
		isIdle: () => o.idle ?? true,
		abort: () => calls.push("abort"),
		ui: {
			notify: (m: string, t?: string) => notes.push({ m, t }),
			confirm: async () => {
				calls.push("confirm");
				return o.confirm ?? false;
			},
			select: async (_t: string, opts: string[]) =>
				o.pick === undefined ? undefined : opts.find((x) => x.startsWith(o.pick!)),
			getAllThemes: () => (o.themes ?? ["dark", "light"]).map((name) => ({ name, path: undefined })),
			setTheme: (n: string) => {
				calls.push(`theme:${n}`);
				return o.themeFails ? { success: false, error: "sem cor" } : { success: true };
			},
			getToolsExpanded: () => false,
			setToolsExpanded: (v: boolean) => calls.push(`expanded:${v}`),
		},
		sessionManager: {
			getBranch: () => o.branch ?? [],
			getEntries: () => o.entries ?? [],
			getLeafId: () => (o.leaf === undefined ? "leaf1" : o.leaf),
		},
		modelRegistry: { getAvailable: () => [{ provider: "p", id: "m" }] },
		reload: async () => void calls.push("reload"),
		fork: async (id: string, opts: unknown) => {
			calls.push(`fork:${id}:${JSON.stringify(opts)}`);
			return { cancelled: false };
		},
	};
	return { ctx, notes, calls, last: () => notes.at(-1)!.m };
}

export const msg = (role: string, content: unknown, extra: object = {}) => ({
	type: "message",
	message: { role, content, ...extra },
});

import * as nativeManager from "../../../../../src/core/settings-manager.ts";

const native = async () => nativeManager;

/** Opener sobre FileSettingsStorage nativo apontando para um diretório isolado. */
export async function fileOpener(dir: string): Promise<Opener> {
	const m = await native();
	return async (cwd) => {
		const storage = new m.FileSettingsStorage(cwd, dir);
		return { sm: m.SettingsManager.fromStorage(storage), storage };
	};
}

/** Storage que lê vazio e falha em toda escrita: a falha tem de aparecer, nunca virar sucesso. */
export async function failingOpener(initial?: string): Promise<Opener> {
	const m = await native();
	const storage = {
		withLock: (_s: string, fn: (c: string | undefined) => string | undefined) =>
			void (
				fn(initial) !== undefined &&
				(() => {
					throw new Error("disco cheio");
				})()
			),
	};
	return async () => ({ sm: m.SettingsManager.fromStorage(storage), storage });
}
