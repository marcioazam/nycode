/** /list-agents (/peers): agentes definidos + subagentes em execução (fleet do nycode); /stop: interrompe a execução atual, e com `agents` os subagentes desta sessão. */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI, ExtensionCommandContext } from "../../../../core/extensions/types.ts";
import { discoverAgents } from "../../../subagent/registry/agents.ts";
import { stopAgents } from "../../fleet.ts";

export interface AgentDef {
	name: string;
	description: string;
	model?: string;
}

/** Frontmatter simples (`chave: valor` entre `---`); sem avaliar nada do arquivo. */
export function readAgentDefs(dir: string): AgentDef[] {
	if (!existsSync(dir)) return [];
	const out: AgentDef[] = [];
	for (const f of readdirSync(dir)
		.filter((x) => x.endsWith(".md"))
		.sort()) {
		const m = /^---\n([\s\S]*?)\n---/.exec(readFileSync(join(dir, f), "utf8"));
		const get = (k: string) =>
			// nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp -- k is a fixed frontmatter key from the call sites below
			new RegExp(`^${k}:\\s*(.+)$`, "m")
				.exec(m?.[1] ?? "")?.[1]
				?.trim()
				.replace(/^["']|["']$/g, "");
		out.push({
			name: get("name") ?? f.replace(/\.md$/, ""),
			description: (get("description") ?? "").slice(0, 90),
			model: get("model"),
		});
	}
	return out;
}

type Ctx = Pick<ExtensionCommandContext, "ui" | "cwd">;
export interface Fleet {
	list(): unknown[];
}

export function listAgentsText(defs: AgentDef[], fleet: Fleet | undefined): string {
	const rows = fleet ? fleet.list() : undefined;
	const live =
		rows === undefined
			? "subagentes em execução: controle indisponível nesta sessão"
			: rows.length
				? `subagentes em execução (${rows.length}):\n${rows.map((r) => `  ${JSON.stringify(pick(r))}`).join("\n")}`
				: "subagentes em execução: nenhum";
	return [
		`Agentes definidos (${defs.length}):`,
		...defs.map((d) => `  ${d.name}${d.model ? ` [${d.model}]` : ""} — ${d.description}`),
		live,
	].join("\n");
}
const pick = (r: unknown) => {
	const o = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
	return Object.fromEntries(
		["id", "agent", "name", "status", "task"]
			.filter((k) => k in o)
			.map((k) => [k, typeof o[k] === "string" ? (o[k] as string).slice(0, 80) : o[k]]),
	);
};

function currentFleet(): Fleet | undefined {
	const s = (Reflect.get(globalThis, Symbol.for("nycode.fleet.source")) as { source?: Fleet } | undefined)?.source;
	return s && typeof s.list === "function" ? s : undefined;
}

/** The agents the subagent tool resolves from `cwd` (embedded, plugin, user and project), same precedence. */
function resolvedAgentDefs(cwd: string): AgentDef[] {
	return discoverAgents(cwd, "both")
		.agents.map((a) => ({ name: a.name, description: a.description.slice(0, 90), model: a.model }))
		.sort((a, b) => a.name.localeCompare(b.name));
}

/** `defsDir` pins one directory (tests); by default the list follows the subagent registry. */
export function registerListing(nycode: ExtensionAPI, defsDir?: string): void {
	for (const n of ["list-agents", "peers"])
		nycode.registerCommand(n, {
			description: "Lista agentes definidos e subagentes em execução",
			handler: async (_a, ctx: Ctx) =>
				ctx.ui.notify(
					listAgentsText(defsDir ? readAgentDefs(defsDir) : resolvedAgentDefs(ctx.cwd), currentFleet()),
					"info",
				),
		});
	nycode.registerCommand("stop", {
		description: "Interrompe a execução atual do agente; `/stop agents` também cancela os subagentes desta sessão",
		handler: async (args, ctx) => {
			const a = args.trim();
			if (a && a !== "agents") return ctx.ui.notify("Uso: /stop | /stop agents", "error");
			const notes: string[] = [];
			if (!ctx.isIdle()) {
				ctx.abort();
				notes.push("execução atual interrompida");
			}
			if (a === "agents") {
				try {
					const r = stopAgents();
					notes.push(`subagentes cancelados: ${r.stopped}${r.refused ? ` (recusados: ${r.refused})` : ""}`);
				} catch (e) {
					notes.push(e instanceof Error ? e.message : String(e));
				}
			}
			ctx.ui.notify(notes.length ? notes.join("; ") : "Nada em execução.", "info");
		},
	});
}
