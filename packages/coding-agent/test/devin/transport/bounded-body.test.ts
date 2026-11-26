import { afterEach, describe, expect, it, vi } from "vitest";
import {
	MAX_UNARY_BYTES,
	readBodyCapped,
	readErrorText,
} from "../../../src/extensions/devin/transport/bounded-body.ts";
import { postUnary } from "../../../src/extensions/devin/transport/unary.ts";

afterEach(() => vi.unstubAllGlobals());

describe("bounded response bodies", () => {
	it("reads a body within the cap and an empty one", async () => {
		expect((await readBodyCapped(new Response("abc"), 10)).toString()).toBe("abc");
		expect(await readBodyCapped(new Response(null), 10)).toHaveLength(0);
	});

	it("throws past the cap and cancels the stream", async () => {
		await expect(readBodyCapped(new Response("x".repeat(100)), 10)).rejects.toThrow("exceeded 10 bytes");
	});

	it("error text: whole when small, a fixed note when too large", async () => {
		expect(await readErrorText(new Response("small", { status: 500 }))).toBe("small");
		expect(await readErrorText(new Response("x".repeat(70_000), { status: 502 }))).toContain("HTTP 502");
	});

	it("unary: returns bytes, classifies errors, and refuses an oversized body", async () => {
		const options = { timeoutMs: 1000 };
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("ok")),
		);
		expect((await postUnary("https://h", "/p", Buffer.from("x"), options)).toString()).toBe("ok");
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("nope", { status: 500 })),
		);
		await expect(postUnary("https://h", "/p", Buffer.from("x"), options)).rejects.toThrow(/Devin service/);
		expect(MAX_UNARY_BYTES).toBe(16 * 1024 * 1024);
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(new Uint8Array(MAX_UNARY_BYTES + 1))),
		);
		await expect(postUnary("https://h", "/p", Buffer.from("x"), options)).rejects.toThrow("exceeded");
	});
});
