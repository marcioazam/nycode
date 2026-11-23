// `migrate from-pi` personal layer (D-55): what is copied, what is kept or left out, and the precedence that makes the copy useful.
import {
	chmodSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RESOURCES_MARKER } from "../../../../src/core/builtin-resources.ts";
import { loadSkills } from "../../../../src/core/skills.ts";
import { collectCommands, commandDirs } from "../../../../src/extensions/commands/expand.ts";
import { discoverAgents } from "../../../../src/extensions/subagent/registry/agents.ts";
import { convertSettings } from "../../../../src/migrations/from-pi-convert.ts";
import { THEME_RENAMES } from "../../../../src/migrations/from-pi-personal.ts";
import { NYCODE_THEME_NAMES } from "../../../../src/modes/interactive/theme/nycode-themes.ts";
import { type Home, makeHome, SECRET } from "../from-pi-fixture.ts";

afterEach(() => vi.unstubAllEnvs());

const write = (path: string, text: string, mode?: number): void => {
	mkdirSync(join(path, ".."), { recursive: true });
	writeFileSync(path, text);
	if (mode !== undefined) chmodSync(path, mode);
};
const skill = (name: string): string => `---\nname: ${name}\ndescription: ${name} test skill\n---\nbody of ${name}\n`;
const agent = (name: string, body = "body"): string => `---\nname: ${name}\ndescription: ${name} agent\n---\n${body}\n`;
const text = (h: Home): string => h.out.join("\n");

/** An embedded name of each kind, read from the package so the test follows the shipped resources. */
const EMBEDDED_SKILL = "tdd";
const EMBEDDED_AGENT = "code-reviewer";
const EMBEDDED_COMMAND = "commit";

function personalSource(h: Home): void {
	const s = h.source;
	write(join(s, "AGENTS.md"), "# personal instructions\n");
	write(join(s, "subagent-routing.json"), JSON.stringify({ version: 1, models: { "p/m": ["low", "high"] } }));
	write(join(s, "plans", "2026-11-13-aa.md"), "plan\n");
	write(join(s, "checkpoints", "x.jsonl"), "checkpoint\n");
	write(
		join(s, "extensions", "conta.ts"),
		[
			"import type { A } from '@earendil-works/pi-coding-agent'",
			"const DIR = path.join(process.env.PI_CODING_AGENT_DIR ?? path.join(os.homedir(), '.pi', 'agent'), 'accounts')",
			"description: 'Alterna a conta Claude sem sair do pi',",
			"const r = await pi.exec(BIN, cmd, { timeout: 30_000 })",
			"",
		].join("\n"),
	);
	const home = join(s, "claude-home");
	write(join(home, "skills", EMBEDDED_SKILL, "SKILL.md"), skill(EMBEDDED_SKILL));
	write(join(home, "skills", "mine", "SKILL.md"), skill("mine"));
	write(join(home, "skills", "mine", "scripts", "run.py"), "print(1)\n");
	write(join(home, "skills", "mine", "scripts", "__pycache__", "x.pyc"), "junk");
	write(join(home, "skills", "no-skill-md", "README.md"), "not a skill\n");
	write(join(home, "agents", `${EMBEDDED_AGENT}.md`), agent(EMBEDDED_AGENT));
	write(join(home, "agents", "mine-agent.md"), agent("mine-agent"));
	write(join(home, "commands", `${EMBEDDED_COMMAND}.md`), "embedded command\n");
	write(join(home, "commands", "mine-cmd.md"), "personal command\n");
	write(join(home, "hooks", "guard.py"), "hook\n");
	// a themed symlink farm: file links resolve to content, as the pi-harness links do
	write(join(h.home, "elsewhere", "pi-link.json"), JSON.stringify({ name: "pi-link", colors: { a: 1 } }));
	mkdirSync(join(s, "themes"), { recursive: true });
	symlinkSync(join(h.home, "elsewhere", "pi-link.json"), join(s, "themes", "pi-link.json"));
	write(join(s, "themes", "tokyo-night.json"), JSON.stringify({ name: "tokyo-night", colors: {} }));
	write(join(s, "themes", "pi-claro.json"), JSON.stringify({ name: "pi-claro", colors: {} }));
	write(join(s, "themes", "broken.json"), "not json");
	symlinkSync(join(h.home, "elsewhere", "pi-link.json"), join(home, "agents", "linked-agent.md"));
}

describe("migrate from-pi personal layer", () => {
	it("copies AGENTS.md, plans and a valid routing policy, and keeps what the destination already has", async () => {
		const h = makeHome();
		personalSource(h);
		write(join(h.agentDir, "AGENTS.md"), "destination instructions\n");
		expect(await h.run(["--apply"])).toBe(0);
		expect(readFileSync(join(h.agentDir, "AGENTS.md"), "utf8")).toBe("destination instructions\n");
		expect(readFileSync(join(h.agentDir, "plans", "2026-11-13-aa.md"), "utf8")).toBe("plan\n");
		expect(JSON.parse(readFileSync(join(h.agentDir, "subagent-routing.json"), "utf8")).version).toBe(1);
		expect(text(h)).toMatch(/keep\s+AGENTS\.md.*already in the destination/);
	});

	it("does not copy an invalid routing policy and says why", async () => {
		const h = makeHome();
		write(join(h.source, "subagent-routing.json"), JSON.stringify({ version: 2, models: {} }));
		await h.run(["--apply"]);
		expect(existsSync(join(h.agentDir, "subagent-routing.json"))).toBe(false);
		expect(text(h)).toContain("subagent-routing.json not copied: version must be 1");
	});

	it("copies unknown themes by content, and leaves out built-in names, replaced pi themes and broken files", async () => {
		const h = makeHome();
		personalSource(h);
		await h.run(["--apply"]);
		const themes = join(h.agentDir, "themes");
		expect(readdirSync(themes)).toEqual(["pi-link.json"]);
		expect(statSync(join(themes, "pi-link.json")).isFile()).toBe(true);
		const out = text(h);
		expect(out).toContain('the built-in theme "tokyo-night" wins');
		expect(out).toContain("replaced by the built-in theme nycode-claro");
		expect(out).toContain("themes/broken.json not copied");
	});

	it("converts pi theme names in the theme setting, composed values included", () => {
		const convert = (theme: string) => convertSettings({ theme }, { values: {}, ignored: [] });
		expect(convert("pi-claro/pi-noite").settings.theme).toBe("nycode-claro/nycode-noite");
		expect(convert("pi-escuro").settings.theme).toBe("nycode-escuro");
		expect(convert("pi-escuro").themeRenamed).toBe("pi-escuro -> nycode-escuro");
		expect(convert("tokyo-night").settings.theme).toBe("tokyo-night");
		expect(convert("tokyo-night").themeRenamed).toBeUndefined();
		expect(convert("my-pi-claro").settings.theme).toBe("my-pi-claro");
	});

	it("converts only to themes the package embeds", () => {
		for (const pi of Object.keys(THEME_RENAMES)) expect(NYCODE_THEME_NAMES).toContain(THEME_RENAMES[pi]);
	});

	it("notes the theme conversion in the plan", async () => {
		const h = makeHome();
		write(join(h.source, "settings.json"), JSON.stringify({ theme: "pi-claro/pi-noite" }));
		await h.run([]);
		expect(text(h)).toContain("theme: pi-claro/pi-noite -> nycode-claro/nycode-noite");
	});

	it("copies only the claude-home skills and agents the package does not embed, symlinks resolved", async () => {
		const h = makeHome();
		personalSource(h);
		await h.run(["--apply"]);
		expect(readdirSync(join(h.agentDir, "skills"))).toEqual(["mine"]);
		expect(readdirSync(join(h.agentDir, "skills", "mine")).sort()).toEqual(["SKILL.md", "scripts"]);
		expect(readdirSync(join(h.agentDir, "skills", "mine", "scripts"))).toEqual(["run.py"]);
		expect(readdirSync(join(h.agentDir, "agents")).sort()).toEqual(["linked-agent.md", "mine-agent.md"]);
		expect(statSync(join(h.agentDir, "agents", "linked-agent.md")).isFile()).toBe(true);
		const out = text(h);
		expect(out).toContain(
			`claude-home skills: 1 not copied, the package embeds ones with the same name: ${EMBEDDED_SKILL}`,
		);
		expect(out).toContain(
			`claude-home agents: 1 not copied, the package embeds ones with the same name: ${EMBEDDED_AGENT}`,
		);
	});

	it("keeps an existing skill and agent of the destination", async () => {
		const h = makeHome();
		personalSource(h);
		write(join(h.agentDir, "skills", "mine", "SKILL.md"), skill("mine").replace("body", "mine-dest"));
		await h.run(["--apply"]);
		expect(readFileSync(join(h.agentDir, "skills", "mine", "SKILL.md"), "utf8")).toContain("mine-dest");
		expect(readFileSync(join(h.agentDir, "skills", "mine", "scripts", "run.py"), "utf8")).toBe("print(1)\n");
	});

	it("copies the claude-home commands the package does not embed, and not checkpoints or hooks", async () => {
		const h = makeHome();
		personalSource(h);
		await h.run(["--apply"]);
		expect(readdirSync(join(h.agentDir, "commands"))).toEqual(["mine-cmd.md"]);
		for (const rel of ["checkpoints", "hooks"]) expect(existsSync(join(h.agentDir, rel))).toBe(false);
		const out = text(h);
		expect(out).toContain(
			`claude-home commands: 1 not copied, the package embeds ones with the same name: ${EMBEDDED_COMMAND}`,
		);
		expect(out).toContain("claude-home hooks are not copied");
	});

	it("copies the personal conta.ts with the pi names converted", async () => {
		const h = makeHome();
		personalSource(h);
		await h.run(["--apply"]);
		const copied = readFileSync(join(h.agentDir, "extensions", "conta.ts"), "utf8");
		expect(copied).toContain("@nycode/coding-agent");
		expect(copied).toContain("NYCODE_CODING_AGENT_DIR");
		expect(copied).toContain("'.nycode', 'agent'");
		expect(copied).not.toContain("process.env.PI_CODING_AGENT_DIR");
		expect(copied).toContain("sem sair do nycode");
	});

	it("points the pi-conta helper at the nycode agent dir, not ~/.pi/agent", async () => {
		const h = makeHome();
		personalSource(h);
		await h.run(["--apply"]);
		const copied = readFileSync(join(h.agentDir, "extensions", "conta.ts"), "utf8");
		// pi-conta rewrites $PI_CODING_AGENT_DIR/auth.json and defaults to ~/.pi/agent.
		expect(copied).toContain(`pi.exec('env', [\`PI_CODING_AGENT_DIR=\${path.dirname(DIR)}\`, BIN, ...cmd], {`);
		expect(copied).not.toContain("pi.exec(BIN, cmd,");
	});

	it("dry run lists the personal items and writes nothing", async () => {
		const h = makeHome();
		personalSource(h);
		await h.run([]);
		expect(existsSync(h.agentDir)).toBe(false);
		const out = text(h);
		expect(out).toMatch(/create\s+AGENTS\.md/);
		expect(out).toMatch(/skills\/\s+2 file\(s\) to copy/);
		expect(out).toMatch(/agents\/\s+2 file\(s\) to copy/);
	});
});

describe("migrate from-pi mcp-auth.json", () => {
	const states = (h: Home) =>
		write(join(h.source, "mcp-auth.json"), JSON.stringify({ "mcp__x|https://x": { tokens: { t: SECRET } } }), 0o600);

	it("is a credential: skipped without a terminal, copied 0600 after confirmation", async () => {
		const h = makeHome();
		states(h);
		await h.run(["--apply"]);
		expect(existsSync(join(h.agentDir, "mcp-auth.json"))).toBe(false);
		expect(text(h)).toContain("mcp-auth.json: no interactive terminal");
		await h.run(["--apply"], { isInteractive: true, confirm: async () => true });
		const file = join(h.agentDir, "mcp-auth.json");
		expect(statSync(file).mode & 0o777).toBe(0o600);
		expect(readFileSync(file, "utf8")).toContain(SECRET);
		expect([...h.out, ...h.err].join("\n")).not.toContain(SECRET);
	});

	it("is not copied when the user declines", async () => {
		const h = makeHome();
		states(h);
		await h.run(["--apply"], { isInteractive: true, confirm: async (q) => !q.includes("mcp-auth.json") });
		expect(existsSync(join(h.agentDir, "mcp-auth.json"))).toBe(false);
		expect(text(h)).toContain("mcp-auth.json: declined");
	});

	it("keeps a destination that already holds sign-ins, and replaces an empty one with a backup", async () => {
		const h = makeHome();
		states(h);
		write(join(h.agentDir, "mcp-auth.json"), JSON.stringify({ "mcp__y|https://y": { tokens: {} } }), 0o600);
		await h.run(["--apply"], { isInteractive: true, confirm: async () => true });
		expect(readFileSync(join(h.agentDir, "mcp-auth.json"), "utf8")).toContain("mcp__y");
		expect(text(h)).toContain("kept: the destination already holds MCP sign-ins");
		write(join(h.agentDir, "mcp-auth.json"), "{}", 0o600);
		await h.run(["--apply"], { isInteractive: true, confirm: async () => true });
		expect(readFileSync(join(h.agentDir, "mcp-auth.json"), "utf8")).toContain("mcp__x");
		expect(readdirSync(join(h.agentDir, ".backup-from-pi"))).toHaveLength(1);
	});
});

describe("personal overlay of claude-home", () => {
	const overlay = [
		"Bypass: `PI_BYPASS_PERMISSIONS=1` in `~/.pi/agent/local.env`; `pi --safe` turns it off.",
		"Checks: `python3 ~/.pi/agent/claude-home/bin/checks/check-instructions.py` as in `rules-ref/harness-economy.md`.",
		"Providers: `~/.pi/agent/claude-home/skills/deep-search/references/providers.md`; mine: `~/.pi/agent/claude-home/skills/mine/x.py`.",
		"Overrides rules/safety.md and rules-ref/research-and-tools.md.",
		"Delivery drives `~/.claude/bin/git-deliver`.",
		"",
	].join("\n");

	it("appends rules/personal.md to the copied AGENTS.md with the pi names converted", async () => {
		const h = makeHome();
		write(join(h.source, "AGENTS.md"), "# personal instructions\n");
		write(join(h.source, "claude-home", "rules", "personal.md"), overlay);
		expect(await h.run(["--apply"])).toBe(0);
		const merged = readFileSync(join(h.agentDir, "AGENTS.md"), "utf8");
		expect(merged.startsWith("# personal instructions\n\n")).toBe(true);
		expect(merged).toContain(
			"`NYCODE_BYPASS_PERMISSIONS=1` in `~/.nycode/agent/local.env`; `nycode --safe` turns it off.",
		);
		expect(merged).toContain(
			`\`python3 ${RESOURCES_MARKER}/bin/checks/check-instructions.py\` as in \`${RESOURCES_MARKER}/rules/ref/harness-economy.md\``,
		);
		expect(merged).toContain(
			`\`${RESOURCES_MARKER}/skills/deep-search/references/providers.md\`; mine: \`~/.nycode/agent/skills/mine/x.py\``,
		);
		expect(merged).toContain(
			`Overrides ${RESOURCES_MARKER}/rules/safety.md and ${RESOURCES_MARKER}/rules/ref/research-and-tools.md.`,
		);
		expect(merged).toContain(`Delivery drives \`${RESOURCES_MARKER}/bin/git-deliver\`.`);
		expect(merged).not.toMatch(/\.pi\/agent|\bPI_|claude-home|\.claude/);
		expect(text(h)).toMatch(/create\s+AGENTS\.md.*rules\/personal\.md/);
	});

	it("is the whole AGENTS.md when the pi directory has none, and an existing destination is kept", async () => {
		const h = makeHome();
		write(join(h.source, "claude-home", "rules", "personal.md"), overlay);
		expect(await h.run(["--apply"])).toBe(0);
		expect(readFileSync(join(h.agentDir, "AGENTS.md"), "utf8")).toContain("`nycode --safe`");
		const kept = makeHome();
		write(join(kept.source, "claude-home", "rules", "personal.md"), overlay);
		write(join(kept.agentDir, "AGENTS.md"), "destination instructions\n");
		expect(await kept.run(["--apply"])).toBe(0);
		expect(readFileSync(join(kept.agentDir, "AGENTS.md"), "utf8")).toBe("destination instructions\n");
	});
});

describe("precedence that makes the personal layer useful", () => {
	it("a skill in <agent dir>/skills wins over the embedded one of the same name", () => {
		const h = makeHome();
		write(join(h.agentDir, "skills", "dup", "SKILL.md"), skill("dup").replace("body of dup", "from-nycode"));
		write(join(h.home, "embedded", "dup", "SKILL.md"), skill("dup").replace("body of dup", "embedded"));
		const result = loadSkills({
			cwd: h.home,
			agentDir: h.agentDir,
			skillPaths: [join(h.home, "embedded")],
			includeDefaults: true,
		});
		const winner = result.skills.find((s) => s.name === "dup");
		expect(winner?.filePath).toBe(join(h.agentDir, "skills", "dup", "SKILL.md"));
	});

	it("agents and commands come from <agent dir>, never from the home directory of another tool (D-62)", () => {
		const h = makeHome();
		vi.stubEnv("NYCODE_CODING_AGENT_DIR", h.agentDir);
		vi.stubEnv("HOME", h.home);
		write(join(h.agentDir, "agents", "mine.md"), agent("mine", "from-nycode"));
		write(join(h.home, ".claude", "agents", "other.md"), agent("other", "elsewhere"));
		write(join(h.agentDir, "commands", "x.md"), "x");
		write(join(h.home, ".claude", "commands", "y.md"), "y");
		const names = discoverAgents(h.home, "both").agents.map((a) => a.name);
		expect(names).toContain("mine");
		expect(names).not.toContain("other");
		const dirs = commandDirs(h.home, true, h.agentDir);
		expect(dirs).toContain(join(h.agentDir, "commands"));
		expect(dirs).not.toContain(join(h.home, ".claude", "commands"));
	});

	it("an agent in <agent dir>/agents replaces an embedded agent of the same name", () => {
		const h = makeHome();
		vi.stubEnv("NYCODE_CODING_AGENT_DIR", h.agentDir);
		write(join(h.agentDir, "agents", `${EMBEDDED_AGENT}.md`), agent(EMBEDDED_AGENT, "personal version"));
		const found = discoverAgents(h.home, "user").agents.find((a) => a.name === EMBEDDED_AGENT);
		expect(found?.systemPrompt).toContain("personal version");
	});

	it("a command in <agent dir>/commands wins over the embedded one of the same name", () => {
		const h = makeHome();
		write(join(h.agentDir, "commands", `${EMBEDDED_COMMAND}.md`), "personal commit");
		const found = new Map(collectCommands(commandDirs(h.home, false, h.agentDir)).map((c) => [c.name, c.filePath]));
		expect(found.get(EMBEDDED_COMMAND)).toBe(join(h.agentDir, "commands", `${EMBEDDED_COMMAND}.md`));
	});
});
