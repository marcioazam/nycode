/** Terminais com configuração própria para Shift+Enter: detecção por ambiente, caminhos documentados e análise do arquivo. */
import { dirname, join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { parseJsonc } from "./jsonc.ts";
import { assertOnlyAppended, pythonToml, type TomlParse } from "./toml.ts";

/** `ESC [ 13 ; 2 u` = Shift+Enter em CSI u; o @nycode/tui aceita sempre (keys.js: matchesKittySequence com shift). */
export const SEQ = "\u001b[13;2u";

export type TargetId = "vscode" | "cursor" | "zed" | "alacritty";
export interface Target {
	id: TargetId;
	label: string;
	file: string;
	format: "jsonc" | "toml";
}
export type Detection =
	| { kind: "native"; terminal: string }
	| { kind: "unavailable"; reason: string }
	| { kind: "candidates"; targets: Target[] };
export interface DetectDeps {
	env: Record<string, string | undefined>;
	platform: string;
	home: string;
	exists: (p: string) => boolean;
}

const LABEL: Record<TargetId, string> = { vscode: "VS Code", cursor: "Cursor", zed: "Zed", alacritty: "Alacritty" };

/** Caminhos públicos e documentados; fora de linux/darwin não há caminho verificado (nada inventado). */
function targetFor(id: TargetId, d: DetectDeps): Target | undefined {
	if (d.platform !== "linux" && d.platform !== "darwin") return undefined;
	const xdg = d.env.XDG_CONFIG_HOME || join(d.home, ".config");
	const editors = d.platform === "darwin" ? join(d.home, "Library", "Application Support") : xdg;
	const file = {
		vscode: join(editors, "Code", "User", "keybindings.json"),
		cursor: join(editors, "Cursor", "User", "keybindings.json"),
		zed: join(d.home, ".config", "zed", "keymap.json"),
		alacritty: join(xdg, "alacritty", "alacritty.toml"),
	}[id];
	return { id, label: LABEL[id], file, format: id === "alacritty" ? "toml" : "jsonc" };
}

const native = (terminal: string): Detection => ({ kind: "native", terminal });
const unavailable = (reason: string): Detection => ({ kind: "unavailable", reason });

export function detect(d: DetectDeps): Detection {
	const e = d.env;
	if (e.TMUX || e.STY)
		return unavailable(
			"dentro de tmux/screen: execute /terminal-setup no terminal hospedeiro (o tmux ainda exige extended-keys no ~/.tmux.conf; nada foi alterado).",
		);
	const one = (id: TargetId): Detection => {
		const t = targetFor(id, d);
		if (!t)
			return unavailable(
				`plataforma "${d.platform}" sem caminho de configuração verificado para ${LABEL[id]}; nada foi alterado.`,
			);
		if (!d.exists(dirname(t.file)))
			return unavailable(
				`${LABEL[id]}: diretório de configuração ${dirname(t.file)} não existe; abra o programa uma vez ou crie o arquivo à mão.`,
			);
		return { kind: "candidates", targets: [t] };
	};
	if (e.TERM_PROGRAM === "vscode") {
		const hint = [
			e.VSCODE_GIT_ASKPASS_MAIN,
			e.VSCODE_GIT_ASKPASS_NODE,
			e.VSCODE_IPC_HOOK_CLI,
			e.CURSOR_TRACE_ID,
		].some((v) => v && /cursor/i.test(v));
		if (hint) return one("cursor");
		const found = (["vscode", "cursor"] as const)
			.map((id) => targetFor(id, d))
			.filter((t): t is Target => !!t && d.exists(dirname(t.file)));
		if (found.length) return { kind: "candidates", targets: found };
		return one("vscode");
	}
	if (e.TERM_PROGRAM === "zed" || e.ZED_TERM) return one("zed");
	if (e.TERM?.startsWith("alacritty") || e.ALACRITTY_WINDOW_ID || e.ALACRITTY_SOCKET) return one("alacritty");
	if (e.GHOSTTY_RESOURCES_DIR || e.TERM_PROGRAM === "ghostty") return native("Ghostty");
	if (e.KITTY_WINDOW_ID || e.TERM === "xterm-kitty") return native("Kitty");
	if (e.TERM_PROGRAM === "iTerm.app") return native("iTerm2");
	if (e.TERM_PROGRAM === "WezTerm" || e.WEZTERM_EXECUTABLE) return native("WezTerm");
	if (e.TERM_PROGRAM === "WarpTerminal") return native("Warp");
	if (e.WT_SESSION) return native("Windows Terminal");
	if (e.TERMINAL_EMULATOR === "JetBrains-JediTerm")
		return unavailable("terminal dos JetBrains não suporta Shift+Enter; use Ctrl+J ou barra invertida + Enter.");
	if (e.VTE_VERSION)
		return unavailable("gnome-terminal (VTE) não suporta Shift+Enter; use Ctrl+J ou barra invertida + Enter.");
	if (e.TERM_PROGRAM === "Apple_Terminal")
		return unavailable(
			'Apple Terminal: ative "Use Option as Meta key" nas preferências do Terminal (este comando não altera preferências do sistema).',
		);
	return unavailable("terminal não reconhecido; use Ctrl+J ou barra invertida + Enter.");
}

export function entryFor(id: TargetId): { json: string; toml?: string } {
	if (id === "vscode" || id === "cursor") {
		return {
			json: JSON.stringify(
				{
					key: "shift+enter",
					command: "workbench.action.terminal.sendSequence",
					args: { text: SEQ },
					when: "terminalFocus",
				},
				null,
				2,
			),
		};
	}
	if (id === "zed")
		return {
			json: JSON.stringify(
				{ context: "Terminal", bindings: { "shift-enter": ["terminal::SendText", SEQ] } },
				null,
				2,
			),
		};
	return { json: "", toml: '[[keyboard.bindings]]\nkey = "Return"\nmods = "Shift"\nchars = "\\u001b[13;2u"' };
}

export type Analysis =
	| { state: "free" | "present" }
	| { state: "collision"; existing: string }
	| { state: "unsupported"; reason: string };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

export function analyze(id: TargetId, text: string, toml: TomlParse = pythonToml): Analysis {
	if (id === "alacritty") return analyzeToml(text, toml);
	let doc: unknown;
	try {
		doc = text.trim() ? parseJsonc(text) : [];
	} catch (e) {
		return { state: "unsupported", reason: `JSON inválido: ${e instanceof Error ? e.message : e}` };
	}
	if (!Array.isArray(doc)) return { state: "unsupported", reason: "o arquivo não é um array JSON" };
	let collision: string | undefined;
	for (const el of doc) {
		if (!isObj(el)) continue;
		if (id === "zed") {
			if (typeof el.context !== "string" || !/terminal/i.test(el.context) || !isObj(el.bindings)) continue;
			const k = Object.keys(el.bindings).find((x) => x.toLowerCase() === "shift-enter");
			if (!k) continue;
			const v = el.bindings[k];
			if (Array.isArray(v) && v[0] === "terminal::SendText" && v[1] === SEQ) return { state: "present" };
			collision = JSON.stringify(v);
		} else {
			if (typeof el.key !== "string" || el.key.toLowerCase().replace(/\s/g, "") !== "shift+enter") continue;
			if (typeof el.command === "string" && el.command.startsWith("-")) continue;
			if (typeof el.when === "string" && !/terminalFocus/.test(el.when)) continue;
			if (el.command === "workbench.action.terminal.sendSequence" && isObj(el.args) && el.args.text === SEQ)
				return { state: "present" };
			collision = String(el.command ?? "sem comando");
		}
	}
	return collision === undefined ? { state: "free" } : { state: "collision", existing: collision };
}

/** Texto TOML + bloco `[[keyboard.bindings]]` no fim (separador por linha em branco). */
export function appendToml(old: string): { text: string; block: string } {
	const block = entryFor("alacritty").toml!;
	const sep = old && !old.endsWith("\n") ? "\n\n" : old ? "\n" : "";
	return { text: `${old}${sep}${block}\n`, block };
}

export const ALACRITTY_ENTRY = { key: "Return", mods: "Shift", chars: SEQ };

/**
 * Parse real (tomllib). Qualquer outra vinculação de Shift+Return é recusada: a doc oficial do Alacritty diz que várias
 * vinculações disparam "na ordem em que foram definidas" e não declara que a última substitui a anterior.
 */
function analyzeToml(text: string, toml: TomlParse): Analysis {
	const bad = (reason: string): Analysis => ({ state: "unsupported", reason });
	let doc: unknown;
	try {
		doc = toml(text);
	} catch (e) {
		return bad(e instanceof Error ? e.message : String(e));
	}
	const kb = isObj(doc) && isObj(doc.keyboard) ? doc.keyboard.bindings : undefined;
	for (const b of Array.isArray(kb) ? kb : []) {
		if (!isObj(b) || typeof b.key !== "string" || !/^(return|enter)$/i.test(b.key)) continue;
		const mods = typeof b.mods === "string" ? b.mods.split("|").map((m) => m.trim().toLowerCase()) : [];
		if (!mods.includes("shift")) continue;
		if (isDeepStrictEqual({ key: b.key, mods: b.mods, chars: b.chars }, ALACRITTY_ENTRY) && b.mode === undefined)
			return { state: "present" };
		return bad(
			`Shift+Return já está vinculado (${JSON.stringify(b)}); a precedência entre vinculações do Alacritty não é documentada, edite à mão`,
		);
	}
	try {
		assertOnlyAppended(doc, toml(appendToml(text).text), ALACRITTY_ENTRY);
	} catch (e) {
		return bad(`não consigo acrescentar com segurança (${e instanceof Error ? e.message : e}); edite à mão`);
	}
	return { state: "free" };
}
