// Cola chamadas de tool consecutivas (Onda 3): o nycode 1.5.2 põe uma linha em branco antes de toda tool com
// renderShell 'self'; entre duas tools seguidas ela some, e cada chamada ocupa uma linha só.
// Limite: embrulha o render do contêiner do chat, achado pela forma (filho com toolCallId). Se o nycode mudar essa
// forma nada é embrulhado e as tools voltam a ter a linha em branco.
import type { ExtensionAPI } from "../../core/extensions/types.ts";

type MouseEvent = { y: number; height: number; [key: string]: unknown };
type Child = {
	render: (width: number) => string[];
	handleMouse?: (event: MouseEvent) => unknown;
	toolCallId?: unknown;
	getRenderShell?: () => string;
	children?: unknown[];
};
type Layout = { component: Pick<Child, "handleMouse">; height: number };

const WRAPPED = Symbol.for("nycode.ui-visual.compact");
const HOOK = Symbol.for("nycode.chat-margin.hook"); // render do chat-margin (inset.ts): { pre, prev }
type Hook = { pre: (self: unknown) => void; prev: unknown };
let tuiVisto: unknown;
/** TUI recebido pelo widget (o brilho do envio, em index.ts, invalida a mensagem nova por ele). */
export const tuiAtual = (): unknown => tuiVisto;
const isTool = (c: unknown): c is Child => typeof (c as Child | undefined)?.toolCallId === "string";
const isSelfTool = (c: Child): boolean =>
	isTool(c) && typeof c.getRenderShell === "function" && c.getRenderShell() === "self";

/** Igual a Container.render, sem a linha em branco inicial de uma tool 'self' que vem logo após outra. */
type Result = { lines: string[]; layout: Layout[] };
type Memo = { width: number; children: Child[]; refs: string[][]; out: Result };
export const compactRender = (children: Child[], width: number, memo?: { last?: Memo }): Result => {
	const lines: string[] = [];
	const layout: Layout[] = [];
	const all = children.map((c) => c.render(width));
	// Filhos com cache devolvem a mesma referência enquanto nada muda: o layout e as linhas não são refeitos.
	const last = memo?.last;
	if (
		last &&
		last.width === width &&
		last.children.length === children.length &&
		children.every((c, i) => c === last.children[i] && all[i] === last.refs[i])
	)
		return { lines: last.out.lines.slice(), layout: last.out.layout };
	let afterTool = false;
	for (const [i, child] of children.entries()) {
		let rows = all[i];
		let component: Layout["component"] = child;
		const tool = rows.length > 0 && isSelfTool(child);
		if (tool && afterTool && rows[0] === "") {
			rows = rows.slice(1);
			// A tool trata a própria linha 0 como o espaçador: devolvemos o deslocamento ao repassar o clique.
			component = { handleMouse: (e) => child.handleMouse?.({ ...e, y: e.y + 1, height: e.height + 1 }) };
		}
		if (rows.length > 0) afterTool = tool; // filhos vazios (mensagem sem texto entre duas tools) não separam
		layout.push({ component, height: rows.length });
		for (const row of rows) lines.push(row);
	}
	const out = { lines, layout };
	if (memo) memo.last = { width, children: children.slice(), refs: all, out: { lines: lines.slice(), layout } };
	return out;
};

/** Contêiner cujos filhos diretos incluem uma tool; busca rasa, a árvore do TUI é pequena fora do chat. */
export const findChat = (node: unknown, depth = 6): Child | undefined => {
	const children = (node as Child | undefined)?.children;
	if (!Array.isArray(children) || depth < 0) return undefined;
	if (children.some(isTool)) return node as Child;
	for (const child of children) {
		const hit = findChat(child, depth - 1);
		if (hit) return hit;
	}
	return undefined;
};

/** Embrulha uma vez; não toca num render que outra extensão já trocou. */
export const attach = (chat: Child & { [WRAPPED]?: boolean; mouseLayout?: unknown }): boolean => {
	if (chat[WRAPPED]) return true;
	const hook = (chat.render as unknown as { [HOOK]?: Hook })[HOOK];
	let base: unknown = chat.render;
	for (let h = hook; h; h = (base as { [HOOK]?: Hook })[HOOK]) base = h.prev; // hooks encadeados (recarga): o render de baixo é o do protótipo?
	if (base !== Object.getPrototypeOf(chat).render) return false;
	chat[WRAPPED] = true;
	const memo: { last?: Memo } = {};
	chat.render = function (this: typeof chat, width: number) {
		hook?.pre(this); // o chat-margin ficava no render que trocamos: o filtro dos filhos novos segue rodando
		const { lines, layout } = compactRender((this.children ?? []) as Child[], width, memo);
		this.mouseLayout = { width, children: layout };
		return lines;
	};
	return true;
};

export default function (nycode: ExtensionAPI): void {
	if (process.env.NYCODE_SUBAGENT === "1") return;
	nycode.on("session_start", (_event, ctx) => {
		if (!ctx.hasUI) return;
		ctx.ui.setWidget("tool-compact", (tui: unknown) => {
			tuiVisto = tui;
			(globalThis as Record<symbol, unknown>)[Symbol.for("nycode:tui")] = tui; // a linha de compactação (patch de avisos do core) anima por ele
			let done = false;
			// Widget sem linhas: só serve para receber o TUI e procurar o chat até a primeira tool aparecer.
			return {
				render: () => {
					if (!done) {
						const chat = findChat(tui);
						if (chat) {
							done = attach(chat); // recusado (render alheio): tenta de novo no quadro seguinte
						}
					}
					return [];
				},
				invalidate() {},
			};
		});
	});
}
