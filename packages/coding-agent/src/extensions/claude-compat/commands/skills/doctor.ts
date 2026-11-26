/** /doctor (/checkup) e /skill-doctor: verificações locais e somente leitura; nunca imprimem valores de arquivos de configuração. */
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { getBuiltinResourcesRoot } from "../../../../core/builtin-resources.ts";
import type { ExtensionAPI, ExtensionCommandContext } from "../../../../core/extensions/types.ts";
import { agentDir } from "../settings/store.ts";

type Ctx = Pick<ExtensionCommandContext, "ui">;
type Check = { ok: boolean; text: string };

/** Parse de JSON sem expor conteúdo: só presença, validade e contagem de chaves. */
export function jsonCheck(label: string, file: string, countKey?: string): Check {
	if (!existsSync(file)) return { ok: true, text: `${label}: ausente (ok, opcional)` };
	try {
		const d = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
		const n =
			countKey && d && typeof d[countKey] === "object" && d[countKey]
				? Object.keys(d[countKey] as object).length
				: undefined;
		return { ok: true, text: `${label}: JSON válido${n === undefined ? "" : ` (${n} em ${countKey})`}` };
	} catch (e) {
		return { ok: false, text: `${label}: JSON inválido (${e instanceof Error ? e.message.slice(0, 80) : "erro"})` };
	}
}

export function doctorChecks(
	dir = agentDir(),
	commandCount = 0,
	skillCount = 0,
	nodeVersion = process.versions.node,
	guard = join(getBuiltinResourcesRoot(), "hooks", "guard.py"),
): Check[] {
	const major = Number(nodeVersion.split(".")[0]);
	return [
		{ ok: major >= 20, text: `Node ${nodeVersion}${major >= 20 ? "" : " (< 20: atualize)"}` },
		{ ok: existsSync(dir), text: `diretório do agente: ${existsSync(dir) ? "existe" : "ausente"}` },
		jsonCheck("settings.json", join(dir, "settings.json")),
		jsonCheck("keybindings.json", join(dir, "keybindings.json")),
		jsonCheck("mcp.json", join(dir, "mcp.json"), "mcpServers"),
		{
			ok: existsSync(guard),
			text: `guarda de segurança (hooks/guard.py): ${existsSync(guard) ? "presente" : "AUSENTE"}`,
		},
		{ ok: skillCount > 0, text: `skills carregadas: ${skillCount}` },
		{ ok: commandCount > 0, text: `comandos carregados: ${commandCount}` },
	];
}

export function doctorText(checks: Check[]): string {
	const bad = checks.filter((c) => !c.ok).length;
	return [
		`Diagnóstico local (somente leitura, sem rede): ${bad ? `${bad} problema(s)` : "tudo certo"}`,
		...checks.map((c) => `  ${c.ok ? "✓" : "✕"} ${c.text}`),
	].join("\n");
}

export interface SkillRef {
	name: string;
	path: string;
}

export function skillDoctor(skills: SkillRef[]): string[] {
	const problems: string[] = [];
	const seen = new Map<string, number>();
	for (const s of skills) {
		const name = s.name.replace(/^skill:/, "");
		seen.set(name, (seen.get(name) ?? 0) + 1);
		let raw: string;
		try {
			raw = readFileSync(s.path, "utf8");
		} catch {
			problems.push(`${name}: arquivo ilegível (${s.path})`);
			continue;
		}
		const fm = /^---\n([\s\S]*?)\n---/.exec(raw)?.[1];
		if (!fm) {
			problems.push(`${name}: sem frontmatter`);
			continue;
		}
		const get = (k: string) =>
			// nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp -- k is a fixed frontmatter key from the call sites below
			new RegExp(`^${k}:\\s*(.+)$`, "m")
				.exec(fm)?.[1]
				?.trim()
				.replace(/^["']|["']$/g, "");
		const fmName = get("name");
		const desc = get("description");
		if (!fmName) problems.push(`${name}: frontmatter sem name`);
		else if (basename(s.path) === "SKILL.md" && fmName !== basename(dirname(s.path)))
			problems.push(`${name}: name "${fmName}" difere do diretório "${basename(dirname(s.path))}"`);
		if (!desc) problems.push(`${name}: sem description`);
		else if (desc.length > 1024) problems.push(`${name}: description com ${desc.length} caracteres (> 1024)`);
	}
	for (const [n, c] of seen) if (c > 1) problems.push(`${n}: carregada ${c} vezes`);
	return problems;
}

export function registerDoctor(nycode: ExtensionAPI, dir?: string): void {
	for (const n of ["doctor", "checkup"])
		nycode.registerCommand(n, {
			description: "Diagnóstico local: Node, configs JSON, guarda, skills e comandos",
			handler: async (_a, ctx: Ctx) => {
				const cmds = nycode.getCommands();
				// Com a extensão diagnostico carregada, o /doctor completo é dela; estas checagens entram como itens.
				const completo = (globalThis as Record<symbol, unknown>)[Symbol.for("nycode-harness:doctor")];
				if (typeof completo === "function")
					return completo(ctx, doctorChecks(dir, cmds.length, cmds.filter((c) => c.source === "skill").length));
				ctx.ui.notify(
					doctorText(doctorChecks(dir, cmds.length, cmds.filter((c) => c.source === "skill").length)),
					"info",
				);
			},
		});
	nycode.registerCommand("skill-doctor", {
		description: "Valida frontmatter e duplicatas das skills carregadas",
		handler: async (_a, ctx: Ctx) => {
			const skills = nycode
				.getCommands()
				.filter((c) => c.source === "skill")
				.map((c) => ({ name: c.name, path: c.sourceInfo.path }));
			const p = skillDoctor(skills);
			ctx.ui.notify(
				p.length
					? `skill-doctor: ${p.length} problema(s) em ${skills.length} skills:\n${p.map((x) => `  ✕ ${x}`).join("\n")}`
					: `skill-doctor: ${skills.length} skills sem problemas.`,
				p.length ? "warning" : "info",
			);
		},
	});
}
