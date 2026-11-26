// K6: the standalone binary resolves the built-in resources next to the executable, so scripts/build-binaries.sh must
// copy `resources/` into every platform directory. A full binary build is too slow for a unit test: this checks the
// static contract (the "Copy shared files" loop and the bun-binary package dir); the real build is the F11 rehearsal.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const pkgRoot = join(import.meta.dirname, "../../../..");
const script = readFileSync(join(pkgRoot, "../../scripts/build-binaries.sh"), "utf-8");
const config = readFileSync(join(pkgRoot, "src/config.ts"), "utf-8");

describe("binary ships the built-in resources", () => {
	it("copies resources/ into each platform directory in the shared-files loop", () => {
		const loop = script.split("# Copy shared files to each platform directory")[1]?.split("\ndone")[0] ?? "";
		expect(loop).toMatch(/^\s*cp -r resources "\$OUTPUT_DIR\/\$platform\/"$/m);
	});

	it("resolves the package dir of a bun binary to the executable directory", () => {
		expect(config).toMatch(/if \(isBunBinary\) \{\s*\/\/[^\n]*\n\s*return dirname\(process\.execPath\);/);
	});

	// D-53: the harness scripts the instructions tell the model to run ship in resources/bin; the binary directory gets
	// them through the same `cp -r resources`, so the copy must keep the execute bit and run without a checkout.
	describe("resources/bin in the copied directory", () => {
		const out = mkdtempSync(join(tmpdir(), "nycode-binres-"));
		afterAll(() => rmSync(out, { recursive: true, force: true }));
		execFileSync("cp", ["-r", join(pkgRoot, "resources"), out]);

		it("keeps the execute bit of the entry points", () => {
			for (const rel of ["bin/doctor/nycode-doctor", "bin/doctor/prune-sessions", "bin/nycode-session"]) {
				expect(statSync(join(out, "resources", rel)).mode & 0o111, rel).not.toBe(0);
			}
		});
	});
});
