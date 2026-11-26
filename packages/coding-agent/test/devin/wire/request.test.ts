import { describe, expect, it } from "vitest";
import { iterFields } from "../../../src/extensions/devin/wire/proto.ts";
import { buildGetChatMessageRequest, MIN_TEMPERATURE } from "../../../src/extensions/devin/wire/request.ts";

const base = {
	apiKey: "key-123",
	userJwt: "eyJ.jwt",
	modelUid: "model-uid",
	cascadeId: "cascade",
	trajectoryId: "traj",
	promptId: "prompt",
	sessionId: "session",
	requestId: 5n,
	triggerId: "trigger",
	ide: "devin-cli",
	version: "1.2.3",
	messages: [{ role: "user" as const, content: "hi" }],
};

function configOf(overrides: Partial<Parameters<typeof buildGetChatMessageRequest>[0]>) {
	const top = [...iterFields(buildGetChatMessageRequest({ ...base, ...overrides }))];
	const config = new Map(
		[...iterFields(top.find((field) => field.num === 8)?.value as Buffer)].map((f) => [f.num, f.value]),
	);
	const double = (num: number) => (config.get(num) as Buffer).readDoubleLE(0);
	return { config, double };
}

describe("CompletionConfiguration (#8)", () => {
	it("puts options.maxTokens in #2 max_tokens and keeps #3 max_newlines fixed and large", () => {
		const { config } = configOf({ maxTokens: 777 });
		expect(config.get(2)).toBe(777n);
		expect(config.get(3)).toBe(128_000n);
		expect(configOf({ maxTokens: 4 }).config.get(3)).toBe(128_000n);
	});

	it("keeps the previous defaults when nothing is passed", () => {
		const { config, double } = configOf({});
		expect(config.get(1)).toBe(1n);
		expect(config.get(2)).toBe(64_000n);
		expect(double(5)).toBe(0.7);
		expect(double(6)).toBe(0.95);
		expect(config.get(7)).toBe(50n);
		expect(double(8)).toBe(1);
		expect(double(11)).toBe(1);
	});

	it("passes the temperature, never below 0.001 (0 makes the server answer 'an internal error occurred')", () => {
		expect(configOf({ temperature: 0.2 }).double(5)).toBe(0.2);
		expect(configOf({ temperature: 0 }).double(5)).toBe(MIN_TEMPERATURE);
		expect(MIN_TEMPERATURE).toBe(0.001);
		expect(configOf({ temperature: -1 }).double(5)).toBe(MIN_TEMPERATURE);
	});

	it("passes top_p in #8", () => {
		expect(configOf({ topP: 0.5 }).double(8)).toBe(0.5);
	});
});

describe("request fields added for tool turns", () => {
	const prompts = (messages: Parameters<typeof buildGetChatMessageRequest>[0]["messages"]) =>
		[...iterFields(buildGetChatMessageRequest({ ...base, messages }))]
			.filter((field) => field.num === 3)
			.map((field) => [...iterFields(field.value as Buffer)]);

	it("flags a failed tool result in prompt #9", () => {
		const [failed, ok] = prompts([
			{ role: "tool", content: "boom", tool_call_id: "c1", is_error: true },
			{ role: "tool", content: "fine", tool_call_id: "c2" },
		]);
		expect(failed.find((f) => f.num === 9)?.value).toBe(1n);
		expect(ok.some((f) => f.num === 9)).toBe(false);
	});

	it("sends tool_choice #12 as {1: option name} only when given", () => {
		const choice = (toolChoice?: "auto" | "none") => {
			const field = [...iterFields(buildGetChatMessageRequest({ ...base, toolChoice }))].find((f) => f.num === 12);
			return field
				? [...iterFields(field.value as Buffer)].map((f) => [f.num, (f.value as Buffer).toString()])
				: null;
		};
		expect(choice("none")).toEqual([[1, "none"]]);
		expect(choice("auto")).toEqual([[1, "auto"]]);
		expect(choice()).toBeNull();
	});

	it("replays the Gemini thought signature as the bytes of prompt #17", () => {
		const bytes = Buffer.from([1, 2, 3, 250]);
		const [assistant] = prompts([
			{
				role: "assistant",
				content: "",
				tool_calls: [{ id: "c1", name: "read", arguments: "{}" }],
				gemini_thought_signature: bytes.toString("base64"),
			},
		]);
		expect(assistant.find((f) => f.num === 17)?.value).toEqual(bytes);
		expect(prompts([{ role: "assistant", content: "x" }])[0].some((f) => f.num === 17)).toBe(false);
	});
});
