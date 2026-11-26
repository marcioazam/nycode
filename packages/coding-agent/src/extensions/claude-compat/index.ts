/**
 * Compatibilidade com o Claude Code: /clear e /reset (sessão nova como /new) e /compat.
 * Aliases por reescrita (/config, /continue…) vivem no editor (extensions/ui/editor.ts) via aliases.ts.
 */

import type { ExtensionAPI, ExtensionCommandContext } from "../../core/extensions/types.ts";
import { ALIASES } from "./aliases.ts";
import registerLocalCommands from "./commands/index.ts";
import registerDirectory from "./directory/index.ts";
import registerInterfaceCommands from "./interface/index.ts";
import registerLifecycle from "./lifecycle/index.ts";
import { COMMANDS } from "./matrix.ts";
import { CLAUDE_KEYBINDINGS } from "./shortcuts.ts";

type Names = Pick<ExtensionAPI, "getSessionName" | "setSessionName">;

/**
 * Inicia sessão nova sem turno de modelo. Com `nome`, rotula a sessão ANTERIOR antes de trocar (como o /clear
 * do Claude); se um hook cancelar a troca, o nome anterior volta. Não toca em `ctx` depois do sucesso (ele fica obsoleto).
 */
export async function clearSession(
	nycode: Names,
	args: string,
	ctx: ExtensionCommandContext,
): Promise<"cleared" | "cancelled" | "busy" | "failed"> {
	if (!ctx.isIdle()) {
		ctx.ui.notify("Agente ocupado: interrompa (Esc) antes de usar /clear.", "warning");
		return "busy";
	}
	const name = args.trim();
	const previous = nycode.getSessionName();
	const restore = () => {
		if (name) nycode.setSessionName(previous ?? "");
	};
	if (name) nycode.setSessionName(name);
	try {
		const { cancelled } = await ctx.newSession();
		if (!cancelled) return "cleared";
		restore();
		ctx.ui.notify("/clear cancelado; a sessão atual foi mantida.", "info");
		return "cancelled";
	} catch (e) {
		restore();
		ctx.ui.notify(`/clear falhou: ${e instanceof Error ? e.message : String(e)}`, "error");
		return "failed";
	}
}

export function helpText(): string {
	const aliases = Object.entries(ALIASES)
		.map(([a, r]) => `/${a} → /${r.target}`)
		.join("  ");
	const keys = Object.entries(CLAUDE_KEYBINDINGS)
		.map(([id, k]) => `${[k].flat().join(" | ")} = ${id}`)
		.join("\n  ");
	const n = (s: string) => COMMANDS.filter((c) => c.status === s).length;
	return [
		"Compatibilidade Claude Code → nycode",
		`/clear, /reset [nome]: sessão nova sem turno de modelo (= /new). Aliases (só no editor TUI): ${aliases}`,
		"ATENÇÃO: /fork do nycode ≠ /fork do Claude (cópia em background); /share, /bug e /import do nycode mantêm a semântica do nycode.",
		`Atalhos em keybindings.json:\n  ${keys}`,
		"No editor: Ctrl+L redesenha, Ctrl+T alterna tarefas, Ctrl+P/N = ↑/↓, Ctrl+C interrompe; Shift+Tab alterna manual/plan (não todos os modos do Claude); barra invertida + Enter insere nova linha.",
		"Ctrl+X Ctrl+E: editor externo; Ctrl+X Enter: follow-up; Ctrl+X Ctrl+B: background de subagentes; Ctrl+X Ctrl+K duas vezes em 3 s: cancelar subagentes da sessão.",
		"? abre o painel de atalhos e /atalhos lista, busca e muda todos (o /hotkeys nativo não lista estes extras).",
		`Matriz completa: docs/claude-code-compat.md (${COMMANDS.length} comandos: ${n("exact")} exact, ${n("alias")} alias, ${n("partial")} partial, ${n("unsupported")} unsupported, ${n("removed")} removed).`,
	].join("\n");
}

type Lister = Pick<ExtensionAPI, "getCommands">;

/** /help: ajuda de compatibilidade + comandos carregados (extensões, templates, skills) + onde estão os nativos. */
export function helpAll(nycode: Lister): string {
	const loaded = nycode
		.getCommands()
		.filter((c) => c.source !== "skill")
		.map((c) => `/${c.name}`)
		.sort();
	return [
		helpText(),
		`Comandos carregados (extensões e templates): ${loaded.join(" ") || "nenhum"}`,
		"Comandos nativos do nycode: digite / para o menu; ? abre o painel de atalhos e /atalhos mostra todos (/hotkeys é o nativo); /skills lista as skills.",
	].join("\n\n");
}

export function skillsText(nycode: Lister): string {
	const skills = nycode
		.getCommands()
		.filter((c) => c.source === "skill")
		.sort((a, b) => a.name.localeCompare(b.name));
	if (!skills.length) return "Nenhuma skill carregada.";
	return (
		`Skills carregadas (${skills.length}); use /skill:<nome>:\n` +
		skills.map((c) => `  /${c.name}${c.description ? ` — ${c.description.slice(0, 100)}` : ""}`).join("\n")
	);
}

export default function (nycode: ExtensionAPI) {
	registerLocalCommands(nycode);
	registerLifecycle(nycode);
	registerInterfaceCommands(nycode);
	registerDirectory(nycode);
	for (const name of ["clear", "reset"]) {
		nycode.registerCommand(name, {
			description: "Inicia uma sessão nova como /new, sem turno de modelo [nome da sessão anterior]",
			handler: async (args, ctx) => void (await clearSession(nycode, args, ctx)),
		});
	}
	nycode.registerCommand("help", {
		description: "Ajuda: compatibilidade com o Claude Code, comandos carregados e onde ficam os nativos",
		handler: async (_args, ctx) => ctx.ui.notify(helpAll(nycode), "info"),
	});
	nycode.registerCommand("skills", {
		description: "Lista as skills carregadas",
		handler: async (_args, ctx) => ctx.ui.notify(skillsText(nycode), "info"),
	});
	nycode.registerCommand("compat", {
		description: "Mapeamento de comandos e atalhos do Claude Code e seus limites",
		handler: async (_args, ctx) => ctx.ui.notify(helpText(), "info"),
	});
}
