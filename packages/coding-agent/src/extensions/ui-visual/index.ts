/** Controle visual do nycode: indicador de trabalho, cabeçalho e renderizadores de ferramentas. */

import { MouseRegion, Text, visibleWidth } from "@nycode/tui";
import type { ExtensionAPI } from "../../core/extensions/types.ts";
import { resolveNycodeSettings } from "../../core/settings-nycode.ts";
import { AssistantMessageComponent } from "../../modes/interactive/components/assistant-message.ts";
import { CustomMessageComponent } from "../../modes/interactive/components/custom-message.ts";
import { keyText } from "../../modes/interactive/components/keybinding-hints.ts";
import { UserMessageComponent } from "../../modes/interactive/components/user-message.ts";
import compact, { tuiAtual } from "./compact.ts";
import header from "./header.ts";
import { BLOCO_MD, marcaUsuario, setIconPrefs } from "./icons.ts";
import { instalarEscrita } from "./motion/escrita.ts";
import { ligarCaminhos, repoGithub } from "./motion/marcas.ts";
import { anima, assinarQuadro, highlightPeak, lerpRgb, safeAnsi } from "./motion/motion.ts";
import plano from "./plano/index.ts";
import tools from "./tools.ts";
import working from "./working.ts";

const BRILHO_MS = 240;
const HORA_FMT = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }); // um só: toLocaleTimeString recria o formatador a cada chamada
const horaDe = (t: number): string => {
	try {
		return HORA_FMT.format(t);
	} catch {
		return "";
	}
};
type No = { text?: unknown; children?: No[]; invalidate?: () => void };
/** Componente da mensagem do usuário com este texto (UserMessageComponent guarda `text`); busca rasa na árvore do TUI. */
export const acharMensagem = (no: unknown, md: string, prof = 6): No | undefined => {
	const n = no as No | undefined;
	if (!n || prof < 0) return undefined;
	if (n.text === md && Array.isArray(n.children)) return n;
	for (const c of [...(n.children ?? [])].reverse()) {
		// a mais nova primeiro: texto repetido acha a recém-enviada
		const hit = acharMensagem(c, md, prof - 1);
		if (hit) return hit;
	}
	return undefined;
};

/** D7 (onda 12): faixa fina. O UserMessageComponent cria o Markdown com paddingY 1; zera nas mensagens com este texto.
 * O transformador roda no render do Markdown antes das linhas de respiro, então vale já no primeiro desenho. */
export const afinarMensagem = (no: unknown, md: string, prof = 6): void => {
	const n = no as (No & { paddingY?: number }) | undefined;
	if (!n || prof < 0) return;
	if (n.text === md && Array.isArray(n.children)) {
		for (const c of n.children as Array<No & { paddingY?: number }>)
			if (c.text === md && typeof c.paddingY === "number") c.paddingY = 0;
		return;
	}
	for (const c of n.children ?? []) afinarMensagem(c, md, prof - 1);
};

/** Caixa padrão das mensagens de extensão sem renderer (`[tipo]` + texto) sem a linha de fundo em cima e embaixo (dono,
 * 2026-11-19), como a faixa fina do usuário; o Spacer de fora segue separando do bloco anterior. Idempotente. */
export const afinarCaixa = (proto: { rebuild?: (...a: unknown[]) => unknown } | undefined): void => {
	const orig = proto?.rebuild;
	if (!proto || typeof orig !== "function" || (orig as { afinada?: boolean }).afinada) return;
	const novo = function (this: { box?: { paddingY?: number } }, ...a: unknown[]) {
		const r = orig.apply(this, a);
		if (typeof this.box?.paddingY === "number") this.box.paddingY = 0;
		return r;
	};
	proto.rebuild = Object.assign(novo, { afinada: true });
};

/** Respiro fino na faixa do usuário (dono, 2026-11-19): 1/8 de linha de fundo em cima (▁) e embaixo (▔), só sob a faixa (a
 * margem sem fundo do chat-margin fica de fora; sem fundo na 1ª linha, a largura toda). O Spacer de fora segue como margem do
 * bloco anterior. `cor` = RGB de userMessageBg. Idempotente. */
export const acolchoar = (
	proto: { render?: (w: number) => string[] } | undefined,
	cor: () => number[] | undefined,
): void => {
	const orig = proto?.render;
	if (!proto || typeof orig !== "function" || (orig as { acolchoada?: boolean }).acolchoada) return;
	// Mesmas linhas, largura e cor: o mesmo array de antes, para o cache por referência do @nycode/tui pular a mensagem (perf 2026-11-24).
	const feitos = new WeakMap<object, { linhas: string[]; w: number; c: string; out: string[] }>();
	const novo = function (this: object, w: number) {
		const linhas = orig.call(this, w);
		const c = cor();
		if (!linhas.length || !c || w <= 0) return linhas;
		const cs = c.join(";"),
			visto = feitos.get(this);
		if (visto && visto.linhas === linhas && visto.w === w && visto.c === cs) return visto.out;
		const l0 = linhas[0]!.replace(/\x1b\][^\x07]*\x07/g, ""),
			ini = l0.search(/\x1b\[48;2;/);
		const pre = ini < 0 ? 0 : visibleWidth(l0.slice(0, ini));
		const resto = ini < 0 ? "" : l0.slice(ini),
			fim = resto.indexOf("\x1b[49m");
		const faixa = ini < 0 ? w : Math.min(w - pre, visibleWidth(fim < 0 ? resto : resto.slice(0, fim)));
		const pos = Math.max(0, w - pre - faixa);
		const fio = (ch: string) => `${" ".repeat(pre)}\x1b[38;2;${cs}m${ch.repeat(faixa)}\x1b[39m${" ".repeat(pos)}`;
		const out = [fio("▁"), ...linhas, fio("▔")];
		feitos.set(this, { linhas, w, c: cs, out });
		return out;
	};
	proto.render = Object.assign(novo, { acolchoada: true });
};

export default function (nycode: ExtensionAPI) {
	// Antes das partes: os ícones do cabeçalho e do indicador saem dessas preferências.
	nycode.on("session_start", () => {
		const { nerdFont, asciiIcons } = resolveNycodeSettings(nycode.getSettings(), process.env).terminal;
		setIconPrefs({ nerdFont, asciiIcons });
	});
	for (const part of [working, header, tools, compact]) part(nycode);
	if (process.env.NYCODE_SUBAGENT === "1") return;
	plano(nycode); // mensagem [plan-mode-execute] (lab /execplano, dono 2026-11-20)
	// Setinha nas mensagens enviadas pelo usuário (dono, 2026-11-14). A cor vem do tema visto no início da sessão.
	let fg = (_c: string, t: string) => t;
	let rgb = (_c: string, _bg = false): number[] | undefined => undefined;
	let cwd = process.cwd();
	let repo: string | undefined;
	nycode.on("session_start", (_e, ctx) => {
		if (ctx.hasUI) {
			fg = (c, t) => ctx.ui.theme.fg(c as never, t);
			rgb = (c, bg = false) =>
				safeAnsi(() => (bg ? ctx.ui.theme.getBgAnsi(c as never) : ctx.ui.theme.getFgAnsi(c as never)));
		}
		cwd = ctx.cwd ?? cwd;
		repo = undefined;
		if (ctx.hasUI) {
			const de = cwd;
			void repoGithub(de).then((r) => {
				if (cwd === de) repo = r;
			});
		} // assíncrono: não segura o 1º prompt
	});
	// Hora do envio: a gravada na sessão; mensagem ao vivo não traz timestamp, vale a do primeiro desenho.
	// Chave: o texto; vale a hora da mensagem mais nova com esse texto (um componente novo é outra mensagem, com hora e brilho
	// próprios). LRU: ao passar de 200 sai só a menos usada (clear() fazia as antigas reganharem a hora de agora).
	const vistas = new Map<string, { t: number; no: unknown }>();
	// Um só transformador: o nycode guarda um por extensão (loader.js: `extension.markdownTransformer = …`), o 2º apagaria este.
	nycode.registerMarkdownTransformer?.(
		(md, c) => (c?.messageType === "assistant" ? ligarCaminhos(md, cwd, repo) : doUsuario(md, c)),
		{ messageTypes: ["user", "assistant"] },
	);
	function doUsuario(md: string, c?: { timestamp?: string; availableWidth?: number }): string {
		afinarMensagem(tuiAtual(), md);
		let t = c?.timestamp ? Date.parse(c.timestamp) : undefined;
		if (!c?.timestamp) {
			const no = acharMensagem(tuiAtual(), md);
			const visto = vistas.get(md);
			if (visto && visto.no === no) {
				vistas.delete(md);
				vistas.set(md, visto); // mais recente
				t = visto.t;
			} else {
				if (visto) vistas.delete(md);
				else if (vistas.size >= 200) vistas.delete(vistas.keys().next().value as string);
				t = Date.now();
				vistas.set(md, { t, no });
				acender(md, t);
			}
		}
		const corpo = c?.timestamp ? md : brilho(md, Date.now() - (t as number));
		return marcaUsuario(corpo, fg, process.env, horaDe(t as number), c?.availableWidth ?? 0, visibleWidth);
	}

	// Brilho no envio (Onda 10, P25, variante "só no envio"): a mensagem recém-enviada chega mais clara e assenta em 240 ms.
	// O Markdown guarda o desenho em cache; a mensagem nova é invalidada a cada quadro enquanto o brilho dura.
	const brilho = (md: string, idade: number): string => {
		const base = rgb("userMessageText");
		if (idade >= BRILHO_MS || !base || !anima() || BLOCO_MD.test(md) || md.includes("\n")) return md;
		const [r, g, b] = lerpRgb(
			base,
			highlightPeak(base, rgb("userMessageBg", true)),
			(1 - idade / BRILHO_MS) ** 2 * 0.88,
		);
		return `\x1b[38;2;${r};${g};${b}m${md}\x1b[38;2;${base.join(";")}m`;
	};
	const acender = (md: string, t0: number): void => {
		if (!anima() || !rgb("userMessageText")) return;
		assinarQuadro(
			"ui-visual-envio",
			() => {
				const tui = tuiAtual() as { requestRender?: () => void } | undefined;
				acharMensagem(tui, md)?.invalidate?.();
				tui?.requestRender?.();
				return Date.now() - t0 < BRILHO_MS + 32; // um quadro depois do fim, para assentar na cor do tema
			},
			{ transicao: true },
		);
	};

	// Escrita suavizada com tinta secando e raciocínio recolhido animado (dono, 2026-11-18); falha aqui deixa o nycode nativo.
	try {
		afinarCaixa(CustomMessageComponent.prototype as never);
		acolchoar(UserMessageComponent.prototype as never, () => rgb("userMessageBg", true));
		const tema = () => (globalThis as Record<symbol, unknown>)[Symbol.for("@nycode/coding-agent:theme")] as never;
		instalarEscrita({
			Assistant: AssistantMessageComponent as never,
			MouseRegion: MouseRegion as never,
			Text: Text as never,
			tema,
			cores: () => ({
				texto: rgb("text") as never,
				pensa: rgb("thinkingText") as never,
				fundo: (rgb("customMessageBg", true) ?? rgb("userMessageBg", true)) as never,
				destaque: rgb("accent") as never,
			}),
			tecla: () => {
				try {
					return keyText("app.thinking.toggle" as never);
				} catch {
					return "";
				}
			},
			redesenha: () => (tuiAtual() as { requestRender?: () => void } | undefined)?.requestRender?.(),
		});
	} catch {
		/* nycode sem esses componentes: escrita nativa */
	}

	// Caminhos que existem e `#123` do GitHub viram links OSC 8 no texto do assistente (Onda 10, P13): no transformador único acima.
}
