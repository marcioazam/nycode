// Property-based fuzzing of the chat response decoder on arbitrary and structured server bytes.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { decodeChatFrame } from "../../../src/extensions/devin/wire/decode.ts";
import { encodeMessage, encodeString, encodeVarintField } from "../../../src/extensions/devin/wire/proto.ts";

const params = { seed: 20261126, numRuns: 400 };
const bytes = fc.uint8Array({ maxLength: 256 }).map((a) => Buffer.from(a));

describe("decodeChatFrame fuzz", () => {
	it("arbitrary bytes never throw anything but an Error", () => {
		fc.assert(
			fc.property(bytes, (buf) => {
				try {
					for (const ev of decodeChatFrame(buf)) expect(typeof ev.kind).toBe("string");
				} catch (e) {
					expect(e).toBeInstanceOf(Error);
				}
			}),
			params,
		);
	});

	it("nested garbage inside known message fields never throws anything but an Error", () => {
		fc.assert(
			fc.property(fc.constantFrom(6, 7, 28), bytes, (num, inner) => {
				try {
					for (const ev of decodeChatFrame(encodeMessage(num, inner))) expect(typeof ev.kind).toBe("string");
				} catch (e) {
					expect(e).toBeInstanceOf(Error);
				}
			}),
			params,
		);
	});

	it("text, reasoning and stop reason round-trip", () => {
		fc.assert(
			fc.property(
				fc.string({ minLength: 1, maxLength: 64 }),
				fc.string({ minLength: 1, maxLength: 64 }),
				fc.nat(20),
				(text, thought, stop) => {
					const frame = Buffer.concat([
						encodeString(3, text),
						encodeString(9, thought),
						encodeVarintField(5, stop),
					]);
					const events = [...decodeChatFrame(frame)];
					expect(events[0]).toEqual({ kind: "text", text });
					expect(events[1]).toEqual({ kind: "reasoning", text: thought });
					expect(events[2]).toMatchObject({ kind: "finish", raw: stop });
				},
			),
			params,
		);
	});
});
