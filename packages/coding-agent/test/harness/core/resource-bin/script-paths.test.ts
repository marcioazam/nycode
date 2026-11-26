// PR-B: the harness scripts the embedded texts tell the model to run live inside the package (resources/bin),
// never in the repository's scripts/. Every script path an embedded text cites through
// ${NYCODE_RESOURCES} must resolve under resources/, and no text may cite the old checkout-relative paths.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const resources = join(import.meta.dirname, "../../../../resources");
const TEXT = /\.(md|py|sh|mjs|cjs|ts|json)$/;
// ${NYCODE_RESOURCES}/bin/... and ${NYCODE_RESOURCES}/skills/<name>/scripts/...
const CITED = /\$\{NYCODE_RESOURCES\}\/((?:bin|skills\/[\w-]+\/scripts)\/[^\s`'")\]>,;|*<{}]+)/g;
const OLD_PATH = /scripts\/(?:harness|ci)\//;

function walk(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		return entry.isDirectory() ? walk(path) : TEXT.test(entry.name) ? [path] : [];
	});
}

const files = walk(resources).map((path) => ({ rel: relative(resources, path), text: readFileSync(path, "utf-8") }));

describe("script paths cited by the embedded resources", () => {
	it("has a resources/bin tree with the harness scripts", () => {
		for (const rel of ["bin/doctor/nycode-doctor", "bin/usage.mjs", "bin/nycode-session"]) {
			expect(existsSync(join(resources, rel)), rel).toBe(true);
		}
	});

	it("resolves every cited NYCODE_RESOURCES script path inside the package", () => {
		const missing: string[] = [];
		for (const { rel, text } of files) {
			for (const line of text.split("\n")) {
				if (/optional/i.test(line)) continue; // an optional piece may be absent
				for (const match of line.matchAll(CITED)) {
					const target = match[1].replace(/[.:]+$/, "");
					if (!existsSync(join(resources, target))) missing.push(`${rel}: ${target}`);
				}
			}
		}
		expect(missing).toEqual([]);
	});

	it("cites no checkout-relative scripts/harness or scripts/ci path", () => {
		const stale = files.filter(({ text }) => OLD_PATH.test(text)).map(({ rel }) => rel);
		expect(stale).toEqual([]);
	});

	it("keeps the execute bit on the entry points", () => {
		for (const rel of ["bin/doctor/nycode-doctor", "bin/doctor/nycode-typecheck", "bin/doctor/prune-sessions"]) {
			expect(statSync(join(resources, rel)).mode & 0o111, rel).not.toBe(0);
		}
	});
});
