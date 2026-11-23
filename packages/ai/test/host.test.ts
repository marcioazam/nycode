import { describe, expect, it } from "vitest";
import { baseUrlHostHasLabelPrefix, baseUrlHostIs } from "../src/utils/host.ts";

describe("baseUrlHostIs", () => {
	it("matches the host and its subdomains only", () => {
		expect(baseUrlHostIs("https://api.openai.com/v1", "api.openai.com")).toBe(true);
		expect(baseUrlHostIs("https://API.OpenAI.com/v1", "api.openai.com")).toBe(true);
		expect(baseUrlHostIs("https://foo.api.openai.com/v1", "api.openai.com")).toBe(true);
		expect(baseUrlHostIs("https://api.deepseek.com/v1", "deepseek.com")).toBe(true);
		expect(baseUrlHostIs("https://evil.example/api.openai.com", "api.openai.com")).toBe(false);
		expect(baseUrlHostIs("https://api.openai.com.evil.example/v1", "api.openai.com")).toBe(false);
		expect(baseUrlHostIs("https://notapi.openai.com/v1", "api.openai.com")).toBe(false);
		expect(baseUrlHostIs("not a url", "api.openai.com")).toBe(false);
	});
});

describe("baseUrlHostHasLabelPrefix", () => {
	it("matches a dotted label prefix", () => {
		expect(baseUrlHostHasLabelPrefix("https://api.moonshot.cn/v1", "api.moonshot.")).toBe(true);
		expect(baseUrlHostHasLabelPrefix("https://api.moonshot.ai/v1", "api.moonshot.")).toBe(true);
		expect(baseUrlHostHasLabelPrefix("https://foo.api.moonshot.cn/v1", "api.moonshot.")).toBe(true);
		expect(baseUrlHostHasLabelPrefix("https://notapi.moonshot.cn/v1", "api.moonshot.")).toBe(false);
		expect(baseUrlHostHasLabelPrefix("https://evil.example/?q=api.moonshot.cn", "api.moonshot.")).toBe(false);
	});
});
