// nycode: K19 interface controls (/focus, /color): chat focus filter and prompt bar colour, installed from
// updateEditorBorderColor(). Falls back to the native behaviour when nothing asks for a change.

import type { ChatChild } from "./focus.ts";
import { focusLines } from "./focus.ts";

export const KEY = Symbol.for("nycode.ui-controls");
// Fixed 256-colour SGR: no external text enters escape sequences.
export const COLORS = Object.freeze({
	red: 203,
	blue: 75,
	green: 78,
	yellow: 221,
	purple: 141,
	orange: 208,
	pink: 211,
	cyan: 80,
});
export type ColorName = keyof typeof COLORS;

type BorderColor = ((s: string) => string) & { nycodeUiColor?: true };

const colorFn = (n: number): BorderColor => {
	const f: BorderColor = (s) => `\x1b[38;5;${n}m${s}\x1b[39m`;
	f.nycodeUiColor = true;
	return f;
};
const FNS = Object.fromEntries(Object.entries(COLORS).map(([k, n]) => [k, colorFn(n)])) as Record<
	ColorName,
	BorderColor
>;

interface EditorLike {
	borderColor?: BorderColor;
}

interface ContainerLike {
	children: ChatChild[];
	render(width: number): string[];
}

/** The slice of InteractiveMode the controls use (private fields read structurally). */
export interface ControlsHost {
	editor?: EditorLike;
	defaultEditor?: EditorLike;
	editorContainer?: ContainerLike;
	chatContainer: ContainerLike;
	isBashMode?: boolean;
	ui?: { mode?: "regular" | "fullscreen"; requestRender?(): void };
	showError?(message: string): void;
	switchTuiMode?(mode: "regular" | "fullscreen"): boolean;
	updateEditorBorderColor?(): void;
}

export interface Controls {
	apiVersion: 1;
	mode(): "regular" | "fullscreen";
	setFocus(on: boolean): void;
	/** Switches the screen mode live (switchTuiMode of the core); throws with the reason when the core refuses. */
	setTuiMode(mode: "regular" | "fullscreen"): void;
	isFocus(): boolean;
	setPromptColor(name: ColorName | "default"): void;
	getPromptColor(): string;
	reset(): void;
}

type Wrap = [ContainerLike, PropertyDescriptor | undefined, ContainerLike["render"]];

/** Controller of one host. Exported for tests; production uses installUiControls. */
export function createControls(host: ControlsHost): Controls {
	let focus = false;
	let colorName: ColorName | "default" = "default";
	const wraps: Wrap[] = [];
	const editors = new Map<EditorLike, { native: BorderColor | undefined; desc: PropertyDescriptor | undefined }>();

	const wrapRender = (container: ContainerLike, make: (orig: ContainerLike["render"]) => ContainerLike["render"]) => {
		if (wraps.some((w) => w[0] === container)) return;
		const fn = make(container.render);
		wraps.push([container, Object.getOwnPropertyDescriptor(container, "render"), fn]);
		container.render = fn;
	};

	function ensureEditor(editor: EditorLike | undefined) {
		if (!editor || editors.has(editor)) return;
		const cur = editor.borderColor;
		// a copy of the core (defaultEditor to the new editor) is our own function: not a native value
		const rec = {
			native: typeof cur === "function" && cur.nycodeUiColor ? undefined : cur,
			desc: Object.getOwnPropertyDescriptor(editor, "borderColor"),
		};
		editors.set(editor, rec);
		Object.defineProperty(editor, "borderColor", {
			configurable: true,
			enumerable: true,
			get: () => (colorName !== "default" && !host.isBashMode ? FNS[colorName] : rec.native),
			set: (v: BorderColor | undefined) => {
				if (!(typeof v === "function" && v.nycodeUiColor)) rec.native = v;
			},
		});
	}

	function release(editor: EditorLike) {
		const rec = editors.get(editor);
		if (!rec) return;
		delete editor.borderColor;
		if (rec.desc && "value" in rec.desc)
			Object.defineProperty(editor, "borderColor", { ...rec.desc, value: rec.native });
		else if (rec.native !== undefined) editor.borderColor = rec.native;
		else if (rec.desc) Object.defineProperty(editor, "borderColor", rec.desc);
	}

	function reconcile() {
		for (const e of [...editors.keys()]) {
			if (e !== host.editor && e !== host.defaultEditor) {
				release(e);
				editors.delete(e);
			}
		}
		ensureEditor(host.editor);
		ensureEditor(host.defaultEditor);
	}

	function installRenders() {
		if (host.editorContainer)
			wrapRender(
				host.editorContainer,
				(orig) =>
					function (this: ContainerLike, w) {
						reconcile();
						return orig.call(this, w);
					},
			);
		wrapRender(
			host.chatContainer,
			(orig) =>
				function (this: ContainerLike, w) {
					if (!focus || api.mode() !== "fullscreen") return orig.call(this, w);
					try {
						return focusLines(this.children, w) ?? orig.call(this, w);
					} catch (err) {
						focus = false;
						host.showError?.(`Modo foco desligado: ${err instanceof Error ? err.message : String(err)}`);
						return orig.call(this, w);
					}
				},
		);
	}

	const api: Controls = {
		apiVersion: 1,
		mode: () => host.ui?.mode ?? "regular",
		setFocus(on) {
			if (on && api.mode() !== "fullscreen") throw new Error("o modo foco só existe no modo de tela fullscreen");
			installRenders();
			focus = on;
			host.ui?.requestRender?.();
		},
		setTuiMode(mode) {
			if (!host.switchTuiMode) throw new Error("o core não expõe switchTuiMode");
			if (host.switchTuiMode(mode) !== true)
				throw new Error("o core recusou a troca (há um diálogo ou sobreposição aberto; feche-o e repita)");
			if (mode === "regular") focus = false; // the filter only exists in fullscreen
			host.ui?.requestRender?.();
		},
		isFocus: () => focus,
		setPromptColor(name) {
			if (name !== "default" && !Object.hasOwn(COLORS, name))
				throw new TypeError(`cor inválida: ${String(name).slice(0, 20)}`);
			colorName = name;
			installRenders();
			reconcile();
			host.updateEditorBorderColor?.();
			host.ui?.requestRender?.();
		},
		getPromptColor: () => colorName,
		reset() {
			focus = false;
			colorName = "default";
			for (const e of [...editors.keys()]) {
				release(e);
				editors.delete(e);
			}
			for (const wrap of wraps.splice(0)) {
				const [obj, desc, fn] = wrap;
				// Wrapped over since (the /reload screen): restoring would drop that layer; ours stays, passing through.
				if (obj.render !== fn) {
					wraps.push(wrap);
					continue;
				}
				if (desc) Object.defineProperty(obj, "render", desc);
				else delete (obj as Partial<ContainerLike>).render;
			}
			host.updateEditorBorderColor?.();
			host.ui?.requestRender?.();
		},
	};
	return Object.freeze(api);
}

const installed = new WeakMap<object, Controls>();

/** Called at the start of updateEditorBorderColor(): registers the controller (idempotent per host). */
export function installUiControls(host: ControlsHost): Controls {
	let controls = installed.get(host);
	if (!controls) {
		controls = createControls(host);
		installed.set(host, controls);
		(globalThis as Record<symbol, unknown>)[KEY] = controls;
	}
	return controls;
}
