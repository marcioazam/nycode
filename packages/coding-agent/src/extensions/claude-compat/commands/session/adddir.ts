/**
 * /add-dir: diretórios de trabalho adicionais. Persistido na sessão (appendEntry) e anunciado ao modelo numa seção do prompt.
 * Não amplia permissões: as ferramentas e guardas do nycode não dependem do cwd.
 */
import { realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve, sep } from "node:path";
import type { ExtensionAPI, ExtensionCommandContext } from "../../../../core/extensions/types.ts";
import { agentDir } from "../settings/store.ts";

export const ENTRY = "claude-add-dir";
export const MAX_DIRS = 16;

/** Diretórios de segredos/credenciais nunca viram "diretório de trabalho". */
function blocked(real: string, home: string, agent: string): string | undefined {
	if (real === sep) return "a raiz do sistema é ampla demais";
	if (real === home) return "o diretório home inteiro é amplo demais";
	const bad = [
		join(home, ".ssh"),
		join(home, ".aws"),
		join(home, ".gnupg"),
		join(home, ".config", "gcloud"),
		join(home, ".kube"),
		agent,
	];
	const hit = bad.find((b) => real === b || real.startsWith(b + sep));
	return hit ? `${hit} guarda segredos/credenciais` : undefined;
}

export function validateDir(
	input: string,
	cwd: string,
	home = homedir(),
	agent = agentDir(),
): { ok: true; dir: string } | { ok: false; error: string } {
	if (!input) return { ok: false, error: "informe um diretório" };
	const p = input.startsWith("~") ? join(home, input.slice(1)) : isAbsolute(input) ? input : resolve(cwd, input);
	let real: string;
	try {
		real = realpathSync(p);
		if (!statSync(real).isDirectory()) return { ok: false, error: `${input} não é um diretório` };
	} catch {
		return { ok: false, error: `${input} não existe ou não é acessível` };
	}
	const why = blocked(real, realpathSyncSafe(home), realpathSyncSafe(agent));
	return why ? { ok: false, error: `recusado: ${why}` } : { ok: true, dir: real };
}
const realpathSyncSafe = (p: string) => {
	try {
		return realpathSync(p);
	} catch {
		return p;
	}
};

type Ctx = Pick<ExtensionCommandContext, "ui" | "cwd">;
type Api = Pick<ExtensionAPI, "appendEntry" | "on" | "registerCommand">;

export function registerAddDir(nycode: Api): void {
	let dirs: string[] = [];
	const save = () => nycode.appendEntry(ENTRY, { dirs });
	nycode.on("session_start", async (_e, ctx) => {
		dirs = [];
		for (const e of ctx.sessionManager.getEntries() as {
			type: string;
			customType?: string;
			data?: { dirs?: unknown };
		}[])
			if (e.type === "custom" && e.customType === ENTRY && Array.isArray(e.data?.dirs))
				dirs = e.data.dirs.filter((d): d is string => typeof d === "string");
	});
	nycode.on("before_agent_start", async (event) => {
		if (!dirs.length) return undefined;
		return {
			systemPrompt: `${event.systemPrompt}\n\n<additional-working-directories>\nO usuário adicionou estes diretórios de trabalho (além do cwd):\n${dirs.map((d) => `- ${d}`).join("\n")}\n</additional-working-directories>`,
		};
	});
	nycode.registerCommand("add-dir", {
		description: "Adiciona diretório de trabalho: <dir> | list | remove <dir>",
		handler: async (args, ctx: Ctx) => {
			const [sub, ...rest] = args.trim().split(/\s+/);
			if (!args.trim() || sub === "list")
				return ctx.ui.notify(
					dirs.length
						? `Diretórios adicionais:\n${dirs.map((d) => `  ${d}`).join("\n")}`
						: "Nenhum diretório adicional. Uso: /add-dir <dir>",
					"info",
				);
			const remove = sub === "remove";
			const arg = remove ? rest.join(" ") : args.trim();
			const v = validateDir(arg, ctx.cwd);
			if (remove) {
				const target = v.ok ? v.dir : arg;
				if (!dirs.includes(target)) return ctx.ui.notify(`"${arg}" não está na lista.`, "warning");
				dirs = dirs.filter((d) => d !== target);
				save();
				return ctx.ui.notify(`Removido: ${target}`, "info");
			}
			if (!v.ok) return ctx.ui.notify(`/add-dir: ${v.error}`, "error");
			if (dirs.includes(v.dir)) return ctx.ui.notify(`Já adicionado: ${v.dir}`, "info");
			if (dirs.length >= MAX_DIRS) return ctx.ui.notify(`Limite de ${MAX_DIRS} diretórios.`, "error");
			dirs = [...dirs, v.dir];
			save();
			ctx.ui.notify(`Adicionado: ${v.dir}`, "info");
		},
	});
}
