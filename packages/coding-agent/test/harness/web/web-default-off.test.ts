// The web extension ships on (D-52; the file keeps its old name, F5 evidence cites it): a default session
// registers web_fetch and no web_search; web_search needs NYCODE_KEEP_WEB_SEARCH=1. `-builtin:web` in the `extensions`
// setting turns the extension off. Loading registers tools only and sends no request.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DefaultResourceLoader } from "../../../src/core/resource-loader.ts";
import { builtInExtensions } from "../../../src/extensions/index.ts";

let root: string;
let cwd: string;
let agentDir: string;
let savedKeep: string | undefined;

beforeEach(() => {
	savedKeep = process.env.NYCODE_KEEP_WEB_SEARCH;
	delete process.env.NYCODE_KEEP_WEB_SEARCH;
	root = mkdtempSync(join(tmpdir(), "nycode-web-"));
	cwd = join(root, "project");
	agentDir = join(root, "agent");
	mkdirSync(cwd, { recursive: true });
	mkdirSync(agentDir, { recursive: true });
});

afterEach(() => {
	if (savedKeep === undefined) delete process.env.NYCODE_KEEP_WEB_SEARCH;
	else process.env.NYCODE_KEEP_WEB_SEARCH = savedKeep;
	vi.unstubAllGlobals();
	rmSync(root, { recursive: true });
});

async function toolNames(options: { settings?: object; additionalExtensionPaths?: string[] }): Promise<string[]> {
	if (options.settings) writeFileSync(join(agentDir, "settings.json"), JSON.stringify(options.settings));
	const fetchSpy = vi.fn();
	vi.stubGlobal("fetch", fetchSpy);
	const loader = new DefaultResourceLoader({
		cwd,
		agentDir,
		extensionFactories: builtInExtensions.filter((e) => typeof e !== "function" && e.name === "web"),
		additionalExtensionPaths: options.additionalExtensionPaths,
	});
	await loader.reload();
	expect(loader.getExtensions().errors).toEqual([]);
	expect(fetchSpy).not.toHaveBeenCalled();
	return loader.getExtensions().extensions.flatMap((extension) => [...extension.tools.keys()]);
}

describe("builtin:web", () => {
	it("registers web_fetch and no web_search in a default session", async () => {
		const names = await toolNames({});
		expect(names).toContain("web_fetch");
		expect(names).not.toContain("web_search");
	});

	it("registers both tools with NYCODE_KEEP_WEB_SEARCH=1", async () => {
		process.env.NYCODE_KEEP_WEB_SEARCH = "1";
		const names = await toolNames({});
		expect(names).toContain("web_search");
		expect(names).toContain("web_fetch");
	});

	it("keeps web_search off for any other NYCODE_KEEP_WEB_SEARCH value", async () => {
		process.env.NYCODE_KEEP_WEB_SEARCH = "0";
		expect(await toolNames({})).not.toContain("web_search");
	});

	it("still loads with -e builtin:web, without web_search", async () => {
		const names = await toolNames({ additionalExtensionPaths: ["builtin:web"] });
		expect(names).toContain("web_fetch");
		expect(names).not.toContain("web_search");
	});

	it("stays off when the setting disables it", async () => {
		expect(await toolNames({ settings: { extensions: ["-builtin:web"] } })).not.toContain("web_fetch");
	});
});
