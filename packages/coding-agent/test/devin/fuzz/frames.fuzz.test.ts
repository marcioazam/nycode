// Property-based fuzzing of the Connect frame parser: chunking, round-trip and the size cap.
import { gunzipSync } from "node:zlib";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ConnectFrameParser, MAX_FRAME_BYTES } from "../../../src/extensions/devin/wire/frames.ts";
import { frameConnectStream } from "../../../src/extensions/devin/wire/proto.ts";

const params = { seed: 20261126, numRuns: 300 };
const bodies = fc.array(
	fc.uint8Array({ maxLength: 200 }).map((a) => Buffer.from(a)),
	{ maxLength: 6 },
);

/** Splits `buf` at the given cut points. */
function chunk(buf: Buffer, cuts: number[]): Buffer[] {
	const points = [...new Set(cuts.map((c) => c % (buf.length + 1)))].sort((a, b) => a - b);
	const out: Buffer[] = [];
	let prev = 0;
	for (const p of [...points, buf.length]) {
		out.push(buf.subarray(prev, p));
		prev = p;
	}
	return out;
}

describe("ConnectFrameParser fuzz", () => {
	it("arbitrary chunks yield frames within the cap or throw an Error only", () => {
		fc.assert(
			fc.property(fc.array(fc.uint8Array({ maxLength: 64 }), { maxLength: 20 }), (chunks) => {
				const parser = new ConnectFrameParser();
				try {
					for (const c of chunks) {
						for (const f of parser.push(c)) expect(f.payload.length).toBeLessThanOrEqual(MAX_FRAME_BYTES);
					}
				} catch (e) {
					expect(e).toBeInstanceOf(Error);
				}
			}),
			params,
		);
	});

	it("frames survive any chunking, compressed or not", () => {
		fc.assert(
			fc.property(bodies, fc.boolean(), fc.array(fc.nat(), { maxLength: 12 }), (msgs, compress, cuts) => {
				const stream = Buffer.concat(msgs.map((m) => frameConnectStream(m, compress)));
				const parser = new ConnectFrameParser();
				const frames = chunk(stream, cuts).flatMap((c) => parser.push(c));
				expect(frames.map((f) => f.flags)).toEqual(msgs.map(() => (compress ? 1 : 0)));
				expect(frames.map((f) => (compress ? gunzipSync(f.payload) : f.payload))).toEqual(msgs);
			}),
			params,
		);
	});

	it("a header announcing more than the cap throws, at the cap it waits for payload", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 0, max: 255 }),
				fc.integer({ min: MAX_FRAME_BYTES + 1, max: 0xffffffff }),
				(flags, len) => {
					const header = Buffer.alloc(5);
					header[0] = flags;
					header.writeUInt32BE(len, 1);
					expect(() => new ConnectFrameParser().push(header)).toThrow(/exceeds/);
				},
			),
			params,
		);
		const atCap = Buffer.alloc(5);
		atCap.writeUInt32BE(MAX_FRAME_BYTES, 1);
		expect(new ConnectFrameParser().push(atCap)).toEqual([]);
	});
});
