/**
 * Aliases de comandos do Claude Code reescritos no submit do editor (não há API pública para despachar um
 * comando nativo). Puro: o primeiro token tem de ser exatamente o alias; nada é substituído no meio do texto.
 */

export interface AliasRule {
	/** Comando do nycode (sem `/`) que o alias aciona. */
	target: string;
	/** `pass`: argumentos seguem ao destino; `none`: o destino não os aceita e o alias os recusa. */
	args: "pass" | "none";
	/** Aviso mostrado ao reescrever (diferença de semântica), se houver. */
	notice?: string;
	/** Aviso ao recusar por causa dos argumentos. */
	refuse?: string;
	/** Comando registrado (sem `/`) que recebe o alias quando HÁ argumentos; substitui `target`/recusa. */
	argsTarget?: string;
	/** Sem argumentos o comando nativo segue intacto (`pass`): usado quando só a forma com argumentos é do alias. */
	passBare?: boolean;
}

export const ALIASES: Readonly<Record<string, AliasRule>> = {
	config: { target: "settings", args: "none", argsTarget: "config-set" },
	continue: {
		target: "resume",
		args: "none",
		refuse: "/continue <sessão> não existe; /resume abre o seletor de sessões.",
	},
	exit: { target: "quit", args: "none", refuse: "/exit não aceita argumentos." },
	branch: { target: "clone", args: "none", argsTarget: "clone-as" },
	checkpoint: { target: "rewind", args: "none", refuse: "/checkpoint não aceita argumentos; /rewind abre o seletor." },
	undo: { target: "rewind", args: "none", refuse: "/undo não aceita argumentos; /rewind abre o seletor." },
	bashes: { target: "tasks", args: "none", refuse: "/bashes não aceita argumentos; /tasks lista as tarefas." },
	cost: {
		target: "session",
		args: "none",
		notice: "/cost → /session (tokens e custo da sessão; não há limites de plano).",
		refuse: "/cost não aceita argumentos.",
	},
	usage: {
		target: "session",
		args: "none",
		notice: "/usage → /session (uso da sessão; limites de plano do Claude não existem no nycode).",
		refuse: "/usage não aceita argumentos.",
	},
	stats: {
		target: "session",
		args: "none",
		notice: "/stats → /session (estatísticas só da sessão atual; sem histórico de dias).",
		refuse: "/stats não aceita argumentos.",
	},
	status: {
		target: "session",
		args: "none",
		notice: "/status → /session (arquivo, modelo e uso; sem conta/conectividade do Claude).",
		refuse: "/status não aceita argumentos.",
	},
	"release-notes": {
		target: "changelog",
		args: "none",
		notice: "/release-notes → /changelog (changelog do nycode, não do Claude Code).",
		refuse: "/release-notes não aceita argumentos.",
	},
	"reload-skills": {
		target: "reload",
		args: "none",
		notice: "/reload recarrega TODOS os recursos (extensões, skills, templates, temas, contexto), não só skills.",
		refuse: "/reload-skills não aceita argumentos.",
	},
	"reload-plugins": {
		target: "reload",
		args: "none",
		notice: "/reload recarrega TODOS os recursos (extensões, skills, templates, temas, contexto), não só plugins.",
		refuse: "/reload-plugins não aceita argumentos.",
	},
	theme: {
		target: "settings",
		args: "none",
		notice: "/theme → /settings (sem argumentos); /theme <nome> troca e grava o tema.",
		argsTarget: "theme-set",
	},
	tui: {
		target: "settings",
		args: "none",
		notice: "/tui → /settings (sem argumentos); /tui regular|fullscreen grava o modo.",
		argsTarget: "tui-set",
	},
	copy: { target: "copy-pick", args: "pass", passBare: true },
};

export type Resolved =
	| { kind: "pass" }
	| { kind: "rewrite"; text: string; notice?: string }
	| { kind: "refuse"; notice: string };

const SLASH = /^\/([^\s/]+)(?:\s+([\s\S]*))?$/;

/** `has(nome)`: já existe comando registrado (extensão, template, skill) com esse nome: nesse caso não se reescreve. */
export function resolveAlias(text: string, has: (name: string) => boolean = () => false): Resolved {
	const m = SLASH.exec(text.trim());
	if (!m) return { kind: "pass" };
	const name = m[1]!;
	const rule = Object.hasOwn(ALIASES, name) ? ALIASES[name]! : undefined;
	if (!rule || has(name)) return { kind: "pass" };
	const args = (m[2] ?? "").trim();
	if (!args && rule.passBare) return { kind: "pass" };
	if (args && rule.argsTarget) return { kind: "rewrite", text: `/${rule.argsTarget} ${args}`, notice: undefined };
	if (args && rule.args === "none")
		return { kind: "refuse", notice: rule.refuse ?? `/${name} não aceita argumentos.` };
	return { kind: "rewrite", text: args ? `/${rule.target} ${args}` : `/${rule.target}`, notice: rule.notice };
}
