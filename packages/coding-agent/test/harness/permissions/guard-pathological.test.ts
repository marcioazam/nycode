// The permission engine reads text the model wrote: no input of the size limit may make it slow (no polynomial regular
// expression, no quadratic loop). Each pathological 256 KB shape must be judged in a few seconds, in every mode.
import { describe, expect, it } from "vitest";
import { decide } from "../../../src/core/permissions/guard/decide.ts";

const SIZE = 262_144;
const fill = (unit: string, tail = ""): string => unit.repeat(Math.ceil(SIZE / unit.length)).slice(0, SIZE) + tail;

const SHAPES: Array<[string, string]> = [
	["open parentheses", fill("(")],
	["nested substitutions", fill("$(")],
	["backticks", fill("`")],
	["slashes then a letter", fill("/", "a")],
	["slash star runs", fill("/*", "x")],
	["spaces between words", `${fill(" ")}a`],
	["words", fill("a ")],
	["heredoc heads", fill("<<A\n")],
	["unterminated heredoc", `cat <<EOF\n${fill("x\n")}`],
	["separators", fill(";")],
	["pipes", fill("a|")],
	["quotes", fill("'")],
	["double quotes", fill('"')],
	["escapes", fill("\\")],
	["fork bomb heads", fill("(){ ")],
	["base64 words", fill("base64 -a")],
	["ifs", fill("$IFS")],
	["braces", fill("${")],
	["newlines", fill("\n")],
	["case patterns", fill("case a in b) ;; ")],
	["env wrappers", fill("env -S ")],
	["eval substitutions", fill('eval "$(ssh-agent -s)" ;')],
	["pgrep kill", `${fill("pgrep -f a ")}| xargs kill`],
];

describe("pathological inputs of the size limit", () => {
	for (const [name, text] of SHAPES) {
		it.each([undefined, "default", "acceptEdits"])(`${name} (mode %s)`, (mode) => {
			const start = Date.now();
			const verdict = decide({
				tool: "Bash",
				input: { command: text },
				cwd: "/tmp",
				project: "/tmp",
				bypass: false,
				mode,
			});
			expect(["allow", "ask", "deny"]).toContain(verdict.kind);
			expect(Date.now() - start).toBeLessThan(8000);
		});
	}

	it("a command above the limit asks instead of being analysed", () => {
		const verdict = decide({
			tool: "Bash",
			input: { command: `${fill("a")}b` },
			cwd: "/tmp",
			project: "/tmp",
			bypass: false,
		});
		expect(verdict.kind).toBe("ask");
	});
});
