import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configDefaults, defineConfig, mergeConfig } from "vitest/config";
import baseConfig, { workspaceSourcePaths } from "../../vitest.base.ts";

// `import ".../config.ts?as-bun-binary"` loads config.ts as a compiled Bun binary sees it: from a `$bunfs`
// URL. Only an explicit query opts in; every normal import keeps the real file URL.
const asBunBinary = {
	name: "as-bun-binary",
	transform(code: string, id: string) {
		if (!id.endsWith("?as-bun-binary")) return undefined;
		return { code: code.replaceAll("import.meta.url", JSON.stringify("file:///$bunfs/root/nycode")), map: null };
	},
};

// Every test gets a throwaway home: sessions, plans and settings must never land in the user's ~/.nycode/agent.
// HOME and not NYCODE_CODING_AGENT_DIR, which would win over the fake homes many tests set up themselves.
const testHome = mkdtempSync(join(tmpdir(), "nycode-vitest-home-"));
process.on("exit", () => rmSync(testHome, { recursive: true, force: true }));
// The workers inherit this environment, and ./test.sh already starts them from an empty one. A shell inside nycode
// exports its session's NYCODE_* (bypass, permission mode); provider keys put real providers in the model list and
// once sent billed requests from unit tests. NYCODE_TEST_LIVE=1 keeps the keys for the live tests.
for (const name of Object.keys(process.env)) {
	const isSessionVar = name.startsWith("NYCODE_") && name !== "NYCODE_TEST_LIVE" && name !== "NYCODE_NO_LOCAL_LLM";
	const isProviderKey = !process.env.NYCODE_TEST_LIVE && /_(API_KEY|AUTH_TOKEN|OAUTH_TOKEN)$/.test(name);
	if (isSessionVar || isProviderKey) delete process.env[name];
}

export default mergeConfig(
	baseConfig,
	defineConfig({
		plugins: [asBunBinary],
		test: {
			globals: true,
			environment: "node",
			// resources/ holds embedded skill tests and the status-line tests run under node:test (see the "test" script), not vitest.
			exclude: [...configDefaults.exclude, "resources/**", "test/harness/statusline/**"],
			testTimeout: 30000,
			// Tests run offline by default; opt in with allowNetwork() from test/test-network-env.ts.
			env: { NYCODE_OFFLINE: "1", HOME: testHome },
			unstubEnvs: true,
			reporters: process.env.GITHUB_ACTIONS ? ["dot", "github-actions"] : ["dot"],
			silent: "passed-only",
			server: {
				deps: {
					external: [/@silvia-odwyer\/photon-node/],
				},
			},
		},
		resolve: {
			alias: [
				{ find: /^@nycode\/ai$/, replacement: workspaceSourcePaths.aiIndex },
				{ find: /^@nycode\/agent-core$/, replacement: workspaceSourcePaths.agentIndex },
			],
		},
	}),
);
