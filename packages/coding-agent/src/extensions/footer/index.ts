/**
 * Footer só com os status das extensões, pedidos do usuário 2026-11-12: a linha de estatísticas
 * (↑↓ R W $ contexto modelo, stats.ts) só aparece com o setting `footer.stats` (desligado por padrão) e sem a linha "pasta (branch) • nome da sessão" (o nome já aparece na
 * borda do editor, extensions/rename.ts). Também esconde os status de HIDDEN: "turn N $x" do nycode
 * e o indicador do ponytail. O HUD do status-line é um widget à parte e não é afetado.
 * Ponte (pedido 2026-11-13): publica o provedor de status em FOOTER_BRIDGE_CHANNEL; o HUD (status-line do
 * nycode) mostra na linha de tools as chaves que marca em `absorbed` (o 📋 do plano) e o footer as omite.
 * `folded` (set by the HUD while its widget is folded): the footer then shows nothing.
 * Os status são separados por " · " em dim.
 * Espelha dist/modes/interactive/components/footer.js do upstream 1.5.2; custo e contexto seguem em /session e no HUD.
 */
import { truncateToWidth } from "@nycode/tui";
import type { ExtensionAPI } from "../../core/extensions/types.ts";
import { resolveNycodeSettings } from "../../core/settings-nycode.ts";
import { movimento, noColor } from "../ui/a11y.ts";
import { assinarQuadro } from "../ui-visual/motion/motion.ts";
import { statsLine } from "./stats.ts";

const rgbDe = (ansi: string | undefined) =>
	/\[(?:38|48);2;(\d+);(\d+);(\d+)m/
		.exec(ansi ?? "")
		?.slice(1)
		.map(Number);
type TemaRgb = { fg(c: string, t: string): string; getFgAnsi?(c: string): string; getBgAnsi?(c: string): string };
/** Separador quase invisível: borderMuted misturado 90% ao customMessageBg; sem RGB no tema, borderMuted. */
export function fraca(theme: TemaRgb, s: string): string {
	if (noColor()) return theme.fg("borderMuted", s);
	try {
		const a = rgbDe(theme.getFgAnsi?.("borderMuted")),
			b = rgbDe(theme.getBgAnsi?.("customMessageBg"));
		if (a && b) return `\x1b[38;2;${a.map((v, i) => Math.round(v + (b[i]! - v) * 0.9)).join(";")}m${s}\x1b[39m`;
	} catch {
		/* tema sem cor */
	}
	return theme.fg("borderMuted", s);
}

// plan-mode: o `⏸ plan` do nycode saía no HUD; agora o modo (ask/auto/plan) aparece junto ao bypass pelo
// controlador de permissões (claude-compat/permissions), então o do nycode some do rodapé e do HUD.
const HIDDEN = new Set(["nycode-status", "ponytail", "plan-mode"]);
/** Mesmo nome de FOOTER_BRIDGE_CHANNEL em nycode/extensions/status-line.ts (sem import entre pacotes). */
const FOOTER_BRIDGE_CHANNEL = "nycode:footer-bridge";
/** Navegação das abas do nycode (section-nav/nav.ts `NAV_SLOT`): `shown()` é a aba aberta. */
const NAV_SLOT = Symbol.for("nycode.group-nav");

// Effort `max` em arco-íris animado: o HUD (widget do nycode abaixo do editor, processo à parte) imprime
// `(max)` numa cor só; aqui cada letra ganha uma cor do arco-íris que gira (uma volta a cada ARCO_MS). Movimento reduzido: parado.
const MAX = /\x1b\[[0-9;]*m\(max\)/g;
const ARCO_MS = 2400;
const EMBRULHO = Symbol.for("nycode.footer.arco");
const hsl = (h: number): string => {
	const f = (n: number) => {
		const k = (n + h * 12) % 12;
		return Math.round(255 * (0.7 - 0.27 * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
	};
	return `${f(0)};${f(8)};${f(4)}`;
};
export const arcoIris = (texto: string, fase: number, semCor = false): string =>
	semCor
		? texto
		: [...texto].map((ch, i, a) => `\x1b[38;2;${hsl((((i / a.length - fase) % 1) + 1) % 1)}m${ch}`).join("");

/** Embrulha o render dos widgets abaixo do editor (tui.children[5]): tira a linha vazia do topo e, enquanto houver `(max)` na
 * tela, o relógio único redesenha. */
function arcoNoHud(tui: { children?: any[]; requestRender?: () => void }): void {
	const wb = tui?.children?.[5];
	if (!wb || typeof wb.render !== "function" || wb[EMBRULHO]) return;
	const orig = wb.render.bind(wb);
	let visto = -Infinity,
		ativo = false,
		nosso = false;
	wb[EMBRULHO] = true;
	// Editor mais perto das abas: as abas do nycode (fleet-ui/chrome.ts) abrem com uma linha vazia; ela sai.
	const semVazia = (ls: string[]): string[] => (ls[0] === "" ? ls.slice(1) : ls);
	wb.render = (w: number): string[] =>
		semVazia(orig(w)).map((l: string) => {
			if (!l.includes("(max)")) return l;
			return l.replace(MAX, () => {
				const now = performance.now(),
					semCor = noColor() || movimento() !== "normal";
				if (!nosso) visto = now;
				if (!semCor && !ativo && tui.requestRender) {
					ativo = true;
					assinarQuadro("footer-arco", (t) => {
						const segue = t - visto < 500;
						ativo = segue;
						if (segue) {
							nosso = true;
							tui.requestRender!();
							nosso = false;
						}
						return segue;
					});
				}
				return arcoIris("(max)", semCor ? 0 : (now % ARCO_MS) / ARCO_MS, semCor);
			});
		});
}

export default function footerExtension(nycode: ExtensionAPI) {
	nycode.on("session_start", (_event, ctx) => {
		// read once per session (like editorMode): render runs on every frame
		const showStats = resolveNycodeSettings(nycode.getSettings(), process.env).footer.stats;
		ctx.ui.setFooter((tui, theme, footerData) => {
			arcoNoHud(tui as never);
			const absorbed = new Set<string>();
			// O HUD lê os status pela ponte: ela entrega os mesmos dados sem os escondidos.
			const visiveis = Object.create(footerData, {
				getExtensionStatuses: {
					value: () => new Map([...footerData.getExtensionStatuses()].filter(([k]) => !HIDDEN.has(k))),
				},
			});
			const bridge = { footerData: visiveis as typeof footerData, absorbed, folded: false };
			nycode.events.emit(FOOTER_BRIDGE_CHANNEL, bridge);
			return {
				dispose() {},
				invalidate() {},
				render(width: number): string[] {
					const lines: string[] = [];
					if (bridge.folded) return lines; // Status Line folded: the footer folds with it
					if (showStats)
						lines.push(truncateToWidth(theme.fg("dim", statsLine(ctx)), width, theme.fg("dim", "...")));
					const statuses = [...footerData.getExtensionStatuses().entries()].filter(
						([k, t]) => !HIDDEN.has(k) && !absorbed.has(k) && t,
					);
					if (statuses.length > 0) {
						const text = statuses
							.sort(([a], [b]) => a.localeCompare(b))
							.map(([, t]) =>
								t
									.replace(/[\r\n\t]/g, " ")
									.replace(/ +/g, " ")
									.trim(),
							)
							.join(theme.fg("dim", " · "));
						const cut = truncateToWidth(text, width, theme.fg("dim", "..."));
						// Com uma aba aberta, qualquer uma, inclusive Status: um separador ─ separa o rodapé do conteúdo dela.
						const aba = (
							(globalThis as Record<symbol, unknown>)[NAV_SLOT] as
								| { shown?: () => string | undefined }
								| undefined
						)?.shown?.();
						// Quase invisível (antes borderMuted puro, depois 75%): borderMuted puxado 90% ao fundo neutro.
						// Tracejado ╌ (antes ─ contínuo).
						if (aba !== undefined) lines.push(fraca(theme, "╌".repeat(Math.max(1, width))));
						lines.push(cut); // left-aligned, like the Status Line rows
					}
					return lines;
				},
			};
		});
	});
}
