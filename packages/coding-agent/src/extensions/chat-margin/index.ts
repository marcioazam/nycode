/**
 * Todo bloco com fundo do chat respeita a margem do texto (outputPad): usuário, tools,
 * mensagens de extensão, resumos e `!bash` pintavam o fundo de ponta a ponta enquanto o texto e os blocos de código
 * ficavam dentro da margem. Embrulha `render`/`handleMouse` dos componentes do core: o bloco renderiza na
 * largura interna e ganha a margem sem fundo dos dois lados. Réguas, avisos soltos e recursos carregados: hookDocument. Erro e
 * interrupção (dentro da mensagem do assistente) ficam no patch de avisos do core.
 * Reverter: apagar este diretório.
 */
import { isImageLine } from "@nycode/tui";
import type { ExtensionAPI } from "../../core/extensions/types.ts";
import { BashExecutionComponent } from "../../modes/interactive/components/bash-execution.ts";
import { BranchSummaryMessageComponent } from "../../modes/interactive/components/branch-summary-message.ts";
import { CompactionSummaryMessageComponent } from "../../modes/interactive/components/compaction-summary-message.ts";
import { CustomMessageComponent } from "../../modes/interactive/components/custom-message.ts";
import { DynamicBorder } from "../../modes/interactive/components/dynamic-border.ts";
import { SkillInvocationMessageComponent } from "../../modes/interactive/components/skill-invocation-message.ts";
import { ToolExecutionComponent } from "../../modes/interactive/components/tool-execution.ts";
import { UserMessageComponent } from "../../modes/interactive/components/user-message.ts";
import {
	type ContainerLike,
	type Embrulhavel,
	hookContainer,
	innerWidth,
	inset,
	insetMouse,
	lead,
	MIN_INNER,
	type MouseLike,
	mesmaSaida,
	padOf,
	RECUO,
	wrapInstance,
} from "./inset.ts";

const KEY = Symbol.for("nycode.chat-margin");

/** Componente do chat como o embrulho o vê: margem, render, mouse e os campos que decidem o recuo. */
type Alvo = {
	outputPad?: unknown;
	paddingX?: unknown;
	customComponent?: unknown;
	hasRendererDefinition?: () => boolean;
};
type Proto = {
	render?: (this: Alvo, width: number) => string[];
	handleMouse?: (this: Alvo, event: MouseLike) => unknown;
};
type Orig = {
	proto: Proto;
	render?: Proto["render"];
	handleMouse?: Proto["handleMouse"];
	ownRender: boolean;
	ownMouse: boolean;
};
type Estado = { origs: Orig[]; pad: number; unhook?: (() => void)[] };

const g = globalThis as Record<symbol, Estado | undefined>;
const state: Estado = g[KEY] ?? { origs: [], pad: 1 };
g[KEY] = state;
state.pad ??= 1;

const CLASSES: Array<{ prototype: object }> = [
	UserMessageComponent,
	ToolExecutionComponent,
	CustomMessageComponent,
	CompactionSummaryMessageComponent,
	BranchSummaryMessageComponent,
	SkillInvocationMessageComponent,
	BashExecutionComponent,
];

function restore(): void {
	for (const o of state.origs) {
		if (o.ownRender) o.proto.render = o.render;
		else delete o.proto.render;
		if (o.ownMouse) o.proto.handleMouse = o.handleMouse;
		else delete o.proto.handleMouse;
	}
	state.origs = [];
}

// Blocos com fundo do core cujo padding interno nativo é só outputPad (1): ganham RECUO simétrico dos dois lados
// (branch, skill, mensagem de extensão na caixa padrão e tool sem definição). A do usuário saiu (quase
// sem padding lateral, só o do Markdown).
const RECUADOS = new Set<object>([BranchSummaryMessageComponent.prototype, SkillInvocationMessageComponent.prototype]);
const recuoDe = (self: Alvo | undefined, proto: object): number => {
	if (RECUADOS.has(proto)) return RECUO;
	if (proto === CustomMessageComponent.prototype && !self?.customComponent) return RECUO;
	if (
		proto === ToolExecutionComponent.prototype &&
		typeof self?.hasRendererDefinition === "function" &&
		!self.hasRendererDefinition()
	)
		return RECUO;
	return 0;
};

function wrap(proto: Proto): void {
	const has = (k: string) => Object.hasOwn(proto, k);
	const o: Orig = {
		proto,
		render: proto.render,
		handleMouse: proto.handleMouse,
		ownRender: has("render"),
		ownMouse: has("handleMouse"),
	};
	const render = o.render;
	if (typeof render !== "function") return;
	state.origs.push(o);
	proto.render = function (this: Alvo, width: number) {
		const p = padOf(this);
		const w = innerWidth(width, p);
		const r = recuoDe(this, proto);
		const recua = r > 0 && w - 2 * r >= MIN_INNER;
		const src = render.call(this, recua ? w - 2 * r : w);
		if (!recua && w === width) return src;
		return mesmaSaida(this, `${width}|${p}|${recua ? r : 0}`, src, (ls) => {
			const lines = recua ? lead(ls, r, isImageLine) : ls;
			return w === width ? [...lines] : inset(lines, p, isImageLine);
		});
	};
	const handleMouse = o.handleMouse;
	if (typeof handleMouse !== "function") return;
	proto.handleMouse = function (this: Alvo, event: MouseLike) {
		const base = insetMouse(event, padOf(this));
		if (base === undefined) return undefined;
		const e = base ?? event;
		const r = recuoDe(this, proto);
		if (r && e.width - 2 * r >= MIN_INNER) {
			const iw = e.width - 2 * r;
			return handleMouse.call(this, { ...e, x: Math.min(Math.max(0, e.x - r), iw - 1), width: iw });
		}
		return handleMouse.call(this, e);
	};
}

// Filhos diretos do chat fora de CLASSES: as réguas do core (What's New, atalhos, atualização), os objetos simples dos
// runtimes do harness (recarregado, caixa de memória, divisor de sessão retomada) e as classes que o core não exporta
// (entrada de sessão com renderer de extensão, anúncio). Embrulho por instância, marcado.
const UNEXPORTED = new Set(["CustomEntryComponent", "EarendilAnnouncementComponent"]);
const isLoose = (c: object): boolean =>
	c instanceof DynamicBorder || Object.getPrototypeOf(c) === Object.prototype || UNEXPORTED.has(c.constructor?.name);
const pad = () => state.pad;

/** Estrutura da TUI que o hook lê (filhos aninhados): só um objeto com `children` e `render` serve de container. */
const asContainer = (c: unknown): ContainerLike | undefined => {
	const o = c as Partial<ContainerLike> | undefined;
	return o && Array.isArray(o.children) && typeof o.render === "function" ? (o as ContainerLike) : undefined;
};

/** Documento = 1º filho do TUI: cabeçalho, recursos carregados, chat. Os recursos carregados ([Context], [Skills], avisos
 * de extensão) vêm com padding 0 do core: todos os filhos ganham a margem. No chat, só os filhos soltos (isLoose). */
function hookDocument(tui: { children: unknown[] }): void {
	const doc = asContainer(tui.children[0]);
	const resources = asContainer(doc?.children[1]);
	const chat = asContainer(doc?.children[2]);
	if (!resources || !chat) return;
	for (const undo of state.unhook ?? []) undo();
	state.unhook = [
		hookContainer(resources, (c) => wrapInstance(c as Embrulhavel | undefined, pad, isImageLine)),
		hookContainer(chat, (c) => {
			if (c && typeof c === "object" && isLoose(c)) wrapInstance(c as Embrulhavel, pad, isImageLine);
		}),
	];
}

export default function (nycode: ExtensionAPI) {
	restore(); // /reload: tira o embrulho da carga anterior antes de pôr o novo
	for (const C of CLASSES) wrap(C.prototype as Proto);
	nycode.on("session_start", (_e, ctx) => {
		state.pad = nycode.getSettings().outputPad === 0 ? 0 : 1; // padrão do nycode: 1
		if (!ctx.hasUI) return;
		ctx.ui.setWidget("chat-margin", (tui) => {
			hookDocument(tui);
			return { render: () => [], invalidate: () => {} };
		});
	});
}
