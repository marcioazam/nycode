// Property-based fuzzing of the protobuf codec: server bytes are a trust boundary.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	decodeVarint,
	encodeFixed64Field,
	encodeMessage,
	encodeString,
	encodeVarint,
	encodeVarintField,
	iterFields,
} from "../../../src/extensions/devin/wire/proto.ts";

const params = { seed: 20261126, numRuns: 300 };
const bytes = fc.uint8Array({ maxLength: 256 }).map((a) => Buffer.from(a));
const u64 = fc.bigInt({ min: 0n, max: (1n << 64n) - 1n });
// encodeTag shifts in int32, so field numbers above 2^28-1 are out of range (callers use small constants).
const fieldNum = fc.integer({ min: 1, max: 0x0fffffff });

describe("proto fuzz", () => {
	it("decodeVarint on arbitrary bytes returns or throws an Error only", () => {
		fc.assert(
			fc.property(bytes, fc.nat(300), (buf, offset) => {
				try {
					const [, next] = decodeVarint(buf, offset);
					expect(next).toBeGreaterThan(offset);
					expect(next - offset).toBeLessThanOrEqual(10);
				} catch (e) {
					expect(e).toBeInstanceOf(Error);
				}
			}),
			params,
		);
	});

	it("iterFields on arbitrary bytes terminates with fields inside the buffer or an Error", () => {
		fc.assert(
			fc.property(bytes, (buf) => {
				try {
					let count = 0;
					for (const f of iterFields(buf)) {
						count++;
						expect(count).toBeLessThanOrEqual(buf.length);
						if (Buffer.isBuffer(f.value)) expect(f.value.length).toBeLessThanOrEqual(buf.length);
					}
				} catch (e) {
					expect(e).toBeInstanceOf(Error);
				}
			}),
			params,
		);
	});

	it("varint round-trips every 64-bit value in at most 10 bytes", () => {
		fc.assert(
			fc.property(u64, (v) => {
				const enc = encodeVarint(v);
				expect(enc.length).toBeLessThanOrEqual(10);
				expect(decodeVarint(enc, 0)).toEqual([v, enc.length]);
			}),
			params,
		);
	});

	it("rejects a varint longer than 10 bytes", () => {
		fc.assert(
			fc.property(fc.integer({ min: 10, max: 40 }), bytes, (n, tail) => {
				const buf = Buffer.concat([Buffer.alloc(n, 0x80), tail]);
				expect(() => decodeVarint(buf, 0)).toThrow("varint too long");
			}),
			params,
		);
	});

	it("negative varints are rejected with a RangeError", () => {
		fc.assert(
			fc.property(fc.bigInt({ min: -(1n << 64n), max: -1n }), (v) => {
				expect(() => encodeVarint(v)).toThrow(RangeError);
			}),
			params,
		);
	});

	it("encoded fields decode back to the same number, wire type and value", () => {
		fc.assert(
			fc.property(
				fieldNum,
				fc.string({ maxLength: 64 }),
				u64,
				fc.double({ noNaN: true }),
				bytes,
				(num, s, v, d, body) => {
					const msg = Buffer.concat([
						encodeString(num, s),
						encodeVarintField(num, v),
						encodeFixed64Field(num, d),
						encodeMessage(num, body),
					]);
					const fields = [...iterFields(msg)];
					expect(fields.map((f) => [f.num, f.wire])).toEqual([
						[num, 2],
						[num, 0],
						[num, 1],
						[num, 2],
					]);
					expect((fields[0].value as Buffer).toString("utf8")).toBe(s);
					expect(fields[1].value).toBe(v);
					expect((fields[2].value as Buffer).readDoubleLE(0)).toBe(d);
					expect(fields[3].value).toEqual(body);
				},
			),
			params,
		);
	});
});
