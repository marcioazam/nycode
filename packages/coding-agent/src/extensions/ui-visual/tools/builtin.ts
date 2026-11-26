import { visibleWidth } from "@nycode/tui";
import { getLanguageFromPath, highlightCode } from "../../../modes/interactive/theme/theme.ts";
import { bgOpen, type DiffTheme, keepBg, memoLine, renderDiff } from "../diff.ts";
import { estadoNome, icon, iconGap } from "../icons.ts";
import { cabecalhoCurvo, moldurado, molduraOk } from "../moldura/quadro.ts";
import { comTopoDireita, fitLine, formatDuration, LEAD, RECUO, util } from "../motion/chrome.ts";
import { linhaSintaxe, linkArquivo, primeiraLinhaDiff, type Sintaxe } from "../motion/marcas.ts";
import {
	type AnsiProbeTheme,
	anima,
	lerpRgb,
	SETTLE_DURATION_MS,
	safeAnsi,
	settleFlashText,
	shimmerText,
} from "../motion/motion.ts";
import { cartaoShell, saidaShell } from "../motion/shell.ts";
import { idadeFim, rodando, tempoVivo, tocar } from "../motion/vivo.ts";
import { comFundoEdit } from "../read/cabecalho-edit.ts";
import { fundoLeitura, janelaLeitura, type Leitura, pilulaFaixa, pilulasDireita, pilulaVerbo } from "../read/chips.ts";
import {
	argPath,
	argsProntos,
	bgDe,
	type Component,
	type Ctx,
	describe,
	detail,
	empty,
	indented,
	MIN_DURATION_MS,
	memo,
	type Renderers,
	type Result,
	relPath,
	SEP,
	splitFile,
	str,
	type Theme,
	type ToolName,
} from "./base.ts";

// ── hora da execução ─────────────────────────────────────────────────────────
// Toda tool mostra à direita a hora em que TERMINOU; enquanto roda não há hora. Ao vivo vem do
// evento tool_execution_end; no histórico (retomada, /reload) vem do timestamp do resultado na sessão, lido uma vez por chamada.
export const fim = new Map<string, number>();
let historico: (() => unknown[]) | undefined;
export const HORA_W = 7; // 2 de respiro + HH:MM
// O texto da hora de uma chamada terminada não muda: formatador único e memo por chamada (o desenho roda a cada quadro).
const HORA_FMT = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const horas = new Map<string, { t: number; s: string }>();
/** toolCallId -> timestamp do resultado, montado de uma vez por sessão (antes: uma varredura do ramo por chamada). */
let horasHistorico: Map<string, number> | undefined;
/** Troca a fonte do histórico da sessão (session_start) e descarta as horas já lidas. */
export const definirHistorico = (fonte: () => unknown[]): void => {
	historico = fonte;
	horasHistorico = undefined;
};
const horasDoHistorico = (): Map<string, number> => {
	if (horasHistorico) return horasHistorico;
	const m = new Map<string, number>();
	try {
		for (const e of (historico?.() ?? []) as Array<{
			message?: { role?: string; toolCallId?: string; timestamp?: number };
		}>)
			if (e?.message?.role === "toolResult" && typeof e.message.toolCallId === "string")
				m.set(e.message.toolCallId, Number(e.message.timestamp) || 0);
	} catch {
		m.clear(); // sessão ilegível: sem hora, nunca derruba o desenho
	}
	return m;
};
export const horaDe = (ctx: Ctx): string => {
	const id = ctx.toolCallId;
	if (!id) return "";
	let t = fim.get(id);
	if (t === undefined && ctx.isPartial === false && historico) {
		horasHistorico ??= horasDoHistorico();
		t = horasHistorico.get(id);
		if (t === undefined) {
			horasHistorico = horasDoHistorico(); // resultado novo desde a montagem: relê uma vez
			t = horasHistorico.get(id) ?? 0;
		}
		fim.set(id, t);
	}
	if (!t) return "";
	const c = horas.get(id);
	if (c?.t === t) return c.s;
	let s = "";
	try {
		s = HORA_FMT.format(t);
	} catch {
		s = ""; // timestamp fora do intervalo de Date: sem hora
	}
	if (horas.size > 300) horas.clear();
	horas.set(id, { t, s });
	return s;
};

// O redesenho das tools vivas (shimmer, tempo, assentamento) mora em motion/vivo.ts; parado custa zero.
const corDe = (theme: Theme, token: string, fundo = false): [number, number, number] | undefined =>
	safeAnsi(() =>
		fundo ? (theme as AnsiProbeTheme).getBgAnsi?.(token) : (theme as AnsiProbeTheme).getFgAnsi?.(token),
	);

/** Estado em execução: shimmer na palavra e, a partir de 2 s, o tempo vivo (`executando · 14s`, Onda 10 P06). */
export const runTextoVivo = (palavra: string, theme: Theme, ctx: Ctx): string => {
	const cor = corDe(theme, "syntaxType");
	// Só pede redesenho quando há o que mudar: varredura (truecolor e movimento normal) ou tempo de uma chamada rodando.
	const now = (cor && anima()) || rodando(ctx.toolCallId) ? tocar(ctx) : performance.now();
	const tempo = tempoVivo(ctx.toolCallId, now);
	const vivo = shimmerText(
		palavra,
		cor,
		now,
		() => theme.fg("syntaxType", palavra),
		process.env,
		corDe(theme, "toolPendingBg", true),
	);
	return tempo ? vivo + theme.fg("syntaxType", ` · ${tempo}`) : vivo;
};

const okTextoSettle = (palavra: string, theme: Theme, ctx: Ctx): string => {
	const idade = idadeFim(ctx, SETTLE_DURATION_MS);
	if (idade === undefined) return estadoNome("ok", theme, palavra);
	const now = performance.now();
	return settleFlashText(
		palavra,
		corDe(theme, "success"),
		now - idade,
		now,
		() => estadoNome("ok", theme, palavra),
		process.env,
		corDe(theme, "toolSuccessBg", true),
	);
};

/** Estado no título: em execução ganha shimmer e tempo vivo; ao concluir assenta em 240 ms. */
const statusNome = (ctx: Ctx, theme: Theme, nome?: string): string => {
	if (ctx.isError) return estadoNome("err", theme, nome);
	if (ctx.isPartial === false) return okTextoSettle(nome ?? "concluído", theme, ctx);
	return runTextoVivo(nome ?? "executando", theme, ctx);
};

/** Tecla de abrir/fechar a tool, a configurada pelo usuário quando o nycode a informa. */
export const teclaDe = (ctx: Ctx): string =>
	(ctx as { keyText?: (id: string) => string | undefined }).keyText?.("app.tools.expand") || "ctrl+o";

const callComponent = (name: ToolName, theme: Theme, ctx: Ctx): Component => {
	const { target, meta } = describe(name, ctx, theme);
	const dur =
		ctx.durationMs !== undefined && ctx.durationMs >= MIN_DURATION_MS
			? theme.fg("dim", formatDuration(ctx.durationMs))
			: "";
	const desenha = (w: number): string[] => {
		const card = name !== "edit" && name !== "write";
		// Ficha na largura inteira dentro da margem do chat, a partir da coluna 0 como o cartão Run (antes
		// margem 2 e no máximo 58 colunas).
		const uw = card ? Math.max(1, w - 2) : util(w);
		const hora = w >= 30 ? horaDe(ctx) : "";
		const bgToken = ctx.isError ? "toolErrorBg" : ctx.isPartial === false ? "toolSuccessBg" : "toolPendingBg";
		// Edit no estilo do Read: lápis + `Edit`, `·` entre as partes, régua até a hora. Ícone sempre muted e
		// fundo igual ao da caixa do diff (antes ícone na cor do estado e cabeçalho sem fundo): read/cabecalho-edit.ts.
		if (name === "edit") {
			const raw = argsProntos(ctx) ? argPath(ctx.args ?? {}) : undefined;
			const rel = raw ? relPath(raw, ctx.cwd) : undefined;
			const { base: fileBase, dir: fileDir } = rel ? splitFile(rel) : { base: "", dir: "" };
			const vivo = !ctx.isError && ctx.isPartial !== false && rodando(ctx.toolCallId) && anima();
			const agora = vivo ? tocar(ctx) : 0;
			const estado = ctx.isPartial === false && !ctx.isError ? "" : statusNome(ctx, theme, ctx.state?.uiStatus);
			const lado = [dur, hora ? theme.fg("dim", hora) : ""].filter(Boolean).join(theme.fg("dim", " · "));
			const rw = visibleWidth(lado),
				dica = ctx.state?.uiDica;
			return [
				comFundoEdit(theme, boxName(ctx), ctx.outputPad, w, (iw) => {
					const partes = [
						pilulaVerbo(
							theme as never,
							ctx,
							[0, 0, 0],
							theme.fg("muted", icon("edit")),
							"Edit",
							vivo,
							agora,
							true,
						) + (estado ? SEP(theme) + estado : ""),
						rel
							? linkArquivo(theme.fg("toolTitle", theme.bold(fileBase)), raw, ctx.cwd, ctx.state?.uiLinha)
							: theme.fg("muted", "…"),
						fileDir ? theme.fg("dim", fileDir) : "",
						ctx.state?.uiRight ?? "",
					].filter(Boolean);
					const e = fitLine(partes.join(theme.fg("dim", " · ")), Math.max(1, iw - rw - 4));
					const linha = `${e} ${theme.fg("borderMuted", "─".repeat(Math.max(1, iw - visibleWidth(e) - rw - (rw ? 2 : 1))))}${rw ? ` ${lado}` : ""}`;
					return dica ? comTopoDireita(linha, iw, theme, { verbo: dica, tecla: teclaDe(ctx) }) : linha;
				}),
			];
		}
		const dica = ctx.state?.uiDica;
		const reserve = (hora ? HORA_W : 0) + (dica ? teclaDe(ctx).length + dica.length + 5 : 0);
		// Read em chips sem o fundo do cartão, a pílula na margem do chat (antes cartão cinza com 1 espaço de recuo).
		// Write igual ao Read com a bolinha cheia (antes cartão verde do shell padrão com `write` minúsculo).
		const box = (name === "read" && card) || name === "write" ? fundoLeitura(theme as never, ctx) : undefined;
		const lw = box ? w : uw;
		const width = Math.max(1, lw - reserve);
		const estado = ctx.isPartial === false && !ctx.isError ? "" : statusNome(ctx, theme, ctx.state?.uiStatus);
		const live =
			(card || name === "write") && !ctx.isError && ctx.isPartial !== false && rodando(ctx.toolCallId) && anima();
		const now = live ? tocar(ctx) : 0;
		const marker = live ? "▏▎▍▌▋▊▉"[Math.floor(now / 160) % 7] : icon(name);
		const titulo = `${card ? "" : LEAD}${theme.fg(live ? "accent" : "muted", marker)}${iconGap()}${theme.fg("toolTitle", theme.bold(name))}`;
		const token = ctx.isError ? "toolErrorBg" : "customMessageBg";
		// Read em chips com varredura e transição de estado (read/chips.ts); sem cores no tema, a linha de texto de antes.
		let first: string;
		if (box) {
			// `Read` com maiúscula e sem pílula (antes `read` numa pílula tingida).
			const pil = pilulaVerbo(
				theme as never,
				ctx,
				box,
				live ? icon(name) : marker,
				name === "write" ? "Write" : "Read",
				live,
				now,
			);
			// `·` entre o verbo e o alvo (antes só um espaço).
			const esq = `${pil}${estado ? SEP(theme) + estado : ""}${target ? SEP(theme) + target : ""}${pilulaFaixa(theme as never, box, meta)}`;
			const dir =
				name === "write"
					? [ctx.state?.uiRight, dur].filter(Boolean).join(theme.fg("dim", " · "))
					: pilulasDireita(theme as never, ctx, box, dur);
			// Régua como no Run: antes espaços entre o alvo e a contagem, e a hora em pílula à parte; agora
			// `read  alvo ──────── 3 linhas · 11:14`, com `·` entre a contagem e a hora.
			// A pílula da contagem já termina num espaço: `·` com um espaço só de cada lado (antes dois à esquerda).
			const lado = [dir, hora ? theme.fg("dim", hora) : ""]
				.filter(Boolean)
				.join(theme.fg("dim", dir.endsWith("\x1b[49m") ? "· " : " · "));
			const rw = visibleWidth(lado),
				wl = width + (hora ? HORA_W : 0);
			const e = rw === 0 || rw > wl / 2 ? "" : fitLine(esq, wl - rw - 4);
			// Moldura: com corpo embaixo a régua dobra em ╮ (moldura/quadro.ts).
			const curva = ctx.state?.uiMoldura === true && molduraOk(theme as never, wl);
			first = curva
				? cabecalhoCurvo(esq, lado, wl, theme as never, ctx.isError === true)
				: e
					? `${e} ${theme.fg("borderMuted", "─".repeat(Math.max(1, wl - visibleWidth(e) - rw - 2)))} ${lado}`
					: fitLine(esq, wl);
		} else {
			const head = `${titulo}${estado ? SEP(theme) + estado : ""}${target ? SEP(theme) + target : ""}${meta}`;
			let right = [ctx.state?.uiRight, dur].filter(Boolean).join(theme.fg("dim", " · "));
			if (visibleWidth(right) > width / 2) right = dur;
			const rw = visibleWidth(right);
			first = rw === 0 ? fitLine(head, width) : fitLine(head, width - rw - 3) + theme.fg("dim", " · ") + right;
		}
		const row = comTopoDireita(first, lw, theme, {
			verbo: dica,
			tecla: teclaDe(ctx),
			hora: box ? undefined : hora,
			bgName: card ? undefined : bgToken,
		});
		if (!card || box) return [row];
		const base = live && corDe(theme, token, true),
			accent = live && corDe(theme, "accent");
		const tint = base && accent ? lerpRgb(base, accent, 0.045 * (1 - Math.cos((2 * Math.PI * now) / 2400))) : box;
		const open = tint ? `\x1b[48;2;${tint.join(";")}m` : bgOpen(theme, token);
		const padded = ` ${keepBg(row, open)}${" ".repeat(Math.max(0, uw - visibleWidth(row)) + 1)}`;
		const painted = tint ? `${open + padded}\x1b[49m` : (theme.bg?.(token, padded) ?? padded);
		return [w < 3 ? fitLine(painted, w) : painted];
	};
	// Linha terminada (fora da janela de assentamento) é imutável: guarda a última saída por chave de tudo que a linha lê.
	// Chamada em execução (isPartial !== false e sem erro) recalcula a cada quadro.
	let guardado: { chave: string; theme: unknown; args: unknown; linhas: string[] } | undefined;
	const chaveTema = (): string => {
		const t = theme as AnsiProbeTheme;
		try {
			return [
				t.getBgAnsi?.("customMessageBg"),
				t.getBgAnsi?.("toolSuccessBg"),
				t.getBgAnsi?.("toolErrorBg"),
				t.getFgAnsi?.("muted"),
				t.getFgAnsi?.("accent"),
			].join("|");
		} catch {
			return "?";
		}
	};
	return {
		render: (w) => {
			// Read/Write com pulso: o erro também fica vivo até o fim do pulso; antes guardava o 1º quadro do erro.
			const vivoFim =
				name === "read" || name === "write"
					? idadeFim(ctx, Math.max(SETTLE_DURATION_MS, janelaLeitura(ctx as never))) !== undefined
					: !ctx.isError && idadeFim(ctx, SETTLE_DURATION_MS) !== undefined;
			if (!(ctx.isError || ctx.isPartial === false) || vivoFim) return desenha(w);
			const s = ctx.state;
			const chave = [
				w,
				ctx.isError,
				ctx.isPartial,
				ctx.durationMs,
				ctx.argsComplete,
				w >= 30 ? horaDe(ctx) : "",
				s?.uiRight,
				s?.uiStatus,
				s?.uiDica,
				s?.uiLinha,
				s?.uiMoldura,
				teclaDe(ctx),
				chaveTema(),
			].join("\u0001");
			if (guardado && guardado.chave === chave && guardado.theme === theme && guardado.args === ctx.args)
				return guardado.linhas;
			const linhas = desenha(w);
			guardado = { chave, theme, args: ctx.args, linhas };
			return linhas;
		},
		invalidate() {
			guardado = undefined;
		},
	};
};

const textOf = (result: Result): string =>
	(result.content ?? [])
		.filter((b) => b.type === "text")
		.map((b) => b.text ?? "")
		.join("\n");
const nonEmpty = (text: string): string[] =>
	text
		.split("\n")
		.map((l) => l.replace(/\s+$/, ""))
		.filter((l) => l.trim() !== "");
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Resumo que vai após o alvo na linha da chamada; '' quando não há o que dizer. */
const rightOf = (name: ToolName, result: Result, ctx: Ctx, theme: Theme): string => {
	const text = textOf(result);
	if (ctx.isError) return "";
	let summary: string;
	if (name === "read") {
		const l = leituraDe(result);
		if (l.img) return ""; // sem o tipo (antes `imagem`)
		summary = count(l.n, "linha", "linhas");
	} else if (name === "write") {
		const content = typeof ctx.args?.content === "string" ? ctx.args.content : "";
		summary = count(content === "" ? 0 : content.replace(/\n+$/, "").split("\n").length, "linha", "linhas");
	} else if (name === "edit") {
		const diff = (result.details?.diff ?? "").split("\n");
		const add = diff.filter((l) => l.startsWith("+")).length;
		const rem = diff.filter((l) => l.startsWith("-")).length;
		const total = add + rem;
		let bar = "";
		if (total > 0) {
			const cells = Math.min(5, total);
			let g = Math.round((add / total) * cells);
			if (add > 0 && rem > 0) g = Math.max(1, Math.min(cells - 1, g));
			bar = `  ${g > 0 ? theme.fg("toolDiffAdded", "━".repeat(g)) : ""}${g < cells ? theme.fg("toolDiffRemoved", "━".repeat(cells - g)) : ""}`;
		}
		return `${theme.bold(theme.fg("toolDiffAdded", `+${add}`))} ${theme.bold(theme.fg("toolDiffRemoved", `−${rem}`))}${bar}`;
	} else {
		// grep/find/ls: ignora avisos entre colchetes e as mensagens de vazio nativas.
		const n = nonEmpty(text).filter(
			(l) => !/^\[.*\]$/.test(l) && !/^(no .*(found|match)|\(empty directory\))/i.test(l.trim()),
		).length;
		summary = n === 0 ? "nenhum resultado" : count(n, "resultado", "resultados");
	}
	return theme.fg("dim", summary) + (result.details?.truncation?.truncated ? theme.fg("warning", " · truncado") : "");
};

const leituraDe = (result: Result): Leitura => {
	const text = textOf(result);
	return {
		n: text === "" ? 0 : text.replace(/\n+$/, "").split("\n").length,
		img: (result.content ?? []).some((b) => b.type === "image"),
		trunc: result.details?.truncation?.truncated === true,
	};
};

const errorComponent = (_name: ToolName, result: Result, theme: Theme, _ctx: Ctx): Component => {
	const first = nonEmpty(textOf(result))[0];
	return first ? detail([theme.fg("error", first)], theme) : empty();
};

/** Caixa do edit (renderShell 'self') imitando o Box do nycode, mas com fundo NEUTRO depois de terminar (customMessageBg; verde confundiria com linha adicionada),
 * ciano enquanto executa (toolPendingBg) e toolErrorBg em erro:
 * linhas preenchidas na largura, recuo outputPad, linha em branco acima (`top`) e/ou abaixo (`bottom`).
 * `pending`: abaixo só enquanto não há resultado final (args sendo escritos ou execução); depois quem fecha é o resultado.
 * Sem cor no tema, devolve as linhas do interior como estão. Sem linhas, não desenha nada. */
const boxName = (ctx: Ctx): string =>
	ctx.isError ? "toolErrorBg" : ctx.isPartial === false ? "customMessageBg" : "toolPendingBg";
const boxed = (
	inner: Component,
	theme: Theme,
	ctx: Ctx,
	edge: { top?: boolean; bottom?: boolean; pending?: boolean },
): Component => {
	let antes: string[] = [],
		pintado: string[] = [],
		k = "";
	const desenha = (w: number): string[] => {
		const name = boxName(ctx);
		const open = bgOpen(theme, name);
		if (!open || !theme.bg) return inner.render(w);
		const pad = ctx.outputPad ?? 1;
		const iw = Math.max(1, w - 2 * pad);
		const rows = inner.render(iw);
		if (!rows.length) return [];
		// Mesmo interior, largura e fundo: a pintura anterior vale (comparação por linha, barata quando o interior vem de cache).
		const chave = `${w}|${name}|${open}|${ctx.isPartial}|${ctx.isError}`;
		if (chave === k && rows.length === antes.length && rows.every((r, i) => r === antes[i])) return pintado;
		const paint = (row: string) => {
			const r = keepBg(fitLine(row, iw), open);
			return (theme.bg as NonNullable<Theme["bg"]>)(
				name,
				" ".repeat(pad) + r + " ".repeat(Math.max(0, iw - visibleWidth(r))) + " ".repeat(pad),
			);
		};
		const bottom = edge.bottom || (edge.pending && ctx.isPartial !== false && !ctx.isError);
		pintado = [...(edge.top ? [paint("")] : []), ...rows.map(paint), ...(bottom ? [paint("")] : [])];
		antes = rows;
		k = chave;
		return pintado;
	};
	return {
		render: desenha,
		invalidate: () => {
			k = "";
			inner.invalidate();
		},
	};
};

/** Diff inline recalculado a cada largura (Variante 2: divisor horizontal sutil acima do diff + realce de sintaxe). */
const diffComponent = (name: ToolName, diff: string, theme: Theme, ctx: Ctx, fallback: () => Component): Component => {
	// Realce por linha reaproveitado entre larguras (U5); invalidate (troca de tema) o descarta.
	let hlLang: string | undefined;
	const hl = memoLine((line) => highlightCode(line, hlLang as string)[0] ?? line);
	return memo(
		(w) => `${w}|${boxName(ctx)}|${bgDe(theme, boxName(ctx))}|${argPath(ctx.args ?? {}) ?? ""}`,
		(w) => {
			try {
				const lang = getLanguageFromPath(argPath(ctx.args ?? {}) ?? "");
				if (lang !== hlLang) {
					hl.clear();
					hlLang = lang;
				}
				const highlight = lang ? hl.fn : undefined;
				const base = name === "edit" ? boxName(ctx) : undefined;
				const rows = renderDiff(diff, theme as DiffTheme, { width: w, fitLine, visibleWidth, highlight, base });
				const open = base ? bgOpen(theme, base) : "";
				if (!rows.length || name !== "edit" || !open || !theme.bg || !base) return rows;
				const pad = w > 2 * RECUO ? RECUO : 0;
				const ruleCols = Math.max(1, w - 2 * pad);
				const ruleText = `${" ".repeat(pad)}${theme.fg("dim", "─".repeat(ruleCols))}`;
				const ruleRow = theme.bg(
					base,
					keepBg(ruleText, open) + " ".repeat(Math.max(0, w - visibleWidth(ruleText))),
				);
				return [ruleRow, ...rows];
			} catch {
				return fallback().render(w);
			}
		},
		hl.clear,
	);
};

/** Linha do erro de sintaxe (P12) depois do diff, com o mesmo trilho do corpo. */
const comSintaxe = (c: Component, s: Sintaxe | undefined, theme: Theme): Component =>
	!s
		? c
		: {
				render: (w) => [...c.render(w), ...detail([linhaSintaxe(s, theme as never)], theme).render(w)],
				invalidate: () => c.invalidate(),
			};

export const wrap = (name: ToolName, base: Renderers): Renderers => ({
	...base,
	renderShell: "self" as const, // Write no estilo do Read (antes o write ficava no shell padrão, fundo verde)
	renderCall(args, theme, context) {
		try {
			if (name === "bash") {
				const cmd = argsProntos(context) ? str(context.args?.command) : undefined;
				const [first, ...rest] = (cmd ?? "").split("\n");
				const dur =
					context.durationMs !== undefined && context.durationMs >= MIN_DURATION_MS
						? formatDuration(context.durationMs)
						: "";
				const parcial = cmd === undefined ? str(context.args?.command)?.split("\n")[0] : undefined;
				return cartaoShell(theme, context, {
					comando: cmd ? `${first}${rest.length ? "…" : ""}` : undefined,
					parcial,
					hora: horaDe(context),
					tecla: teclaDe(context),
					expandido: context.expanded === true,
					dur,
				});
			}
			return callComponent(name, theme, context); // edit: cabeçalho com o fundo da caixa do diff
		} catch {
			return base.renderCall ? base.renderCall(args, theme, context) : empty();
		}
	},
	renderResult(result, options, theme, context) {
		// Os renderers nativos reaproveitam context.lastComponent (setText/clear); o nycode põe ali o que NÓS devolvemos
		// por último. Entregamos ao nativo o componente que ele mesmo criou, guardado no estado da chamada.
		const native = (cru = false) => {
			if (!base.renderResult) return empty();
			const inner = base.renderResult(result, options, theme, {
				...context,
				outputPad: 0,
				lastComponent: context.state?.uiNative,
			});
			if (context.state) context.state.uiNative = inner;
			return cru ? inner : indented(inner);
		};
		// O edit pinta a própria caixa (renderShell 'self'); resultado parcial não desenha nada.
		const finish = (c: Component, partial: boolean) =>
			name === "edit" && !partial ? boxed(c, theme, context, { bottom: true }) : c;
		const partial = options.isPartial === true;
		try {
			// Cartão do shell: o resultado só entrega a saída ao estado; quem desenha tudo é a chamada (motion/shell.ts).
			if (name === "bash") {
				if (context.state) context.state.uiShell = saidaShell(textOf(result), context.isError === true && !partial);
				return empty();
			}
			if (context.state) {
				context.state.uiRight = partial ? undefined : rightOf(name, result, context, theme);
				context.state.uiLeitura = name === "read" && !partial && !context.isError ? leituraDe(result) : undefined;
				context.state.uiLinha = name === "edit" ? primeiraLinhaDiff(result.details?.diff) : undefined;
				context.state.uiDica = partial ? undefined : name === "edit" && options.expanded ? "fecha" : undefined;
			}
			const diff = result.details?.diff;
			const sintaxe = !partial && !context.isError ? result.details?.sintaxe : undefined;
			const mold = moldurado({
				name,
				partial,
				expanded: options.expanded === true,
				ctx: context,
				theme,
				erro: context.isError ? nonEmpty(textOf(result))[0] : undefined,
				sintaxe: sintaxe ? linhaSintaxe(sintaxe, theme as never) : undefined,
				nativo: () => native(true),
			});
			if (mold) return mold;
			if (name === "edit" && !partial && !context.isError && typeof diff === "string" && diff.trim() !== "")
				return finish(comSintaxe(diffComponent(name, diff, theme, context, native), sintaxe, theme), partial);
			if (sintaxe && name === "write" && !options.expanded)
				return detail([linhaSintaxe(sintaxe, theme as never)], theme);
			if (options.expanded) return finish(native(), partial);
			if (partial) return empty();
			// Imagem lida: uma linha a mais entre o cabeçalho e a imagem (antes só o espaçador do nycode).
			if (name === "read" && !context.isError && context.state?.uiLeitura?.img)
				return { render: () => [""], invalidate() {} };
			if (context.isError) return finish(errorComponent(name, result, theme, context), partial);
			if (name === "edit" && base.renderResult) return finish(native(), partial); // sem diff
			return empty();
		} catch {
			return finish(native(), partial);
		}
	},
});
