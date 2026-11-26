import { expect, it } from "vitest";
import { allHighlightLanguagesLoaded, highlightJs as hljs, supportsLanguage } from "../src/utils/syntax-highlight.ts";

it("loads the remaining grammars on the first request for one, into the shared core instance", async () => {
	// Nothing asked for an uncommon grammar yet, so the full set is not loaded (it used to load at startup).
	await new Promise((resolve) => setImmediate(resolve));
	expect(hljs.getLanguage("elixir")).toBeUndefined();
	expect(supportsLanguage("typescript")).toBe(true);
	await new Promise((resolve) => setImmediate(resolve));
	expect(hljs.getLanguage("elixir")).toBeUndefined();

	expect(supportsLanguage("elixir")).toBe(false);
	await allHighlightLanguagesLoaded;
	expect(supportsLanguage("elixir")).toBe(true);
	expect(hljs.getLanguage("yaml")).toBeDefined();
});
