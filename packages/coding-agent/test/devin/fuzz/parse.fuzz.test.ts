// Property-based fuzzing of the error body and trailer parsers: bounded, redacted, never throwing.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parseHttpError, parseTrailerError } from "../../../src/extensions/devin/errors/parse.ts";

const params = { seed: 20261126, numRuns: 400 };
const jsonish = fc.oneof(
	fc.string({ maxLength: 300 }),
	fc.json().map((j) => j),
	fc.record({ code: fc.anything(), message: fc.anything() }).map((r) => JSON.stringify(r)),
	fc
		.record({ error: fc.oneof(fc.string(), fc.record({ code: fc.anything(), message: fc.anything() })) })
		.map((r) => JSON.stringify(r)),
);

describe("error parser fuzz", () => {
	it("parseHttpError never throws and bounds the message", () => {
		fc.assert(
			fc.property(fc.integer({ min: 100, max: 599 }), jsonish, (status, body) => {
				const d = parseHttpError(status, body);
				expect(d.status).toBe(status);
				expect(d.message.length).toBeLessThanOrEqual(600);
			}),
			params,
		);
	});

	it("parseTrailerError never throws on arbitrary bytes and bounds the message", () => {
		fc.assert(
			fc.property(
				fc.oneof(
					fc.uint8Array({ maxLength: 300 }).map((a) => Buffer.from(a)),
					jsonish.map((s) => Buffer.from(s)),
				),
				(buf) => {
					const d = parseTrailerError(buf);
					if (d) expect(d.message.length).toBeLessThanOrEqual(600);
				},
			),
			params,
		);
	});

	it("a payload without an error marker is not an error", () => {
		fc.assert(
			fc.property(
				fc.string({ maxLength: 200 }).filter((s) => !s.includes('"error"')),
				(s) => {
					expect(parseTrailerError(Buffer.from(s))).toBeNull();
				},
			),
			params,
		);
	});
});
