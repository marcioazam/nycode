/**
 * Editor do nycode: /rename e nome da sessão na borda (antes em rename.ts), `?` com editor vazio abre o painel de atalhos (extensão comandos; sem ela, /hotkeys)
 * Ctrl+R histórico de prompts, Ctrl+S rascunho guardado, Ctrl+C com texto o põe no histórico (↑),
 * estado do composer na ponta direita das réguas (rascunho em cima; shell, NORMAL e avisos embaixo),
 * e /vim alterna edição modal (normal/insert/visual, claude-compat/vim), persistida em terminal.uiState (padrão <agentDir>/ui-state.json).
 * Compatibilidade Claude Code: aliases de comando no submit (claude-compat/aliases.ts), Ctrl+L redesenha,
 * Ctrl+T alterna a lista de tarefas (ctrl+shift+t do nycode), Ctrl+C interrompe o agente ocupado.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { AutocompleteProvider, EditorTheme, TUI } from "@nycode/tui";
import { decodeKittyPrintable, matchesKey, truncateToWidth, visibleWidth } from "@nycode/tui";
import { getAgentDir } from "../../config.ts";
import type { ExtensionAPI, ExtensionContext } from "../../core/extensions/types.ts";
import type { KeybindingsManager } from "../../core/keybindings.ts";
import { resolveNycodeSettings } from "../../core/settings-nycode.ts";
import { CustomEditor } from "../../modes/interactive/components/custom-editor.ts";
import { resolveAlias } from "../claude-compat/aliases.ts";
import { detachAgents, stopAgents } from "../claude-compat/fleet.ts";
import { cyclePermissionMode } from "../claude-compat/permissions/slot.ts";
import { VimEngine, type VimMode } from "../claude-compat/vim/engine.ts";
import { type EditorAction, EditorHost } from "../claude-compat/vim/host.ts";
import { highlight } from "../claude-compat/vim/render.ts";
import { anima, assinarQuadro, highlightPeak, lerpRgb, type Rgb3, safeAnsi } from "../ui-visual/motion/motion.ts";
import { loadScope, PromptHistory, stashStep } from "./history.ts";

export const STATE_PATH = join(getAgentDir(), "ui-state.json");

/** Lê o estado; arquivo ausente, corrompido ou que não seja objeto → {}. */
export function readState(path = STATE_PATH): Record<string, unknown> {
	try {
		const v: unknown = JSON.parse(readFileSync(path, "utf8"));
		return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}

/** Mescla `patch` no estado preservando as outras chaves. */
export function mergeState(patch: Record<string, unknown>, path = STATE_PATH): void {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, `${JSON.stringify({ ...readState(path), ...patch }, null, 2)}\n`);
}

/** Placeholder do editor vazio (Onda 10, P18): as três portas, em dim; é desenho, então some na primeira tecla. */
export const PLACEHOLDER = "Pergunte, ou / comandos · @ arquivos · ! shell";
/** Escreve o placeholder no espaço em branco depois do cursor, sem mudar a largura da linha; `reserva` colunas ficam vazias no fim. */
export function comPlaceholder(row: string, dim: (s: string) => string, reserva = 0): string {
	const m = / +((?:\x1b\[[0-9;]*m)*)$/.exec(row);
	const room = m ? m[0].length - m[1]!.length : 0;
	if (!m || room < 6) return row;
	const t = truncateToWidth(PLACEHOLDER, room - 1 - reserva, "…");
	return `${row.slice(0, m.index)} ${dim(t)}${" ".repeat(Math.max(0, room - 1 - visibleWidth(t)))}${m[1]}`;
}

/** Rótulo do nome na borda e a largura que sobra para a borda nativa; undefined quando não cabe. */
export function nameLabel(name: string | undefined, width: number): { label: string; rest: number } | undefined {
	if (!name) return undefined;
	const label = ` ${truncateToWidth(name, Math.max(0, Math.floor(width / 2) - 2), "…")} `;
	const rest = width - visibleWidth(label) - 3;
	return label.trim() && rest >= 12 ? { label, rest } : undefined;
}

export type Mode = VimMode;

/** Estado compartilhado do /vim: `remaps` = pares de teclas (ex.: "jj") que saem do INSERT (vimInsertModeRemaps). */
export interface VimState {
	enabled: boolean;
	remaps?: readonly string[];
}

/** Ações semânticas do patch editor-actions (métodos públicos do Editor patchado; ausentes no nycode sem o patch). */
interface EditorActions {
	runEditorAction(action: EditorAction): void;
	withUndoGroup<T>(edit: () => T): T;
}

/** Valida vimInsertModeRemaps: par de duas teclas imprimíveis → exatamente "<Esc>"; o resto é ignorado. */
export function parseRemaps(v: unknown): string[] {
	if (!v || typeof v !== "object" || Array.isArray(v)) return [];
	return Object.entries(v)
		.filter(([k, target]) => target === "<Esc>" && [...k].length === 2 && !/[\x00-\x1f\x7f\s]/.test(k))
		.map(([k]) => k);
}

const settingsPath = () => join(getAgentDir(), "settings.json");

/** Remaps do settings.json do nycode (vence, mesmo vazio); sem a chave, cai no ui-state.json (legado explícito). */
const envStatePath = () => process.env.NYCODE_UI_STATE || STATE_PATH;

export function loadRemaps(settings = settingsPath(), ui = envStatePath()): string[] {
	const s = readState(settings);
	return "vimInsertModeRemaps" in s
		? parseRemaps(s.vimInsertModeRemaps)
		: parseRemaps(readState(ui).vimInsertModeRemaps);
}

/** Estilo e estado da sessão que o editor não enxerga sozinho; ausentes nos testes. */
export interface EditorUi {
	dim?: (s: string) => string;
	accent?: (s: string) => string;
	cyan?: (s: string) => string;
	busy?: () => boolean;
	/** RGB truecolor do texto e da régua ativa para animações monocromáticas 120Hz (sem alterar a paleta). */
	textRgb?: () => [number, number, number] | undefined;
	borderRgb?: (focusedCyan: boolean) => [number, number, number] | undefined;
	warnRgb?: () => [number, number, number] | undefined;
}

const travado = (): boolean => (globalThis as Record<symbol, unknown>)[Symbol.for("nycode-harness:travado")] === true;
export const RESPIRO_MS = 700; // período/2π da respiração da cápsula enquanto o agente trabalha

/**
 * Brilho que corre pela régua: cada `─` perto do centro (progress * width) ganha uma cor entre `base` e `peak`. Copia
 * os trechos sem brilho por slice: concatenar char a char alocava ~46 MiB em 28 s de turnos (perf 2026-11-24).
 */
export function sweepRow(row: string, width: number, progress: number, base: Rgb3, peak: Rgb3): string {
	const center = progress * width;
	const back = `\x1b[38;2;${base[0]};${base[1]};${base[2]}m`;
	let col = 0;
	let inEsc = false;
	let out = "";
	let from = 0;
	for (let i = 0; i < row.length; i++) {
		const ch = row[i]!;
		if (ch === "\x1b") {
			inEsc = true;
			continue;
		}
		if (inEsc) {
			if ((ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z") || ch === "\x07") inEsc = false;
			continue;
		}
		if (ch === "─") {
			const d = Math.abs(col - center);
			const w = Math.exp(-(d * d) / 90) * (1 - progress * 0.35);
			if (w > 0.04) {
				const [r, g, b] = lerpRgb(base, peak, w * 0.85);
				out += `${row.slice(from, i)}\x1b[38;2;${r};${g};${b}m─${back}`;
				from = i + 1;
			}
		}
		col++;
	}
	return from === 0 ? row : out + row.slice(from);
}

/** Troca o 1º e o último `─` visíveis (se forem as pontas) pelos cantos da cápsula. */
export function cantos(row: string, ini: string, fim: string): string {
	const a = /^((?:\x1b\[[0-9;]*m)*)─/.exec(row);
	if (a) row = a[1] + ini + row.slice(a[0].length);
	const b = /─((?:\x1b\[[0-9;]*m)*)$/.exec(row);
	return b ? row.slice(0, b.index) + fim + b[1] : row;
}
/** Lados da cápsula numa linha de conteúdo: o 1º espaço e o último espaço visível viram `│`. */
export function lados(row: string, lado: string): string {
	const b = / ((?:\x1b\[[0-9;]*m)*)$/.exec(row);
	if (!row.startsWith(" ") || !b) return row;
	return lado + row.slice(1, b.index) + lado + b[1];
}

/** Uma tab da barra de grupos do nycode está focada (section-nav/nav.ts, instância no slot global): o foco saiu do composer. */
const tabFocused = (): boolean => {
	const nav = (globalThis as Record<symbol, any>)[Symbol.for("nycode.group-nav")];
	return nav?.title !== undefined && nav.isTitle?.(nav.title) === true;
};

/** Rótulo de modo shell pelo texto (como o nycode decide o modo): `!` roda no contexto, `!!` fora dele. */
export function shellLabel(text: string): string | undefined {
	const t = text.trimStart();
	return t.startsWith("!!") ? "shell · fora do contexto" : t.startsWith("!") ? "shell" : undefined;
}

/** Ganchos do editor com o resto do nycode (opcionais; ausentes = comportamento nativo). */
export interface Compat {
	abort?: () => void;
	notify?: (message: string, level: "info" | "warning") => void;
	hasCommand?: (name: string) => boolean;
	/** Abre o painel de atalhos; `insert` devolve ao editor o caractere que o fechou. false = indisponível (cai no /hotkeys). */
	openShortcuts?: (insert: (s: string) => void) => boolean;
}

// ctrl+shift+t em CSI-u: o editor o entrega ao atalho de extensão do nycode (alterna a lista de tarefas).
export const CTRL_SHIFT_T = "\x1b[116;6u";

const MODE_LABEL: Record<VimMode, string> = {
	insert: "INSERT",
	normal: "NORMAL",
	visual: "VISUAL",
	visualLine: "VISUAL LINE",
};

export class UiEditor extends CustomEditor {
	readonly engine: VimEngine;
	compat: Compat = {};
	private submitRaw: ((text: string) => void | Promise<void>) | undefined;
	private killUntil = 0;
	private readonly tuiRef: TUI;
	private readonly kbm: { matches(data: string, id: string): boolean };
	stash: string | undefined;
	cleared = false; // Ctrl+C acabou de apagar texto; some na próxima tecla
	openHistory: (() => void) | undefined;
	private readonly ui: EditorUi;
	private readonly vim: VimState;
	private remapSrc: readonly string[] | undefined;
	private apiWarned = false;
	private selHidden = false;
	private readonly sessionName: () => string | undefined;
	private unsubAnim: (() => void) | undefined;
	private sweepStart = 0;
	private sweepUntil = 0;

	constructor(
		tui: TUI,
		theme: EditorTheme,
		kb: KeybindingsManager,
		vim: VimState,
		sessionName: () => string | undefined,
		ui: EditorUi = {},
	) {
		super(tui, theme, kb, { embedWorkingStatus: true });
		this.tuiRef = tui;
		this.kbm = kb;
		// O modo interativo atribui onSubmit depois do factory: o acessor na instância captura a atribuição e roteia aliases.
		Object.defineProperty(this, "onSubmit", {
			configurable: true,
			enumerable: true,
			get: () => (this.submitRaw ? this.routeSubmit : undefined),
			set: (fn: ((text: string) => void | Promise<void>) | undefined) => {
				this.submitRaw = fn;
			},
		});
		this.ui = ui;
		this.vim = vim;
		// Régua (barra de envio) no ciano do sistema só com o foco no composer (dono, 2026-11-15): com uma tab da barra de
		// grupos focada o ciano vai para ela; o modo shell mantém a cor que o nycode atribui.
		let piBorder = this.borderColor;
		Object.defineProperty(this, "borderColor", {
			configurable: true,
			enumerable: true,
			get: () => (s: string) => {
				const r = this.frame ? this.frame.respiro : this.respiro();
				if (r) return `\x1b[38;2;${r[0]};${r[1]};${r[2]}m${s}\x1b[39m`;
				return ui.cyan && this.focused && !tabFocused() && !this.shell() ? ui.cyan(s) : piBorder(s);
			},
			set: (fn: (s: string) => string) => {
				piBorder = fn;
			},
		});
		// O motor edita só pela API pública do editor; as setas/delete nativos vão por super (sem passar pelo Vim).
		const actions = this as unknown as Partial<EditorActions>;
		this.engine = new VimEngine(
			new EditorHost(
				{
					getText: () => this.getText(),
					getExpandedText: () => this.getExpandedText(),
					getCursor: () => this.getCursor(),
					setText: (t) => this.setText(t),
					insertTextAtCursor: (t) => this.insertTextAtCursor(t),
					key: (k) => super.handleInput(k),
					get runEditorAction() {
						return actions.runEditorAction?.bind(actions);
					},
					get withUndoGroup() {
						return actions.withUndoGroup?.bind(actions);
					},
				},
				() => this.openHistory?.(),
				(m) => this.compat.notify?.(m, "warning"),
			),
		);
		this.sessionName = sessionName;
	}

	get mode(): Mode {
		return this.engine.mode;
	}
	set mode(m: Mode) {
		this.engine.mode = m;
	}

	/**
	 * O Enter com o menu aberto aceita a sugestão ANTES de routeSubmit: `/config` viraria a sugestão fuzzy `claude-config`.
	 * Um alias exato e válido entra como primeira sugestão (só quando o menu não tem o nome exato), e o roteamento o resolve.
	 */
	override setAutocompleteProvider(provider: AutocompleteProvider): void {
		super.setAutocompleteProvider({
			...provider,
			triggerCharacters: provider.triggerCharacters,
			shouldTriggerFileCompletion: provider.shouldTriggerFileCompletion?.bind(provider),
			applyCompletion: provider.applyCompletion.bind(provider),
			getSuggestions: async (lines, line, col, options) => {
				const found = await provider.getSuggestions(lines, line, col, options);
				const name = /^\s*\/([^\s/]+)$/.exec((lines[line] ?? "").slice(0, col))?.[1];
				if (options.force || !name || found?.items.some((i) => i.value === name)) return found;
				const r = resolveAlias(`/${name}`, (n) => this.compat.hasCommand?.(n) ?? false);
				if (r.kind !== "rewrite") return found;
				const item = { value: name, label: name, description: `alias de ${r.text}` };
				return { items: [item, ...(found?.items ?? [])], prefix: found?.prefix ?? `/${name}` };
			},
		});
	}

	private readonly routeSubmit = (text: string): void | Promise<void> => {
		this.triggerRuleSweep();
		const r = resolveAlias(text, (n) => this.compat.hasCommand?.(n) ?? false);
		if (r.kind === "refuse") {
			this.compat.notify?.(r.notice, "warning");
			this.setText(text); // o submit já limpou o editor: devolve o texto, nada roda
			return;
		}
		if (r.kind !== "rewrite") return this.submitRaw?.(text);
		if (r.notice) this.compat.notify?.(r.notice, "info");
		// Comandos nativos (/settings…) retornam antes de o app gravar o histórico: o alias é lembrado pela grafia original,
		// por último e só depois de o handler concluir sem erro (rejeição segue ao chamador, como antes).
		const remember = () => this.addToHistory(text.trim());
		const done = this.submitRaw?.(r.text);
		if (done && typeof (done as Promise<void>).then === "function") return (done as Promise<void>).then(remember);
		remember();
	};

	/** Chamado pelo único proprietário do prefixo Ctrl+X (send-now-runtime), antes de copiar ou tratar a segunda tecla. */
	handleClaudeChord(data: string, now = Date.now()): boolean {
		if (matchesKey(data, "ctrl+e")) {
			super.handleInput("\x07"); // editor externo nativo (Ctrl+G)
			return true;
		}
		if (matchesKey(data, "enter")) {
			super.handleInput("\x11"); // follow-up nativo (Ctrl+Q), sem interromper a tarefa
			return true;
		}
		if (matchesKey(data, "ctrl+k")) {
			if (this.killUntil === 0 || now > this.killUntil) {
				this.killUntil = now + 3000;
				this.compat.notify?.("Repita Ctrl+X Ctrl+K em até 3 s para parar os subagentes desta sessão.", "warning");
				return true;
			}
			this.killUntil = 0;
			try {
				const result = stopAgents();
				this.compat.notify?.(
					`Subagentes: ${result.stopped} cancelamento(s) solicitado(s), ${result.refused} recusado(s).`,
					result.refused ? "warning" : "info",
				);
			} catch (e) {
				this.compat.notify?.(`Cancelamento falhou: ${e instanceof Error ? e.message : String(e)}`, "warning");
			}
			return true;
		}
		if (matchesKey(data, "ctrl+b")) {
			try {
				const n = detachAgents();
				this.compat.notify?.(`${n} chamada(s) de subagente movida(s) para background.`, "info");
			} catch (e) {
				this.compat.notify?.(`Background falhou: ${e instanceof Error ? e.message : String(e)}`, "warning");
			}
			return true;
		}
		return false;
	}

	handleInput(data: string): void {
		if (!this.vim.enabled && this.engine.mode !== "insert") this.engine.reset();
		// O controlador de modos (permissions/slot.ts) é dono do ciclo e notifica pela UI; só `undefined` (sem controlador)
		// cai no fallback manual/plan do nycode. O rascunho do editor nunca é tocado aqui.
		if (matchesKey(data, "shift+tab") && !this.kbm.matches(data, "app.thinking.cycle")) {
			if (cyclePermissionMode() !== undefined) return;
			if (!this.compat.hasCommand?.("plan")) {
				this.compat.notify?.("Plan mode não está carregado nesta sessão.", "warning");
				return;
			}
			super.handleInput("\x1b[112;6u"); // Ctrl+Shift+P: toggle protegido do nycode
			return;
		}
		if (this.mode === "insert" && matchesKey(data, "enter")) {
			const { line, col } = this.getCursor();
			if (this.getLines()[line]?.slice(0, col).endsWith("\\")) {
				super.handleInput("\x7f");
				this.insertTextAtCursor("\n");
				return;
			}
		}
		// Ctrl+L: redesenha (só quando o nycode não o usa como seletor de modelo); Ctrl+T: lista de tarefas (idem para o raciocínio).
		if (matchesKey(data, "ctrl+l") && !this.kbm.matches(data, "app.model.select")) {
			this.tuiRef.requestRender(true);
			return;
		}
		if (matchesKey(data, "ctrl+t") && !this.kbm.matches(data, "app.thinking.toggle")) {
			super.handleInput(CTRL_SHIFT_T);
			return;
		}
		if (this.kbm.matches(data, "app.message.dequeue")) {
			this.triggerRuleSweep();
			super.handleInput(data);
			return;
		}
		// Ctrl+P/N = ↑/↓ nativos (cursor e, no limite, histórico), como no Claude; só quando o nycode não os usa (ciclo de modelo).
		if (matchesKey(data, "ctrl+p") && !this.kbm.matches(data, "app.model.cycleForward")) {
			super.handleInput("\x1b[A");
			return;
		}
		if (matchesKey(data, "ctrl+n")) {
			super.handleInput("\x1b[B");
			return;
		}
		// Ctrl+C com o agente ocupado interrompe (Claude); o nativo só limparia o editor ou sairia.
		if (matchesKey(data, "ctrl+c") && this.ui.busy?.() && this.compat.abort) {
			this.compat.abort();
			return;
		}
		this.cleared = false;
		// Ctrl+R/S/C valem em qualquer modo vim (sem registerShortcut: colidiriam com seletores do nycode).
		if (matchesKey(data, "ctrl+r")) {
			this.openHistory?.();
			return;
		}
		if (matchesKey(data, "ctrl+s")) {
			const next = stashStep(this.getText(), this.stash);
			this.stash = next.stash;
			this.setText(next.text);
			this.triggerRuleSweep();
			return;
		}
		if (matchesKey(data, "ctrl+c") && this.getText() !== "") {
			this.addToHistory(this.getText()); // ↑ devolve; o fluxo nativo limpa
			this.cleared = true;
		}
		// `?` com editor vazio: painel da extensão comandos; sem ele, o submit do app trata '/hotkeys' como comando nativo.
		if (data === "?" && this.mode === "insert" && this.getText() === "") {
			if (
				this.compat.openShortcuts?.((s) => {
					this.insertTextAtCursor(s);
					this.tuiRef.requestRender();
				})
			)
				return;
			this.onSubmit?.("/hotkeys");
			return;
		}
		if (!this.vim.enabled) {
			super.handleInput(data);
			return;
		}
		const api = this as unknown as Partial<EditorActions>;
		if (typeof api.runEditorAction !== "function" || typeof api.withUndoGroup !== "function") {
			// nycode sem o patch editor-actions: o Vim não edita (nada é alterado); a tecla segue o fluxo nativo.
			if (!this.apiWarned) {
				this.apiWarned = true;
				this.compat.notify?.(
					"Modo vim inativo: falta o patch editor-actions do nycode (runEditorAction/withUndoGroup).",
					"warning",
				);
			}
			super.handleInput(data);
			return;
		}
		if (this.vim.remaps !== this.remapSrc) {
			this.remapSrc = this.vim.remaps;
			this.engine.remaps = new Set(this.vim.remaps);
		}
		const esc = matchesKey(data, "escape") || matchesKey(data, "ctrl+[");
		const key = this.engine.mode === "insert" ? data : (decodeKittyPrintable(data) ?? data);
		if (this.engine.handle(key, esc) === "pass") super.handleInput(data);
	}

	// Transições curtas do editor (varredura da régua, 225 ms): 60 fps só enquanto duram. O brilho por tecla saiu (Onda 10, P25).
	private unsubRespiro: (() => void) | undefined;
	/**
	 * Cápsula (dono, 2026-11-18, laboratório /barra variante 2): enquanto o agente trabalha a borda respira devagar entre a cor
	 * da régua e o ciano; sem resposta há 10 s fica âmbar parada. Fora do turno, no modo shell ou sem movimento: cor de sempre.
	 */
	/** Texto e respiro do quadro em curso: o getter `borderColor` roda várias vezes por render e getText() junta todas as linhas. */
	private frame: { text: string; shell: string | undefined; respiro?: [number, number, number] } | undefined;
	private texto(): string {
		return this.frame ? this.frame.text : this.getText();
	}
	private shell(): string | undefined {
		return this.frame ? this.frame.shell : shellLabel(this.getText());
	}

	private respiro(): [number, number, number] | undefined {
		if (!this.ui.busy?.() || this.shell()) return undefined;
		if (travado()) return this.ui.warnRgb?.();
		if (!anima()) return undefined;
		const de = this.ui.borderRgb?.(false),
			para = this.ui.borderRgb?.(true);
		if (!de || !para) return undefined;
		if (!this.unsubRespiro) {
			this.unsubRespiro = assinarQuadro("ui-editor-respiro", () => {
				this.tuiRef.requestRender();
				if (this.ui.busy?.() && anima()) return true;
				this.unsubRespiro = undefined;
				return false;
			});
		}
		return lerpRgb(de, para, 0.5 + 0.5 * Math.sin(performance.now() / RESPIRO_MS));
	}

	private ensureAnimLoop(): void {
		if (this.unsubAnim) return;
		this.unsubAnim = assinarQuadro(
			"ui-editor",
			(now) => {
				this.tuiRef.requestRender();
				if (now >= this.sweepUntil) {
					this.unsubAnim = undefined;
					return false;
				}
				return true;
			},
			{ transicao: true },
		);
	}

	private triggerRuleSweep(): void {
		const cyanActive = Boolean(this.ui.cyan && this.focused && !tabFocused() && !this.shell());
		if (!this.ui.borderRgb?.(cyanActive) || !anima()) return;
		this.sweepStart = performance.now();
		this.sweepUntil = this.sweepStart + 225;
		this.ensureAnimLoop();
	}

	private paintRuleSweep(row: string, width: number, now: number): string {
		if (now >= this.sweepUntil) return row;
		const cyanActive = Boolean(this.ui.cyan && this.focused && !tabFocused() && !this.shell());
		const base = this.ui.borderRgb?.(cyanActive);
		if (!base) return row;
		const peak = highlightPeak(base);
		const progress = Math.max(0, Math.min(1, (now - this.sweepStart) / 225));
		return sweepRow(row, width, progress, base, peak);
	}

	/**
	 * `❯` no respiro esquerdo da 1ª linha visível (dono, 2026-11-14) e cápsula `╭╮│╰╯` em volta (dono, 2026-11-18, /barra
	 * variante 2): o respiro sobe para 4 colunas, `│ ❯ texto`. A lista de autocompletar, abaixo da base, fica fora da cápsula.
	 */
	render(width: number): string[] {
		const text = this.getText();
		this.frame = { text, shell: shellLabel(text) };
		try {
			this.frame.respiro = this.respiro();
			return this.renderFrame(width);
		} finally {
			this.frame = undefined;
		}
	}

	private renderFrame(width: number): string[] {
		if (this.getPaddingX() < 4) this.setPaddingX(4);
		const rows = this.desenha(width);
		if (rows.length > 2 && rows[1]!.startsWith("    "))
			rows[1] = `  ${this.ui.accent?.("❯") ?? "❯"} ${rows[1]!.slice(4)}`;
		if (rows.length > 2 && this.texto() === "") rows[1] = comPlaceholder(rows[1]!, this.ui.dim ?? ((s) => s), 1); // 1 coluna: o lado `│`
		const base = rows.length - 1 - this.autocompleteRows();
		if (base >= 1) {
			const lado = this.borderColor("│");
			for (let i = 1; i < base; i++) rows[i] = lados(rows[i]!, lado);
			rows[0] = cantos(rows[0]!, "╭", "╮");
			rows[base] = cantos(rows[base]!, "╰", "╯");
		}
		const now = performance.now();
		if (now < this.sweepUntil && rows.length >= 2) {
			rows[0] = this.paintRuleSweep(rows[0]!, width, now);
			rows[base] = this.paintRuleSweep(rows[base]!, width, now);
		}
		return rows;
	}

	/** Linhas do autocompletar abaixo da base (campo privado do Editor do @nycode/tui; 0 quando ausente). */
	private autocompleteRows(): number {
		const n = (this as unknown as { renderedAutocompleteHeight?: unknown }).renderedAutocompleteHeight;
		return typeof n === "number" && n > 0 ? n : 0;
	}

	private desenha(width: number): string[] {
		const rows = super.render(width);
		const sel = this.vim.enabled ? this.engine.selection() : undefined;
		if (!sel) return rows;
		const hl = highlight(rows, this.getLines(), sel, this.getPaddingX());
		if (hl) return hl;
		// Sem alinhamento a seleção não pode ser pintada: avisa na borda em vez de sumir calada (o buffer não muda).
		this.selHidden = true;
		try {
			return super.render(width);
		} finally {
			this.selHidden = false;
		}
	}

	/** Régua com rótulo na ponta direita; tenta os rótulos do mais completo ao mais curto e cai na régua nativa. */
	private labeled(width: number, labels: string[], base: (w: number) => string): string {
		for (const label of labels) {
			const rest = width - visibleWidth(label) - 5;
			if (rest >= 12) return `${base(rest)} ${label} ${this.borderColor("───")}`;
		}
		return base(width);
	}

	protected renderTopBorder(width: number, hiddenLineCount: number): string {
		const dim = this.ui.dim ?? ((s: string) => s);
		const tail =
			this.stash === undefined
				? ""
				: this.labeled(
						width,
						[`${dim("rascunho guardado ·")} ctrl+s ${dim("devolve")}`, dim("rascunho")],
						() => "",
					);
		const w = width - visibleWidth(tail);
		const fitLine = nameLabel(this.sessionName(), w);
		if (!fitLine) return super.renderTopBorder(w, hiddenLineCount) + tail;
		return super.renderTopBorder(fitLine.rest, hiddenLineCount) + fitLine.label + this.borderColor("───") + tail;
	}

	// Um lugar só para o estado do composer. Modo tem palavra além da cor da régua (NO_COLOR, WCAG 1.4.1).
	protected renderBottomBorder(width: number, hiddenLineCount: number): string {
		const dim = this.ui.dim ?? ((s: string) => s);
		const text = this.texto();
		const shell = this.frame ? this.frame.shell : shellLabel(text);
		const modes = [
			shell && this.borderColor(shell),
			this.vim.enabled && this.mode !== "insert" && this.borderColor(MODE_LABEL[this.mode]),
			this.selHidden && dim("seleção não exibida"),
		].filter(Boolean);
		// Réguas estreitas: o aviso de seleção não pintada tem prioridade sobre o rótulo de modo (não pode sumir calado).
		const labels = modes.length
			? [modes.join(dim(" · ")), ...(this.selHidden ? [dim("seleção não exibida")] : [])]
			: this.cleared
				? [`${dim("apagado ·")} ↑ ${dim("recupera")}`]
				: text !== "" && this.ui.busy?.()
					? [`⏎ ${dim("entra no próximo passo ·")} ctrl+⏎ ${dim("envia agora")}`, `⏎ ${dim("entra na fila")}`]
					: [];
		return this.labeled(width, labels, (w) => super.renderBottomBorder(w, hiddenLineCount));
	}
}

/** Ponte do `comandos` (carregado à parte): só o que o editor usa. */
type ComandosBridge = { openShortcuts?: (insert: (s: string) => void) => void };

export default function (nycode: ExtensionAPI) {
	let tui: TUI | undefined;
	let installed = false;
	let current: ExtensionContext | undefined; // último ctx: o editor sobrevive a /new e /resume
	let historyOpen = false;
	const vim: VimState = { enabled: false };
	// terminal.uiState (env NYCODE_UI_STATE > settings.json > <agentDir>/ui-state.json)
	const statePath = () => resolveNycodeSettings(nycode.getSettings(), process.env).terminal.uiState;

	nycode.registerCommand("rename", {
		description: "Renomeia a sessão atual (alias de /name) [novo nome]",
		handler: async (args, ctx) => {
			const name = args.trim();
			if (name) {
				nycode.setSessionName(name);
				ctx.ui.notify(`Sessão renomeada para “${name}”`, "info");
			} else {
				const current = nycode.getSessionName();
				ctx.ui.notify(current ? `Sessão: ${current}` : "Sessão sem nome (uso: /rename <nome>)", "info");
			}
		},
	});

	nycode.registerCommand("vim", {
		description: "Alterna a edição modal vim (normal/insert) no editor",
		handler: async (_args, ctx) => {
			if (!installed) return ctx.ui.notify("/vim indisponível: outro editor customizado está ativo", "warning");
			vim.enabled = !vim.enabled;
			try {
				mergeState({ vim: vim.enabled }, statePath());
			} catch (e) {
				ctx.ui.notify(`ui-state.json não gravado: ${e instanceof Error ? e.message : e}`, "warning");
			}
			ctx.ui.notify(
				`Modo vim ${vim.enabled ? "ligado (Esc = normal, i = insert, v = visual)" : "desligado"}`,
				"info",
			);
			tui?.requestRender();
		},
	});

	nycode.on("session_info_changed", () => tui?.requestRender());

	const openHistory = async (editor: UiEditor) => {
		const ctx = current;
		if (!ctx || historyOpen) return;
		historyOpen = true;
		try {
			const sm = ctx.sessionManager;
			const src = () => ({ branch: sm.getBranch(), sessionDir: sm.getSessionDir() });
			const chosen: string | undefined = await ctx.ui.custom(
				(t, theme, _kb, done) =>
					new PromptHistory(
						theme,
						(scope) => loadScope(scope, src()),
						done,
						() => t.requestRender(),
					),
				{ overlay: true, overlayOptions: { anchor: "bottom-center", width: "100%", maxHeight: "70%" } }, // junto do composer
			);
			if (chosen !== undefined) editor.setText(chosen);
		} catch (e) {
			ctx.ui.notify(`Histórico indisponível: ${e instanceof Error ? e.message : e}`, "warning");
		} finally {
			historyOpen = false;
		}
	};

	nycode.on("session_start", (_event, ctx) => {
		current = ctx;
		if (!ctx.hasUI) return;
		if (ctx.ui.getEditorComponent()) return; // outro editor customizado já assumiu; não sobrepor
		const state = readState(statePath());
		vim.enabled = state.vim === true;
		vim.remaps = loadRemaps(settingsPath(), statePath());
		installed = true;
		ctx.ui.setEditorComponent((t, theme, keybindings) => {
			tui = t;
			const ed = new UiEditor(t, theme, keybindings, vim, () => nycode.getSessionName(), {
				dim: (s) => current?.ui?.theme?.fg("dim", s) ?? s,
				accent: (s) => current?.ui?.theme?.fg("accent", s) ?? s,
				cyan: (s) => current?.ui?.theme?.fg("syntaxType", s) ?? s,
				busy: () => current?.isIdle?.() === false,
				textRgb: () => safeAnsi(() => current?.ui?.theme?.getFgAnsi?.("text")),
				borderRgb: (focusedCyan) =>
					safeAnsi(() => current?.ui?.theme?.getFgAnsi?.(focusedCyan ? "syntaxType" : "border")),
				warnRgb: () => safeAnsi(() => current?.ui?.theme?.getFgAnsi?.("warning")),
			});
			ed.openHistory = () => void openHistory(ed);
			ed.compat = {
				abort: () => current?.abort(),
				notify: (m, level) => current?.ui.notify(m, level),
				hasCommand: (n) => nycode.getCommands().some((c) => c.name === n),
				// Ponte em globalThis (extensions/comandos/index.ts, carregado à parte); ausente com NYCODE_COMANDOS=0.
				openShortcuts: (insert) => {
					const open = (globalThis as { __nycodeHarnessComandos?: ComandosBridge }).__nycodeHarnessComandos
						?.openShortcuts;
					if (typeof open !== "function") return false;
					open(insert);
					return true;
				},
			};
			return ed;
		});
	});
}
