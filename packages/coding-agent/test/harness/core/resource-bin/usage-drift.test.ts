// resources/bin/usage.mjs is the esbuild output of the runbooks usage helper: it must not drift from its source.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { transformSync } from "esbuild";
import { expect, it } from "vitest";

const root = join(import.meta.dirname, "../../../..");

it("usage.mjs is generated from runbooks/usage.ts", () => {
	const source = readFileSync(join(root, "src/extensions/claude-compat/runbooks/usage.ts"), "utf-8");
	const built = transformSync(source, { loader: "ts", format: "esm", target: "node22" }).code;
	const shipped = readFileSync(join(root, "resources/bin/usage.mjs"), "utf-8");
	expect(shipped.endsWith(built)).toBe(true);
	expect(shipped.startsWith("#!/usr/bin/env node\n")).toBe(true);
});
