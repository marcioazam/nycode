import { describe, expect, it } from "vitest";
import { oauthErrorHtml } from "../src/utils/oauth-page.ts";

describe("oauthErrorHtml", () => {
	it("escapes a callback error before writing HTML", () => {
		const html = oauthErrorHtml("Sign-in failed", `<script>alert(1)</script>`);
		expect(html).not.toContain("<script>");
		expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
	});
});
