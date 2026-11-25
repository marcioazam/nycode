// The embedded ponytail extension through the real resource loader (D-54): a default session has it on, the rules
// reach the system prompt as the `ponytail` section, and the commands and the mode behave as in the upstream package.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtensionAPI } from "../../../../src/core/extensions/types.ts";
import { DefaultResourceLoader } from "../../../../src/core/resource-loader.ts";
import { builtInExtensions } from "../../../../src/extensions/index.ts";
import ponytailExtension from "../../../../src/extensions/ponytail/index.ts";

const KEYS = [
	"XDG_CONFIG_HOME",
	"PONYTAIL_DEFAULT_MODE",
	"PONYTAIL_PARENT_MODE",
	"PONYTAIL_QUIET_STARTUP",
	"PONYTAIL_SUBAGENT_MATCHER",
	"PONYTAIL_HIDE_STATUS",
	"NYCODE_SUBAGENT",
];
const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
let root: string;

beforeEach(() => {
	for (const key of KEYS) delete process.env[key];
	root = mkdtempSync(join(tmpdir(), "ponytail-ext-"));
	mkdirSync(join(root, "project"), { recursive: true });
	mkdirSync(join(root, "agent"), { recursive: true });
	process.env.XDG_CONFIG_HOME = join(root, "xdg");
});
afterEach(() => {
	for (const key of KEYS) {
		const value = saved[key];
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
	rmSync(root, { recursive: true });
});

type Handler = (event: unknown, ctx: unknown) => Promise<unknown> | unknown;

async function load() {
	const loader = new DefaultResourceLoader({
		cwd: join(root, "project"),
		agentDir: join(root, "agent"),
		extensionFactories: builtInExtensions.filter((e) => typeof e !== "function" && e.name === "ponytail"),
	});
	await loader.reload();
	expect(loader.getExtensions().errors).toEqual([]);
	const [extension] = loader.getExtensions().extensions;
	if (!extension) throw new Error("ponytail extension did not load");
	const notify = vi.fn();
	const entries: unknown[] = [];
	const ctx = {
		hasUI: true,
		isIdle: () => true,
		ui: { notify, setStatus: vi.fn(), theme: { fg: (_c: string, t: string) => t } },
		sessionManager: { getBranch: () => entries },
	};
	const run = async (name: string, event: unknown = {}) => {
		for (const handler of extension.handlers.get(name) ?? []) await (handler as Handler)(event, ctx);
	};
	const prompt = async () => {
		const sections: Record<string, string> = {};
		await run("before_agent_start", { systemPromptOptions: { sections } });
		return sections.ponytail;
	};
	return { extension, run, prompt, notify, ctx };
}

describe("embedded ponytail extension", () => {
	it("is registered, built in and on by default", () => {
		const entry = builtInExtensions.find((e) => typeof e !== "function" && e.name === "ponytail");
		expect(entry).toMatchObject({ name: "ponytail", builtin: true });
		expect(entry).not.toHaveProperty("enabledByDefault", false);
	});

	it("the `extensions` setting turns it off with -builtin:ponytail", async () => {
		writeFileSync(join(root, "agent", "settings.json"), JSON.stringify({ extensions: ["-builtin:ponytail"] }));
		const loader = new DefaultResourceLoader({
			cwd: join(root, "project"),
			agentDir: join(root, "agent"),
			extensionFactories: builtInExtensions.filter((e) => typeof e !== "function" && e.name === "ponytail"),
		});
		await loader.reload();
		expect(loader.getExtensions().extensions).toEqual([]);
	});

	it("registers /ponytail and the five skill aliases", async () => {
		const { extension } = await load();
		expect([...extension.commands.keys()].sort()).toEqual(
			["ponytail", "ponytail-audit", "ponytail-debt", "ponytail-gain", "ponytail-help", "ponytail-review"].sort(),
		);
	});

	it("a new session starts at full: the rules join the system prompt and the status line shows it", async () => {
		const { run, prompt, ctx } = await load();
		await run("session_start");
		expect(await prompt()).toMatch(/^PONYTAIL MODE ACTIVE — level: full\n\n/);
		expect((ctx.ui.setStatus as ReturnType<typeof vi.fn>).mock.calls.at(-1)).toEqual([
			"ponytail",
			"○ 🐴 ponytail: ⚡ FULL",
		]);
	});

	it("announces itself unless PONYTAIL_QUIET_STARTUP is on (the nycode default env sets it)", async () => {
		const loud = await load();
		await loud.run("session_start");
		expect(loud.notify).toHaveBeenCalledWith("Ponytail loaded: full", "info");
		process.env.PONYTAIL_QUIET_STARTUP = "1";
		try {
			const quiet = await load();
			await quiet.run("session_start");
			expect(quiet.notify).not.toHaveBeenCalled();
		} finally {
			delete process.env.PONYTAIL_QUIET_STARTUP;
		}
	});

	it("/ponytail ultra switches the level, records it and exports it for children; off clears the section", async () => {
		const { run, prompt, command, entries } = await fake();
		await run("session_start");
		await command("ponytail", "ultra");
		expect(process.env.PONYTAIL_PARENT_MODE).toBe("ultra");
		expect(entries).toEqual([["ponytail-mode", { mode: "ultra" }]]);
		expect(await prompt()).toContain("level: ultra");
		await run("input", { source: "interactive", text: "add a normal mode toggle" });
		expect(await prompt()).toContain("level: ultra");
		await run("input", { source: "interactive", text: "stop ponytail" });
		expect(process.env.PONYTAIL_PARENT_MODE).toBe("off");
		expect(await prompt()).toBeUndefined();
	});

	it("a subagent child follows the parent's level and the matcher; a non-matching agent gets no rules", async () => {
		process.env.NYCODE_SUBAGENT = "1";
		process.env.PONYTAIL_PARENT_MODE = "lite";
		process.env.PONYTAIL_SUBAGENT_MATCHER = "^(swarm-worker)$";
		const argv = [...process.argv];
		try {
			process.argv.push("--system-prompt", "/tmp/p/prompt-swarm-worker.md");
			const writer = await fake();
			await writer.run("session_start");
			expect(await writer.prompt()).toContain("level: lite");
			process.argv.splice(0, process.argv.length, ...argv, "--system-prompt", "/tmp/p/prompt-Explore.md");
			const reader = await fake();
			await reader.run("session_start");
			expect(await reader.prompt()).toBeUndefined();
			expect(process.env.PONYTAIL_PARENT_MODE).toBe("off");
		} finally {
			process.argv.splice(0, process.argv.length, ...argv);
		}
	});

	it("without a matcher, a child with a read-only tools list gets no rules and a writer or an unrestricted one does", async () => {
		process.env.NYCODE_SUBAGENT = "1";
		process.env.PONYTAIL_PARENT_MODE = "full";
		const argv = [...process.argv];
		const start = async (...extra: string[]) => {
			// session_start writes the child's level back to PONYTAIL_PARENT_MODE; each case starts from a "full" parent
			process.env.PONYTAIL_PARENT_MODE = "full";
			process.argv.splice(0, process.argv.length, ...argv, "--system-prompt", "/tmp/p/prompt-a.md", ...extra);
			const child = await fake();
			await child.run("session_start");
			return child.prompt();
		};
		try {
			expect(await start("--tools", "read,grep,find")).toBeUndefined();
			expect(await start("--tools", "read,edit")).toContain("level: full");
			expect(await start("--tools", "write")).toContain("level: full");
			expect(await start()).toContain("level: full");
		} finally {
			process.argv.splice(0, process.argv.length, ...argv);
		}
	});

	it("session_start restores the latest persisted level of the branch", async () => {
		const { run, prompt } = await fake([{ type: "custom", customType: "ponytail-mode", data: { mode: "lite" } }]);
		await run("session_start");
		expect(await prompt()).toContain("level: lite");
	});

	it("the alias commands forward their arguments to the skill, or queue them while a run is going", async () => {
		const { command, sent } = await fake();
		await command("ponytail-review", "src/x.ts");
		await command("ponytail-gain", "");
		expect(sent).toEqual([
			["/skill:ponytail-review src/x.ts", undefined],
			["/skill:ponytail-gain", undefined],
		]);
		await command("ponytail-audit", "", { isIdle: () => false });
		expect(sent.at(-1)).toEqual(["/skill:ponytail-audit", { deliverAs: "followUp" }]);
	});

	it("an alias without UI waits for the run it started to settle", async () => {
		const { run, command, sent } = await fake();
		let idle = true;
		let finished = false;
		const done = Promise.resolve(command("ponytail-help", "", { hasUI: false, isIdle: () => idle })).then(() => {
			finished = true;
		});
		setTimeout(() => {
			idle = false; // the run the message started
		}, 60);
		await new Promise((resolve) => setTimeout(resolve, 250));
		expect(sent).toEqual([["/skill:ponytail-help", undefined]]);
		expect(finished).toBe(false);
		await run("agent_settled");
		await done;
		expect(finished).toBe(true);
	});
});

/** The extension on a hand-made API (the loader's runtime refuses actions such as appendEntry). */
async function fake(branch: unknown[] = []) {
	const handlers = new Map<string, Handler[]>();
	const commands = new Map<string, { handler: (args: string, ctx: unknown) => Promise<void> | void }>();
	const entries: unknown[] = [];
	const sent: unknown[] = [];
	const notify = vi.fn();
	const baseCtx = {
		hasUI: true,
		isIdle: () => true,
		ui: { notify, setStatus: vi.fn(), theme: { fg: (_c: string, t: string) => t } },
		sessionManager: { getBranch: () => branch },
	};
	ponytailExtension({
		on: (name: string, handler: Handler) => handlers.set(name, [...(handlers.get(name) ?? []), handler]),
		registerCommand: (name: string, command: never) => commands.set(name, command),
		appendEntry: (type: string, data: unknown) => entries.push([type, data]),
		sendUserMessage: (text: string, options?: unknown) => sent.push([text, options]),
	} as unknown as ExtensionAPI);
	const run = async (name: string, event: unknown = {}) => {
		for (const handler of handlers.get(name) ?? []) await handler(event, baseCtx);
	};
	const prompt = async () => {
		const sections: Record<string, string> = {};
		await run("before_agent_start", { systemPromptOptions: { sections } });
		return sections.ponytail;
	};
	const command = (name: string, args: string, ctx: object = {}) =>
		commands.get(name)?.handler(args, { ...baseCtx, ...ctx });
	return { run, prompt, command, entries, sent, notify };
}
