import { describe, expect, it } from "vitest";
import { packThinkingSignature, unpackThinkingSignature } from "../../../src/extensions/devin/context/thinking.ts";
import {
	type CloudChatEvent,
	calculateUsageTotal,
	decodeChatFrame,
} from "../../../src/extensions/devin/wire/decode.ts";
import { ConnectFrameParser, MAX_FRAME_BYTES } from "../../../src/extensions/devin/wire/frames.ts";
import {
	decodeVarint,
	encodeFixed64Field,
	encodeMessage,
	encodeString,
	encodeVarint,
	encodeVarintField,
	frameConnectStream,
	iterFields,
} from "../../../src/extensions/devin/wire/proto.ts";
import { buildGetChatMessageRequest, buildMetadata } from "../../../src/extensions/devin/wire/request.ts";
import { parsePartialToolArguments } from "../../../src/extensions/devin/wire/tool-args.ts";
import { rawFrame, toolCallMessage, usageMessage } from "../helpers.ts";

const decode = (proto: Buffer): CloudChatEvent[] => [...decodeChatFrame(proto)];

describe("protobuf codec", () => {
	it("round-trips varints and rejects negatives", () => {
		for (const value of [0, 1, 127, 128, 300, 2 ** 40]) {
			expect(decodeVarint(encodeVarint(value), 0)[0]).toBe(BigInt(value));
		}
		expect(() => encodeVarint(-1)).toThrow(RangeError);
		expect(() => decodeVarint(Buffer.from([0x80]), 0)).toThrow("truncated varint");
		expect(decodeVarint(Buffer.from([...Array(9).fill(0x80), 0x01]), 0)[1]).toBe(10);
		expect(() => decodeVarint(Buffer.from([...Array(10).fill(0x80), 0x01]), 0)).toThrow("varint too long");
	});

	it("iterates strings, varints, fixed64 and stops at truncated or unknown wire data", () => {
		const buf = Buffer.concat([encodeString(1, "hi"), encodeVarintField(2, 7), encodeFixed64Field(3, 0.5)]);
		const fields = [...iterFields(buf)];
		expect(fields.map((f) => [f.num, f.wire])).toEqual([
			[1, 2],
			[2, 0],
			[3, 1],
		]);
		expect((fields[0].value as Buffer).toString()).toBe("hi");
		expect([...iterFields(Buffer.concat([buf, Buffer.from([0x0b])]))]).toHaveLength(3); // wire type 3: unknown
		expect([...iterFields(Buffer.from([0x0a, 0x05, 0x61]))]).toHaveLength(0); // length past the end
		expect([...iterFields(Buffer.from([0x09, 0x01]))]).toHaveLength(0); // truncated fixed64
	});

	it("frames a message with the gzip flag and a big-endian length", () => {
		const frame = frameConnectStream(Buffer.from("hello"), true);
		expect(frame[0]).toBe(1);
		expect(frame.readUInt32BE(1)).toBe(frame.length - 5);
		expect(frameConnectStream(Buffer.from("hello"), false).subarray(5).toString()).toBe("hello");
	});
});

describe("ConnectFrameParser", () => {
	it("reassembles frames split across arbitrary chunks", () => {
		const bytes = Buffer.concat([rawFrame(0, Buffer.from("one")), rawFrame(2, Buffer.from("two"))]);
		const parser = new ConnectFrameParser();
		const frames = [];
		for (let i = 0; i < bytes.length; i += 3) frames.push(...parser.push(bytes.subarray(i, i + 3)));
		expect(frames.map((f) => [f.flags, f.payload.toString()])).toEqual([
			[0, "one"],
			[2, "two"],
		]);
	});

	it("returns several frames from one chunk and handles empty payloads", () => {
		const frames = new ConnectFrameParser().push(
			Buffer.concat([rawFrame(0, Buffer.alloc(0)), rawFrame(0, Buffer.from("x"))]),
		);
		expect(frames.map((f) => f.payload.length)).toEqual([0, 1]);
	});

	it("refuses a frame header above the size limit", () => {
		const header = Buffer.alloc(5);
		header.writeUInt32BE(MAX_FRAME_BYTES + 1, 1);
		expect(() => new ConnectFrameParser().push(header)).toThrow("exceeds");
	});
});

describe("decodeChatFrame", () => {
	it("decodes text, reasoning with signature, redaction and finish reasons", () => {
		const events = decode(
			Buffer.concat([
				encodeString(3, "hello"),
				encodeString(9, "thinking"),
				encodeString(10, "sig"),
				encodeString(21, "sealed"),
				encodeVarintField(11, 1),
				encodeVarintField(5, 10),
			]),
		);
		expect(events).toEqual([
			{ kind: "text", text: "hello" },
			{ kind: "reasoning", text: "thinking" },
			{ kind: "reasoning_redacted" },
			{ kind: "finish", reason: "tool_calls", raw: 10 },
			{ kind: "reasoning_signature", signature: "sig", signatureType: "sealed" },
		]);
		const reason = (v: number) => (decode(encodeVarintField(5, v))[0] as { reason: string }).reason;
		expect([11, 1, 3, 5, 9, 13, 0, 2, 12].map(reason)).toEqual([
			"content_filter",
			"length",
			"length",
			"length",
			"length",
			"error",
			"stop",
			"stop",
			"stop",
		]);
		expect(decode(Buffer.concat([encodeString(3, ""), encodeVarintField(11, 0)]))).toEqual([]);
	});

	it("decodes tool calls and usage metrics", () => {
		const events = decode(
			Buffer.concat([
				encodeMessage(6, toolCallMessage("c1", "read", '{"a":1}')),
				encodeMessage(
					28,
					usageMessage({ input_tokens: 10, output_tokens: 4, cache_read_tokens: 3, cache_creation_tokens: 2 }),
				),
			]),
		);
		expect(events[0]).toEqual({ kind: "tool_call_start", id: "c1", name: "read" });
		expect(events[1]).toEqual({ kind: "tool_call_args", argsDelta: '{"a":1}', id: "c1" });
		expect(events[2]).toMatchObject({
			kind: "usage",
			source: "trailer",
			promptTokens: 10,
			completionTokens: 4,
			cachedInputTokens: 3,
			cacheCreationInputTokens: 2,
			totalTokens: 19,
		});
		// usage without input/output metrics is dropped
		expect(decode(encodeMessage(28, usageMessage({ cache_read_tokens: 3 })))).toEqual([]);
		expect(calculateUsageTotal({})).toBe(0);
	});
});

describe("request building", () => {
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
	};

	it("puts identity, key and JWT in the metadata", () => {
		const noJwt = { ...base, userJwt: undefined };
		const strings = [...iterFields(buildMetadata(noJwt))]
			.filter((f) => f.wire === 2)
			.map((f) => (f.value as Buffer).toString());
		expect(strings).toEqual(expect.arrayContaining(["devin-cli", "1.2.3", "key-123", "session", "trigger"]));
		expect(strings).not.toContain("eyJ.jwt");
		const jwtField = [...iterFields(buildMetadata({ ...base, userJwt: "eyJ.jwt" }))].find((f) => f.num === 21);
		expect((jwtField?.value as Buffer).toString()).toBe("eyJ.jwt");
	});

	it("encodes system prompt, history with thinking and images, tools and the model uid", () => {
		const proto = buildGetChatMessageRequest({
			...base,
			systemPrompt: "be brief",
			messages: [
				{
					role: "user",
					content: [
						{ type: "text", text: "hi" },
						{ type: "image", base64Data: "AAAA", mimeType: "image/png" },
					],
				},
				{
					role: "assistant",
					content: "calling",
					tool_calls: [{ id: "c1", name: "read", arguments: "{}" }],
					thinking: { text: "t", signature: "s", signatureType: "sealed", redacted: true },
				},
				{ role: "tool", content: "result", tool_call_id: "c1" },
			],
			tools: [{ name: "read", description: "x".repeat(8000), parameters: { type: "object" } }],
		});
		const top = [...iterFields(proto)];
		const text = (num: number) => top.filter((f) => f.num === num).map((f) => (f.value as Buffer).toString());
		expect(text(2)).toEqual(["be brief"]);
		expect(text(21)).toEqual(["model-uid"]);
		expect(top.filter((f) => f.num === 3)).toHaveLength(3);
		const tool = [...iterFields(top.find((f) => f.num === 10)?.value as Buffer)];
		expect((tool[1].value as Buffer).toString()).toHaveLength(6998);
		const assistant = [...iterFields(top.filter((f) => f.num === 3)[1].value as Buffer)].map((f) => f.num);
		expect(assistant).toEqual(expect.arrayContaining([6, 11, 12, 13, 18]));
		const user = [...iterFields(top.filter((f) => f.num === 3)[0].value as Buffer)].map((f) => f.num);
		expect(user).toContain(10);
		const toolMsg = [...iterFields(top.filter((f) => f.num === 3)[2].value as Buffer)].find((f) => f.num === 7);
		expect((toolMsg?.value as Buffer).toString()).toBe("c1");
		expect(
			buildGetChatMessageRequest({ ...base, messages: [{ role: "user", content: "x" }], maxTokens: 100 }).length,
		).toBeGreaterThan(0);
	});
});

describe("parsePartialToolArguments", () => {
	it("parses complete JSON and repairs unterminated documents", () => {
		expect(parsePartialToolArguments("")).toEqual({});
		expect(parsePartialToolArguments('{"a":1}')).toEqual({ a: 1 });
		expect(parsePartialToolArguments('{"a":"hel')).toEqual({ a: "hel" });
		expect(parsePartialToolArguments('{"a":[1,2')).toEqual({ a: [1, 2] });
		expect(parsePartialToolArguments('{"a":1,')).toEqual({ a: 1 });
		expect(parsePartialToolArguments('{"a":')).toEqual({ a: "" });
		expect(parsePartialToolArguments('{"a":"x\\')).toEqual({ a: "x" });
		expect(parsePartialToolArguments('{"a":1,"b":"x')).toEqual({ a: 1, b: "x" });
		expect(parsePartialToolArguments("[1,2]")).toEqual([1, 2]);
		expect(parsePartialToolArguments("null")).toEqual({});
		expect(parsePartialToolArguments("{nope")).toEqual({});
	});
});

describe("thinking signatures", () => {
	it("keeps the signature type only when it cannot be derived", () => {
		expect(packThinkingSignature("sealed.v1.abc", "sealed")).toBe("sealed.v1.abc");
		expect(packThinkingSignature("abc")).toBe("abc");
		const packed = packThinkingSignature("abc", "custom");
		expect(unpackThinkingSignature(packed)).toEqual({ signature: "abc", signatureType: "custom" });
		expect(unpackThinkingSignature("sealed.v1.abc")).toEqual({ signature: "sealed.v1.abc", signatureType: "sealed" });
		expect(unpackThinkingSignature("abc")).toEqual({ signature: "abc", signatureType: "non-sealed" });
		expect(unpackThinkingSignature(undefined)).toEqual({});
	});
});
