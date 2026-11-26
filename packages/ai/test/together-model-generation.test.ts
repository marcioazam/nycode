import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { ModelsDevV2Model } from "../catalog/sources/models-dev.ts";
import type { Api, Model } from "../src/types.ts";
import { writeUpstreamMock } from "./catalog-generation-utils.ts";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const temporaryRoots: string[] = [];

afterEach(() => {
	for (const root of temporaryRoots.splice(0)) rmSync(root, { force: true, recursive: true });
});

function togetherModel(id: string, reasoning: boolean): ModelsDevV2Model {
	// models.dev lists effort levels for gpt-oss; the shared rules turn them into the full level map.
	const effort =
		id === "openai/gpt-oss-120b" ? { effort: ["low", "medium", "high"] as ("low" | "medium" | "high")[] } : {};
	return {
		id,
		type: "chat",
		name: id,
		modalities: { input: ["text"], output: ["text"] },
		capabilities: {
			tools: { supported: true },
			reasoning: reasoning ? { supported: true, toggle: true, ...effort } : { supported: false },
		},
		api: {},
	};
}

function generateTogetherModels(entries: Record<string, boolean>): Record<string, Model<Api>> {
	const root = mkdtempSync(join(tmpdir(), "nycode-together-generation-"));
	temporaryRoots.push(root);
	const preloadPath = join(root, "mock-catalog.mjs");
	const outputPath = join(root, "catalog");
	const models = Object.entries(entries).map(([id, reasoning]) => togetherModel(id, reasoning));
	writeUpstreamMock(preloadPath, {
		togetherai: { models: Object.fromEntries(models.map((model) => [model.id, model])) },
	});
	const result = spawnSync(
		process.execPath,
		["--import", pathToFileURL(preloadPath).href, "catalog/generate.ts", "--json-only", "--json-output", outputPath],
		{ cwd: packageRoot, encoding: "utf8", timeout: 10_000 },
	);
	expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
	expect(result.stderr).toBe("");
	return JSON.parse(readFileSync(join(outputPath, "providers/together.json"), "utf8")) as Record<string, Model<Api>>;
}

describe("Together model generation", () => {
	it("models Together reasoning controls from the Together API surface", () => {
		const models = generateTogetherModels({
			"openai/gpt-oss-120b": true,
			"deepseek-ai/DeepSeek-V4-Pro-0813": true,
			"acme/generic-reasoner": true,
			"acme/plain-chat": false,
		});

		const gptOss = models["openai/gpt-oss-120b"];
		expect(gptOss.thinkingLevelMap).toEqual({
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			max: null,
			xhigh: null,
		});
		expect(gptOss.compat).toMatchObject({ supportsReasoningEffort: true, thinkingFormat: "openai" });

		const deepSeekV4 = models["deepseek-ai/DeepSeek-V4-Pro-0813"];
		expect(deepSeekV4.thinkingLevelMap).toEqual({
			minimal: null,
			low: null,
			medium: null,
			high: "high",
			xhigh: null,
		});
		expect(deepSeekV4.compat).toMatchObject({ supportsReasoningEffort: true, thinkingFormat: "together" });
	});

	it("defaults other reasoning models to the toggle format and non-reasoning models to the base compat", () => {
		const models = generateTogetherModels({ "acme/generic-reasoner": true, "acme/plain-chat": false });

		const generic = models["acme/generic-reasoner"];
		expect(generic.thinkingLevelMap).toEqual({ minimal: null, low: null, medium: null });
		expect(generic.compat).toMatchObject({ supportsReasoningEffort: false, thinkingFormat: "together" });

		const plain = models["acme/plain-chat"];
		expect(plain.thinkingLevelMap).toBeUndefined();
		// Provider-level defaults add thinkingFormat "together"; BASE_COMPAT fields stay as authored.
		expect(plain.compat).toEqual({
			supportsStore: false,
			supportsReasoningEffort: false,
			maxTokensField: "max_tokens",
			supportsStrictMode: false,
			supportsLongCacheRetention: false,
			thinkingFormat: "together",
		});
	});
});
