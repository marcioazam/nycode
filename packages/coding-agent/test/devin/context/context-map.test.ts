import { type Message, normalizeContext, type TranscriptContext } from "@nycode/ai";
import { describe, expect, it } from "vitest";
import { mapContextToChat } from "../../../src/extensions/devin/context/context-map.ts";
import { packThinkingSignature } from "../../../src/extensions/devin/context/thinking.ts";

const usage = {
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0,
	totalTokens: 0,
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

function context(messages: Message[], systemPrompt?: string): TranscriptContext {
	return normalizeContext({
		systemPrompt,
		messages,
		tools: [{ name: "read", description: "Read a file", parameters: { type: "object", properties: {} } }],
	});
}

describe("mapContextToChat", () => {
	it("maps the system prompt, tools, users, assistants and tool results", () => {
		const mapped = mapContextToChat(
			context(
				[
					{ role: "user", content: "hello", timestamp: 1 },
					{
						role: "user",
						content: [
							{ type: "text", text: "look" },
							{ type: "image", data: "AAAA", mimeType: "image/png" },
						],
						timestamp: 2,
					},
					{
						role: "assistant",
						content: [
							{
								type: "thinking",
								thinking: "plan",
								thinkingSignature: packThinkingSignature("sig", "sealed"),
								redacted: true,
							},
							{ type: "text", text: "ok" },
							{ type: "toolCall", id: "c1", name: "read", arguments: { path: "a" } },
						],
						api: "devin-local",
						provider: "devin",
						model: "m",
						usage,
						stopReason: "toolUse",
						timestamp: 3,
					},
					{
						role: "toolResult",
						toolCallId: "c1",
						toolName: "read",
						content: [
							{ type: "text", text: "line1" },
							{ type: "image", data: "BBBB", mimeType: "image/png" },
							{ type: "text", text: "line2" },
						],
						isError: false,
						timestamp: 4,
					},
				],
				"be brief",
			),
		);
		expect(mapped.systemPrompt).toBe("be brief");
		expect(mapped.tools).toEqual([
			{ name: "read", description: "Read a file", parameters: { type: "object", properties: {} } },
		]);
		expect(mapped.messages[0]).toEqual({ role: "user", content: "hello" });
		expect(mapped.messages[1].content).toEqual([
			{ type: "text", text: "look" },
			{ type: "image", mimeType: "image/png", base64Data: "AAAA" },
		]);
		expect(mapped.messages[2]).toEqual({
			role: "assistant",
			content: "ok",
			tool_calls: [{ id: "c1", name: "read", arguments: '{"path":"a"}' }],
			thinking: { text: "plan", signature: "sig", signatureType: "sealed", redacted: true },
		});
		expect(mapped.messages[3]).toEqual({ role: "tool", content: "line1\nline2", tool_call_id: "c1" });
	});

	it("drops thinking without a signature and omits an empty system prompt and tool calls", () => {
		const mapped = mapContextToChat(
			context([
				{
					role: "assistant",
					content: [
						{ type: "thinking", thinking: "unsigned" },
						{ type: "text", text: "a" },
					],
					api: "devin-local",
					provider: "devin",
					model: "m",
					usage,
					stopReason: "stop",
					timestamp: 1,
				},
			]),
		);
		expect(mapped.systemPrompt).toBeUndefined();
		expect(mapped.messages[0].thinking).toBeUndefined();
		expect(mapped.messages[0].tool_calls).toBeUndefined();
	});
});
