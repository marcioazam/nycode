// D-62: the user-scope configuration directory is the nycode agent directory; no other tool's home directory is read.
import { afterEach, describe, expect, it, vi } from "vitest";
import { userConfigDir } from "../../../src/extensions/_shared/settings/config-dir.ts";

afterEach(() => vi.unstubAllEnvs());

describe("userConfigDir", () => {
	it("is the nycode agent directory", () => {
		vi.stubEnv("NYCODE_CODING_AGENT_DIR", "/elsewhere/agent");
		expect(userConfigDir()).toBe("/elsewhere/agent");
	});

	it("ignores another tool's config-directory variable", () => {
		vi.stubEnv("NYCODE_CODING_AGENT_DIR", "/elsewhere/agent");
		vi.stubEnv("CLAUDE_CONFIG_DIR", "/other/tool");
		expect(userConfigDir()).toBe("/elsewhere/agent");
	});
});
