/**
 * Ferramentas MCP (`mcp__<servidor>__<ferramenta>`) em uma linha (lab /ferramcp, desenho 21 "Uma linha · barra fina · chave" +
 * animação "Flash na troca"; antes o cartão do estado com `ferramenta args` e o JSON cru):
 *   ` <chave> <servidor> › <ferramenta>  args…        <resumo>  <duração>`
 * A chave `\uf0ad` carrega o estado pela cor: accent respirando enquanto executa (sem spinner), success ok,
 * error erro, warning aviso (ok com resultado truncado). Executando: à direita só o tempo vivo (dim) e, embaixo, uma barra
 * fina com um trecho accent deslizando; nos outros estados, uma linha só. Na troca de estado a linha sobe do fundo em
 * FLASH_MS, uma vez; o histórico (nunca visto rodando) e o movimento reduzido já a mostram assentada.
 */
import { visibleWidth } from "@nycode/tui";
import { sanitizarExibicao } from "../../ui/a11y.ts";
import { icon, nerdFont } from "../icons.ts";
import { fitLine, LEAD } from "../motion/chrome.ts";
import { anima, esmaecer, respira, safeAnsi } from "../motion/motion.ts";
import { inicioDe, tocar } from "../motion/vivo.ts";

export type McpE = "run" | "ok" | "err" | "aviso";
export type McpVisto = { res: string; aviso: boolean };
export type McpEstado = { uiMcp?: McpVisto; uiMcpVisto?: { e: McpE; fim?: number } };
type Tema = {
	fg: (c: string, t: string) => string;
	bold: (t: string) => string;
	getFgAnsi?: (c: string) => string;
	getBgAnsi?: (c: string) => string;
};
type Ctx = {
	toolCallId?: string;
	invalidate?: () => void;
	isError?: boolean;
	isPartial?: boolean;
	durationMs?: number;
};
type Bloco = { type?: string; text?: string };

export const FLASH_MS = 500;
export const ehMcp = (nome: string): boolean => /^mcp__.+?__.+/.test(nome);
const COR: Record<McpE, string> = { run: "accent", ok: "success", err: "error", aviso: "warning" };
const ease = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;
const mmss = (ms: number) =>
	`${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
const seg = (ms: number) => `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
const bytes = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1).replace(".", ",")} KB`);

/** Resumo curto do resultado: erro = 1ª linha do texto; ok = imagens e tamanho do texto; aviso = ok truncado. */
export function resumoMcp(result: unknown, erro: boolean): McpVisto {
	const r = result as { content?: Bloco[]; details?: { truncation?: { truncated?: boolean } } } | undefined;
	const blocos = r?.content ?? [];
	const texto = blocos
		.filter((b) => b.type === "text")
		.map((b) => b.text ?? "")
		.join("\n");
	if (erro)
		return {
			res: sanitizarExibicao(
				texto
					.split("\n")
					.find((l) => l.trim())
					?.trim() ?? "erro",
			),
			aviso: false,
		};
	const imgs = blocos.filter((b) => b.type === "image").length;
	const aviso = r?.details?.truncation?.truncated === true;
	const partes = [
		imgs ? (imgs === 1 ? "imagem" : `${imgs} imagens`) : "",
		texto ? bytes(Buffer.byteLength(texto)) : "",
	].filter(Boolean);
	return { res: aviso ? "truncado" : partes.join(" · ") || "ok", aviso };
}

const argsTxt = (a: Record<string, unknown>): string =>
	sanitizarExibicao(
		Object.entries(a ?? {})
			.map(([k, v]) => `${k}=${typeof v === "string" ? JSON.stringify(v) : (JSON.stringify(v) ?? String(v))}`)
			.join(" ")
			.replace(/\s+/g, " "),
	);

/** Linhas do bloco (já com o recuo LEAD) para a largura útil `w`. `agora` injeta o relógio nos testes. */
export function linhaMcp(
	nome: string,
	args: Record<string, unknown>,
	st: McpEstado,
	t: Tema,
	ctx: Ctx,
	w: number,
	o: { agora?: () => number } = {},
): string[] {
	const [, servidorBruto, ferramentaBruta] = /^mcp__(.+?)__(.+)$/.exec(nome) ?? [undefined, "", nome];
	const servidor = sanitizarExibicao(servidorBruto ?? "");
	const ferramenta = sanitizarExibicao(ferramentaBruta ?? "");
	const e: McpE = ctx.isError ? "err" : ctx.isPartial === false ? (st.uiMcp?.aviso ? "aviso" : "ok") : "run";
	const clk = o.agora ?? (() => performance.now());
	const agora = clk();
	const p = st.uiMcpVisto;
	if (e === "run") st.uiMcpVisto = { e };
	else if (p?.e === "run") st.uiMcpVisto = { e, fim: agora };
	else if (!p || p.e !== e) st.uiMcpVisto = { e };
	const fim = st.uiMcpVisto!.fim;
	const anim = anima();
	const flash = fim !== undefined && anim && agora - fim < FLASH_MS;
	// Pede redesenho: contínuo enquanto roda (respiração, barra, tempo), curto durante o flash.
	const now = e === "run" ? (o.agora ? agora : tocar(ctx)) : flash && !o.agora ? tocar(ctx, fim! + FLASH_MS) : agora;
	const W = Math.max(1, w - LEAD.length);
	const chave = nerdFont() ? "\uf0ad" : icon("tool");
	const ic = e === "run" ? respira(t, now, chave, "accent") : t.fg(COR[e], chave);
	const esq = ` ${ic} ${t.fg("syntaxType", servidor!)} ${t.fg("dim", "›")} ${t.bold(ferramenta!)}`;
	const t0 = inicioDe(ctx.toolCallId);
	const dur = ctx.durationMs !== undefined ? seg(ctx.durationMs) : "";
	let dir =
		e === "run"
			? t0 === undefined
				? ""
				: t.fg("dim", mmss(Math.max(0, now - t0)))
			: [t.fg(e === "ok" ? "muted" : COR[e], st.uiMcp?.res ?? ""), dur ? t.fg("dim", dur) : ""]
					.filter(Boolean)
					.join("  ");
	if (W < 46) dir = "";
	const rw = visibleWidth(dir) + (dir ? 1 : 0);
	const livre = W - visibleWidth(esq) - rw - 4;
	const a = livre > 6 && Object.keys(args ?? {}).length ? `  ${t.fg("dim", fitLine(argsTxt(args), livre))}` : "";
	const esqFit = fitLine(esq + a, Math.max(1, W - rw - 2));
	let linha = esqFit + " ".repeat(Math.max(2, W - visibleWidth(esqFit) - rw)) + (dir ? `${dir} ` : "");
	linha = fitLine(linha, W);
	if (flash) {
		const f = safeAnsi(() => t.getBgAnsi?.("customMessageBg")),
			x = safeAnsi(() => t.getFgAnsi?.("text"));
		if (f && x) linha = esmaecer(linha, ease((agora - fim!) / FLASH_MS), f, x);
	}
	if (e !== "run") return [LEAD + linha];
	// Barra fina só executando: um trecho accent desliza sobre o trilho borderMuted.
	const n = Math.max(1, W),
		s = Math.min(12, Math.max(4, Math.floor(n / 4))),
		pos = anim ? Math.floor((now / 900) * n) % n : 0;
	const barra = Array.from({ length: n }, (_, i) =>
		(i - pos + n) % n < s ? t.fg("accent", "━") : t.fg("borderMuted", "─"),
	).join("");
	return [LEAD + linha, LEAD + barra];
}
