/** Mensagens de hook (`claude-stop-hook`, `claude-async-hook` do nycode) no ritmo das tools:
 * `estado ⚑ hook   alvo · quando                 HH:MM` e, embaixo da hora, `ctrl+o abre` (clique também abre e fecha), com o fundo do estado (ui-visual/icons.ts).
 * ▲ = o hook pede ação ao agente, ✕ = o hook falhou, ✓ = só executou. Só muda a exibição: o texto enviado ao modelo é o mesmo.
 * Desenho: docs/designs/onda7-tokens/exemplos/sinais-variantes.html#hook. */

import { truncateToWidth, visibleWidth, wrapTextWithAnsi } from "@nycode/tui";
import type { ExtensionAPI } from "../../core/extensions/types.ts";
import { sanitizarExibicao } from "../ui/a11y.ts";
import { dicaTecla, type Estado, estadoBg, estadoNome, icon, iconGap } from "../ui-visual/icons.ts";
import { anima, esmaecer, safeAnsi } from "../ui-visual/motion/motion.ts";
import { cartaoShell, PREVIA, saidaShell } from "../ui-visual/motion/shell.ts";
import { terminou } from "../ui-visual/motion/vivo.ts";

type Theme = Parameters<typeof estadoBg>[1] & { bold?: (s: string) => string };
type Resumo = { alvo: string; quando: string; detalhe: string[]; previa?: string };
// completion-gate (extensions/completion-gate.ts) no mesmo visual, com rótulo `gate` (variante A).
// subagent-background (aviso de subagente em segundo plano do nycode) no mesmo visual, com rótulo `subagente` e ícone ⇄.
// run-finished (aviso do `run start … await` do nycode) no padrão do run em ui-visual/tools.ts (variante B).
const TIPOS = [
	"claude-stop-hook",
	"claude-async-hook",
	"completion-gate",
	"subagent-background",
	"run-finished",
] as const;
const FIM = "run-finished";
// Linha de estado do run (nycode run/tool.ts, `line`): id [tipo] estado[ exit N| sinal X] · duração · nome[ · aguardado][ · log caminho]
const FIM_LINHA =
	/^(\S+) \[\w+\] (\S+)((?: exit -?\d+| sinal \S+| terminou)?) · ([\d:]+) · (.*?)(?: · aguardado)?(?: · log (.+))?$/;
const fimDe = (content: string) => {
	const [, cab = "", ...resto] = content.split("\n");
	const m = FIM_LINHA.exec(cab);
	return m
		? {
				id: m[1]!,
				base: m[2]!,
				fim: m[3]!.trim(),
				dur: m[4]!,
				nome: m[5]!,
				log: m[6],
				saida: resto.map((l) => l.trimEnd()).filter((l, i, a) => l !== "(sem output)" && (l || i < a.length - 1)),
			}
		: undefined;
};
const GATE = "completion-gate";
const SUB = "subagent-background";
const RUN = /Background subagent run (\S+) \(([^)]*)\) (\w+) after (\d+) turns?([^\n]*)\n?/g;
const REWAKE = /^Async hook requested attention \(exit 2\):?\n?/;
/** Coluna do título (ícone + vão, após o padding lateral simétrico da caixa): a barra │ fica embaixo dele. */
const recuo = (): string => " ".repeat(1 + iconGap().length);
const FALHA = /^(\[[^\]]+\]\s*)?(error|erro|fatal|traceback|exception|panic)\b|\b(falhou|failed|traceback)\b/i;

const linhas = (content: string): string[] =>
	sanitizarExibicao(content)
		.replace(REWAKE, "")
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean);

const runs = (content: string) =>
	[...content.matchAll(RUN)].map((m) => ({
		id: m[1]!,
		agente: m[2]!,
		estado: m[3]!,
		turnos: Number(m[4]),
		cola: m[5]!,
		fim: m.index! + m[0].length,
	}));
const semMarkdown = (s: string) =>
	s
		.replace(/^#+\s*/, "")
		.replace(/\*\*|__|`/g, "")
		.trim();

/** Lote paralelo destacado: `Parallel: 2/3 succeeded` (nycode subagent/modes.ts). */
const lote = (content: string): { ok: number; n: number } | undefined => {
	const m = /^Parallel: (\d+)\/(\d+) succeeded/m.exec(content);
	return m ? { ok: Number(m[1]), n: Number(m[2]) } : undefined;
};

/** Aviso de subagente: cabeçalho de cada run (estado, agente, turnos) e o relatório depois dele. */
const subagente = (content: string): Resumo => {
	const rs = runs(content);
	const um = rs.length === 1 ? rs[0]! : undefined;
	const corpo = um
		? content.slice(um.fim)
		: rs.length
			? content.slice(content.indexOf("Background subagent run"))
			: content.split("\n").slice(1).join("\n");
	const relatorio =
		!corpo.trim() || corpo.trim() === "(no output)"
			? []
			: corpo
					.trim()
					.split("\n")
					.map((l) => l.trimEnd());
	const duracao = /(\d+(?:[.,]\d+)?) ?(min|sec|s)\b/.exec(um?.cola ?? "");
	const alvo = um
		? `${um.agente} · ${um.turnos} ${um.turnos === 1 ? "turno" : "turnos"}${duracao ? ` · ${duracao[1]} ${duracao[2] === "sec" ? "s" : duracao[2]}` : ""}`
		: rs.length
			? `${rs.length} runs · ${[...new Set(rs.map((r) => r.agente))].join(", ")}`
			: "chamada em segundo plano";
	const l = lote(content);
	if (l) {
		const itens = [...content.matchAll(/^\[([^\]\n]+)\] (\w+): ?(.*)$/gm)].map((m) => ({
			agente: m[1]!,
			ok: m[2] === "completed",
			texto: semMarkdown(m[3]!),
		}));
		const item = itens.find((i) => !i.ok) ?? itens[0]; // o que falhou aparece primeiro
		return {
			alvo: `paralelo · ${l.ok} de ${l.n} concluídos${l.ok < l.n ? ` · ${l.n - l.ok} ${l.n - l.ok === 1 ? "falhou" : "falharam"}` : ""}`,
			quando: "",
			previa: item ? `${item.agente}: ${item.texto}` : undefined,
			detalhe: relatorio,
		};
	}
	const previa = relatorio.map(semMarkdown).find(Boolean);
	return {
		alvo,
		quando: "",
		previa,
		detalhe: [...rs.map((r) => `run ${r.id}${rs.length > 1 ? ` · ${r.agente}` : ""}`), ...relatorio],
	};
};

export const classify = (customType: string, content: string): Exclude<Estado, "run"> => {
	if (customType === FIM) {
		const f = fimDe(content);
		return !f || f.base === "done" ? "ok" : f.base === "stopped" ? "warn" : "err";
	}
	if (customType === SUB) {
		const rs = runs(content);
		const l = lote(content);
		if (l) return l.ok === l.n ? "ok" : l.ok === 0 ? "err" : "warn"; // todos ok, nenhum ok, ou misto
		if (!rs.length)
			return /^Subagent call failed|\bfailed\b/i.test(content.split("\n").find((l) => l.trim()) ?? "")
				? "err"
				: "ok";
		const falhas = rs.filter((r) => !["done", "cancelled"].includes(r.estado)).length;
		if (falhas) return falhas === rs.length ? "err" : "warn"; // uns ok e outros com erro = aviso
		return rs.some((r) => r.estado === "cancelled") ? "warn" : "ok";
	}
	if (customType === GATE) return "warn";
	if (FALHA.test(linhas(content)[0] ?? "")) return "err";
	return customType === "claude-stop-hook" || REWAKE.test(content) ? "warn" : "ok";
};

export const summarize = (customType: string, content: string): Resumo => {
	if (customType === SUB) return subagente(content);
	const quando = customType === "claude-async-hook" ? "assíncrono" : "ao parar";
	if (customType === GATE) {
		const arquivos = (/edited this turn \(([^)]*)\)/.exec(content)?.[1] ?? "").split(", ").filter(Boolean);
		const n = arquivos.length;
		return {
			// Faixa âmbar: antes `conclusão · N arquivos…` e `· ao parar`; agora só o resumo.
			alvo: `${n === 1 ? "1 arquivo editado" : `${n} arquivos editados`}, nenhum check depois`,
			quando: "",
			detalhe: [
				...arquivos,
				"pedido ao agente: rodar os checks e reportar, ou dizer em uma linha que a verificação fica para o commit",
			],
		};
	}
	const [primeira = "sem texto", ...detalhe] = linhas(content);
	const tag = /^\[([^\]@]+)(?:@[^\]]*)?\]\s*(.*)$/.exec(primeira);
	return { alvo: tag ? `${tag[1]} · ${tag[2]}` : primeira, quando, detalhe };
};

const textOf = (content: unknown): string =>
	typeof content === "string"
		? content
		: Array.isArray(content)
			? content.map((c) => (c?.type === "text" ? String(c.text) : "")).join("\n")
			: "";

type Opcoes = { expanded?: boolean; outputPad?: number; keyText?: (id: string) => string };
type Clique = { type?: string; button?: string };

/** Recém-chegado (até 3 s): dissolve como o Bash ao terminar; do histórico vem assentado. Uma vez por run. */
const CHEGADA_MS = 3000;
const chegados = new Set<string>();
const horaDe = (ts: number) =>
	ts > 0 ? new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";

/** Fim do run = o cartão do Bash (antes caixa própria `▶ run · terminou`): mesmo título régua, prévia,
 * rodapé (`OK`, `OK · N avisos`, `Erro`, `Erro N`, `interrompido`) e dissolver; o nome do run ocupa o lugar do comando. */
function cartaoFim(message: Mensagem, options: Opcoes, theme: Theme) {
	const f = fimDe(textOf(message.content));
	if (!f) return undefined;
	const code = /exit (-?\d+)/.exec(f.fim)?.[1];
	const erro = f.base === "failed" || f.base === "stopped" || (code !== undefined && code !== "0");
	const home = process.env.HOME;
	const s = saidaShell(f.saida.join("\n"), erro);
	s.log = f.log && home && f.log.startsWith(home) ? `~${f.log.slice(home.length)}` : f.log;
	if (erro)
		s.estado =
			f.base === "stopped" || f.fim.startsWith("sinal")
				? "interrompido"
				: !code || code === "1"
					? "Erro"
					: `Erro ${code}`;
	const ts = Number(message.timestamp);
	const id = `run-fim:${f.id}`;
	if (ts > 0 && Date.now() - ts < CHEGADA_MS && !chegados.has(id)) {
		chegados.add(id);
		if (chegados.size > 300) chegados.clear();
		terminou(id, performance.now() - Math.max(0, Date.now() - ts));
	}
	const ctx = {
		isError: erro,
		isPartial: false,
		executionStarted: true,
		toolCallId: id,
		invalidate: () => {},
		state: { uiShell: s },
	};
	const c = cartaoShell(theme as never, ctx, {
		comando: f.nome,
		hora: horaDe(ts),
		tecla: options.keyText?.("app.tools.expand") || "ctrl+o",
		expandido: !!options.expanded,
		dur: f.dur.replace(/^0(?=\d)/, ""),
	});
	return { render: (w: number) => c.render(w), abre: s.total > PREVIA };
}

type Mensagem = { customType?: string; content?: unknown; timestamp?: unknown };

/** Bloco do aviso; um clique esquerdo abre e fecha só este bloco, por cima do atalho global. */
export function render(message: Mensagem, options: Opcoes, theme: Theme) {
	let virado = false;
	const montar = (m: typeof message, o: Opcoes, t: Theme) =>
		(m.customType === FIM && cartaoFim(m, o, t)) || montarCaixa(m, o, t);
	let bloco = montar(message, options, theme);
	return {
		render: (w: number): string[] => bloco.render(w),
		invalidate() {},
		handleMouse(e: Clique): { handled: true } | undefined {
			if (!bloco.abre || e?.type !== "click" || e.button !== "left") return undefined;
			virado = !virado;
			bloco = montar(message, { ...options, expanded: !!options.expanded !== virado }, theme);
			return { handled: true };
		},
	};
}

function montarCaixa(message: Mensagem, options: Opcoes, theme: Theme) {
	const tipo = String(message.customType ?? "");
	const texto = textOf(message.content);
	const estado = classify(tipo, texto);
	const r = summarize(tipo, texto);
	const cor = { warn: "warning", err: "error", ok: "success" }[estado];
	const bold = theme.bold ?? ((s: string) => s);
	// Sem ícone de estado: o estado vai por nome, na cor dele, após o título.
	const sep = ` ${theme.fg("dim", "·")} `;
	const nomeEstado = tipo === FIM ? "" : `${sep}${estadoNome(estado, theme, estado === "err" ? "falhou" : undefined)}`;
	const cabeca = `${theme.fg(cor, icon(tipo === SUB ? "swap" : tipo === FIM ? "run" : "hook"))}${iconGap()}${theme.fg("toolTitle", bold(tipo === GATE ? "gate" : tipo === SUB ? "subagente" : tipo === FIM ? "run" : "hook"))}${nomeEstado}${r.alvo ? `${sep}${theme.fg("muted", r.alvo)}` : ""}`;
	const dicaCor = r.detalhe.length
		? dicaTecla(theme, options.keyText?.("app.tools.expand") || "ctrl+o", options.expanded ? "fecha" : "abre")
		: "";
	const naPrevia = !options.expanded && !!r.previa;
	const esquerda = cabeca + (r.quando ? theme.fg("dim", ` · ${r.quando}`) : "");
	const ts = Number(message.timestamp); // 0 ou ausente: sem hora
	const horaCor =
		ts > 0 ? theme.fg("dim", new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })) : "";
	return {
		render(w: number): string[] {
			try {
				return desenhar(w);
			} catch {
				return wrapTextWithAnsi(texto, Math.max(1, w)); // um erro de desenho não pode derrubar o nycode
			}
		},
		abre: r.detalhe.length > 0,
	};
	// Faixa âmbar (lab /gate; antes caixa com linha em branco acima e abaixo, padding lateral
	// e atalho e hora em pílulas): UMA linha no fundo do estado na largura inteira, `atalho · hora` à direita; prévia e
	// detalhe logo abaixo, sem fundo, recuados com │. Chegando agora, nasce do fundo em NASCE_MS (o histórico vem assentado).
	function desenhar(w: number): string[] {
		const bg = estadoBg(estado, theme);
		const open = bg("\u0000").split("\u0000")[0] ?? "";
		const direita = [dicaCor, horaCor].filter(Boolean).join(theme.fg("dim", " · "));
		const esq = ` ${esquerda}`;
		const rw = direita ? visibleWidth(direita) + 1 : 0;
		const e = truncateToWidth(esq, Math.max(1, rw ? w - rw - 2 : w), "…");
		const cabeca = rw && visibleWidth(e) + 2 + rw <= w ? `${e + " ".repeat(w - visibleWidth(e) - rw) + direita} ` : e;
		const faixa = bg(
			truncateToWidth(cabeca, w).replace(/\x1b\[(?:0|49)?m/g, (m) => m + open) +
				" ".repeat(Math.max(0, w - visibleWidth(cabeca))),
		);
		const rec = ` ${recuo()}`;
		const iw = Math.max(1, w - rec.length - 2);
		const corpo: string[] = [];
		if (naPrevia) corpo.push(`${theme.fg("muted", truncateToWidth(r.previa!, iw, "…"))}`);
		if (options.expanded)
			for (const d of r.detalhe) {
				const m = /^(.+?)( ×\d+ · .*)$/.exec(d);
				corpo.push(
					...wrapTextWithAnsi(m ? theme.fg(cor, m[1]!) + theme.fg("muted", m[2]!) : theme.fg("dim", d), iw),
				);
			}
		const rows = [
			faixa,
			...corpo.map((l) => {
				const x = truncateToWidth(`${rec}${theme.fg("dim", "│")} ${l}`, w);
				return x + " ".repeat(Math.max(0, w - visibleWidth(x)));
			}),
		];
		const idade = ts > 0 ? Date.now() - ts : Infinity;
		if (idade < 0 || idade >= NASCE_MS || !anima()) return rows;
		const t = theme as Theme & { getBgAnsi?: (c: string) => string; getFgAnsi?: (c: string) => string };
		const f = safeAnsi(() => t.getBgAnsi?.("customMessageBg")),
			x = safeAnsi(() => t.getFgAnsi?.("text"));
		// ponytail: sem invalidate no renderer de mensagem; a animação anda com os desenhos do turno que o aviso abre.
		return f && x ? rows.map((l) => esmaecer(l, 1 - (1 - idade / NASCE_MS) ** 3, f, x)) : rows;
	}
}

const NASCE_MS = 450;

export default function (nycode: ExtensionAPI) {
	for (const tipo of TIPOS) nycode.registerMessageRenderer?.(tipo, render as never); // sem a API fica a caixa padrão do nycode
}
