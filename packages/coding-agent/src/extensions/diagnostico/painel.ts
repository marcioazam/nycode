/** Folha `/diagnostico` (onda 12, D16, variante A): régua padrão com as visões como controle segmentado, linhas
 * `❯ estado texto hora`, rodapé de teclas em cápsulas. Visões `problemas` (lista em cima, detalhe do item embaixo),
 * `eventos` e `saúde`; lista mais nova primeiro. */

import { matchesKey, truncateToWidth, visibleWidth, wrapTextWithAnsi } from "@nycode/tui";
import { rule, teclas } from "../folha/sheet.ts";
import { type Env, icon } from "../ui-visual/icons.ts";
import { type Achado, blocosDoctor, contarDoctor, partesResumo } from "./doctor.ts";
import { comandoCurto, type Span } from "./observabilidade/trilha.ts";
import { chave, humano, type Registro } from "./registro.ts";

interface ThemeLike {
	fg(c: string, s: string): string;
	bg(c: string, s: string): string;
	bold(s: string): string;
}
/** `eventos` e `saude` são opcionais: sem eles as abas `eventos` e `saúde` não aparecem. */
export interface Acoes {
	lista(): Registro[];
	silenciar(chave: string): void;
	reativar(chave: string): void;
	limpar(): void;
	caminhoLog: string;
	caminhoTrilha?: string; // padrão: traces.jsonl ao lado do registro
	eventos?(): Span[]; // mais novo primeiro
	resumo?(): { spans: number; erros: number; tokensEntrada: number; tokensSaida: number };
	saude?(): Achado[] | undefined; // undefined = /doctor ainda não rodou
	copiar?(texto: string): void; // sem ela a tecla `c` não existe
}

export type Aba = "problemas" | "eventos" | "saúde";
/** `[tecla, verbo]`: a tecla sai em `accent`, o verbo em `dim`. */
export type Dica = [string, string];
const DIV = "\u0000div"; // marca a divisória ├───┤ entre a lista e o detalhe
const hhmm = (t: number) => new Date(t).toTimeString().slice(0, 5);
const hhmmss = (t: number) => new Date(t).toTimeString().slice(0, 8);
const limpo = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, " ");
const pl = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const MAX_NIVEL = 3;
const LARG_ESTADO = 7; // `atenção`
const curto = (id: string, n: number) => (id.length > n ? `${id.slice(0, n)}…` : id);
/** Texto original do registro: mensagem e detalhe, sem repetir a mensagem que o detalhe já contém. */
export const textoBruto = (r: Registro): string =>
	!r.detalhe ? r.msg : r.detalhe.includes(r.msg) ? r.detalhe : `${r.msg}\n${r.detalhe}`;

/** Nome de exibição na lista de eventos; o nome OTel continua na exportação e na 1ª linha do detalhe. */
export const nomeExibido = (nome: string): string =>
	nome === "invoke_agent nycode"
		? "agente"
		: nome === "turn"
			? "turno"
			: nome === "input"
				? "entrada"
				: nome.startsWith("execute_tool ")
					? `tool ${nome.slice(13)}`
					: nome.startsWith("nycode.hook ")
						? `hook ${nome.slice("nycode.hook ".length)}`
						: nome;

const ehHook = (s: Span) => s.nome.startsWith("nycode.hook ");
/** Resultado de um hook pelos atributos, com as palavras da faixa: ok | bloqueou (2) | saiu N | timeout. */
function resultadoHook(s: Span): string | undefined {
	if (s.attrs["nycode.hook.timed_out"] === true) return "timeout";
	const c = s.attrs["nycode.hook.exit_code"];
	return typeof c !== "number" ? undefined : c === 0 ? "ok" : c === 2 ? "bloqueou (2)" : `saiu ${c}`;
}
const resultado = (s: Span): string =>
	(ehHook(s) ? resultadoHook(s) : s.erro) ?? (s.erro !== undefined ? "erro" : "ok");

/** Texto da linha: `hook Stop · bash · ok · 31 ms` (dos atributos) ou `nome · n ms · erro`; evento não tem duração. */
export function textoEvento(s: Span): string {
	if (ehHook(s)) {
		const ms = s.attrs["nycode.hook.duration_ms"];
		return [
			nomeExibido(s.nome),
			comandoCurto(s.attrs["nycode.hook.command"]),
			resultadoHook(s),
			typeof ms === "number" ? `${ms} ms` : "",
		]
			.filter(Boolean)
			.join(" · ");
	}
	return `${nomeExibido(s.nome)}${s.tipo === "span" ? ` · ${s.durMs ?? 0} ms` : ""}${s.erro !== undefined ? ` · ${s.erro}` : ""}`;
}

/** Lista exibida (mais novo primeiro): sem `nycode.hook Status` que saiu com 0, nível pelo pai presente na lista (teto 3),
 * vizinhos com o mesmo nome, comando e resultado numa linha só com `n` (`ids` = span ids do grupo, para a correlação). */
export function linhasEventos(spans: Span[]): Array<{ span: Span; nivel: number; n: number; ids: string[] }> {
	const visiveis = spans.filter(
		(s) => !(s.nome === "nycode.hook Status" && s.attrs["nycode.hook.exit_code"] === 0 && s.erro === undefined),
	);
	const porId = new Map(visiveis.map((s) => [s.spanId, s]));
	const nivel = (s: Span): number => {
		let n = 0;
		for (
			let p = s.parentId ? porId.get(s.parentId) : undefined;
			p && n < MAX_NIVEL;
			p = p.parentId ? porId.get(p.parentId) : undefined
		)
			n++;
		return n;
	};
	const out: Array<{ span: Span; nivel: number; n: number; ids: string[]; k: string }> = [];
	for (const s of visiveis) {
		const nv = nivel(s);
		const k = `${nv}|${nomeExibido(s.nome)}|${ehHook(s) ? comandoCurto(s.attrs["nycode.hook.command"]) : ""}|${resultado(s)}`;
		const ant = out.at(-1);
		if (ant?.k === k) {
			ant.n++;
			ant.ids.push(s.spanId);
		} else out.push({ span: s, nivel: nv, n: 1, ids: [s.spanId], k });
	}
	return out;
}

/** Dicas em linhas de até `width` colunas, quebrando só entre itens. */
export function quebrarDica(itens: Dica[], width: number): Dica[][] {
	const larg = (l: Dica[]) => visibleWidth(l.map(([k, v]) => `${k} ${v}`).join(" · "));
	const out: Dica[][] = [[]];
	for (const i of itens) {
		const atual = out.at(-1)!;
		if (atual.length && larg([...atual, i]) > width) out.push([i]);
		else atual.push(i);
	}
	return out;
}

export class PainelDiagnostico {
	aba: Aba;
	index = 0;
	aberto = false; // eventos: detalhe do evento aberto
	bruto = false; // problemas: detalhe no texto original
	info = false; // problemas: inclui as entradas informativas (sev 9)
	ajuda = false; // `?`: lista completa de teclas da visão
	private copiado = false;
	private nota: string | undefined; // aviso de uma renderização no lugar das dicas (salto sem destino)
	private topo = 0;
	private rol = 0; // linha do corpo do detalhe no topo da janela
	private pagina = 5;
	private pagLista = 5;
	private transborda = false; // o detalhe do problema não coube: pgup/pgdn rolam o detalhe
	private readonly theme: ThemeLike;
	private readonly acoes: Acoes;
	private readonly done: () => void;
	private readonly redraw: () => void;
	private readonly altura: () => number;
	private readonly env: Env;
	private readonly origem = new WeakMap<Registro, Span>();
	private readonly grupo = new WeakMap<Registro, string[]>(); // span ids da linha de evento

	/** `altura()` = total de linhas que o modal pode devolver (o @nycode/tui corta o que passar do maxHeight). */
	constructor(
		theme: ThemeLike,
		acoes: Acoes,
		done: () => void,
		redraw: () => void,
		altura: () => number = () => 16,
		abaInicial: Aba = "problemas",
		env: Env = process.env,
	) {
		this.theme = theme;
		this.acoes = acoes;
		this.done = done;
		this.redraw = redraw;
		this.altura = altura;
		this.aba = abaInicial;
		this.env = env;
	}

	private abas = (): Aba[] => [
		"problemas",
		...(this.acoes.eventos ? (["eventos"] as Aba[]) : []),
		...(this.acoes.saude ? (["saúde"] as Aba[]) : []),
	];

	/** Span visto como Registro para reaproveitar lista, janela e detalhe: sev 17 marca erro. */
	private deSpan(s: Span, nivel: number, n: number, ids: string[]): Registro {
		const fim = s.fim ?? s.inicio; // hora do fecho: a coluna fica monotônica (a lista está na ordem de fecho)
		const r: Registro = {
			ts: fim,
			ultimo: fim,
			sev: s.erro !== undefined ? 17 : 9,
			fonte: s.nome,
			tipo: s.tipo,
			msg: `${"  ".repeat(nivel)}${textoEvento(s)}`,
			n,
			visto: true,
			silencioso: false,
		};
		this.origem.set(r, s);
		this.grupo.set(r, ids);
		return r;
	}

	private eventos = (): Registro[] =>
		linhasEventos(this.acoes.eventos?.() ?? []).map((l) => this.deSpan(l.span, l.nivel, l.n, l.ids));
	private problemasDaLista = (): Registro[] => this.acoes.lista().filter((r) => r.sev >= (this.info ? 9 : 13));
	private itens = (): Registro[] =>
		this.aba === "saúde" ? [] : this.aba === "eventos" ? this.eventos() : this.problemasDaLista();
	/** Problemas (sev ≥ 13) cujo span_id está na linha de evento. */
	private correlatos = (ev: Registro): Registro[] => {
		const ids = this.grupo.get(ev) ?? [];
		return this.acoes.lista().filter((r) => r.sev >= 13 && r.spanId !== undefined && ids.includes(r.spanId));
	};

	handleInput(data: string): void {
		if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
			this.done();
			return;
		}
		const itens = this.itens();
		const atual = itens[this.index];
		const prob = this.aba === "problemas";
		const zerar = () => {
			this.index = 0;
			this.topo = 0;
			this.rol = 0;
			this.aberto = false;
		};
		const mover = (d: number) => {
			if (this.aba === "saúde" || this.aberto) this.rol = Math.max(0, this.rol + d);
			else {
				const i = Math.max(0, Math.min(itens.length - 1, this.index + d));
				if (i !== this.index) this.rol = 0;
				this.index = i;
			}
		};
		/** Em `problemas` a página rola o detalhe quando ele não coube; senão anda a lista. */
		const pagina = (d: number) => {
			if (prob && this.transborda) this.rol = Math.max(0, this.rol + d * this.pagina);
			else mover(d * (this.aba === "saúde" || this.aberto ? this.pagina : this.pagLista));
		};
		if (data === "?") {
			this.ajuda = !this.ajuda;
			this.redraw();
			return;
		}
		this.ajuda = false;
		this.copiado = false;
		this.nota = undefined;
		const volta = matchesKey(data, "shift+tab");
		if (volta || matchesKey(data, "tab")) {
			const abas = this.abas();
			this.aba = abas[(abas.indexOf(this.aba) + (volta ? abas.length - 1 : 1)) % abas.length]!;
			zerar();
		} else if (matchesKey(data, "up")) mover(-1);
		else if (matchesKey(data, "down")) mover(1);
		else if (matchesKey(data, "pageUp")) pagina(-1);
		else if (matchesKey(data, "pageDown")) pagina(1);
		else if (matchesKey(data, "enter")) {
			if (!atual) return;
			if (prob) this.bruto = !this.bruto;
			else this.aberto = !this.aberto;
			this.rol = 0;
		} else if (data === "p" && this.aba === "eventos") {
			// Do evento para o primeiro problema correlacionado.
			const alvo = atual ? this.correlatos(atual)[0] : undefined;
			if (!alvo) this.nota = "sem problema correlacionado";
			else {
				this.aba = "problemas";
				zerar();
				this.index = Math.max(0, this.problemasDaLista().indexOf(alvo));
			}
		} else if (!prob) return;
		else if (data === "e") {
			// Do problema para o evento da trilha com o mesmo span_id.
			if (!this.acoes.eventos) return;
			const i = atual?.spanId ? this.eventos().findIndex((x) => this.grupo.get(x)!.includes(atual.spanId!)) : -1;
			if (i < 0) this.nota = "sem evento correlacionado";
			else {
				this.aba = "eventos";
				zerar();
				this.index = i;
			}
		} else if (data === "t") {
			this.info = !this.info;
			zerar();
		} else if (data === "c") {
			if (!atual || !this.acoes.copiar) return;
			this.acoes.copiar(this.textoCopia(atual));
			this.copiado = true;
		} else if (data === "s") {
			if (!atual) return;
			if (atual.silencioso) this.acoes.reativar(chave(atual));
			else this.acoes.silenciar(chave(atual));
		} else if (data === "l") {
			this.acoes.limpar();
			zerar();
		} else return;
		this.redraw();
	}

	/** O que `c` copia: título humano, cabeçalho, texto original e ids inteiros. */
	private textoCopia(r: Registro): string {
		const h = humano(r);
		const ids = [
			h.requestId ? `request_id ${h.requestId}` : "",
			r.traceId ? `trace ${r.traceId}` : "",
			r.spanId ? `span ${r.spanId}` : "",
		].filter(Boolean);
		return [
			h.titulo,
			`${r.fonte} · ${h.tipo} · ${hhmmss(r.ultimo)} · ×${r.n}`,
			"",
			textoBruto(r),
			...(ids.length ? ["", ids.join(" · ")] : []),
		].join("\n");
	}

	private selecao = (s: string, width: number): string =>
		this.theme.bg("selectedBg", s + " ".repeat(Math.max(0, width - visibleWidth(s))));

	/** ` ❯ estado  texto … hora `: o estado é uma palavra de largura fixa (cor reforça, não carrega); entrada silenciada fica toda dim. */
	private fila(
		sel: boolean,
		width: number,
		estado: string,
		cor: string,
		texto: string,
		hora: string,
		dim: boolean,
	): string {
		const t = this.theme;
		const paint = (c: string, x: string) => t.fg(dim ? "dim" : c, x);
		const ini = ` ${sel ? t.fg("accent", "❯") : " "} `;
		const sobra = Math.max(1, width - visibleWidth(ini) - LARG_ESTADO - 1 - 1 - visibleWidth(hora) - 1);
		const txt = truncateToWidth(texto, sobra, "…");
		const corpo = `${ini}${paint(cor, estado.padEnd(LARG_ESTADO))} ${dim ? t.fg("dim", txt) : txt}${" ".repeat(Math.max(0, sobra - visibleWidth(txt)))} ${t.fg("dim", hora)} `;
		const f = truncateToWidth(corpo, width, "…");
		return sel ? this.selecao(f, width) : f;
	}

	private linhaProblema(r: Registro, sel: boolean, width: number): string {
		const [estado, cor] = r.sev >= 17 ? ["erro", "error"] : r.sev === 13 ? ["atenção", "warning"] : ["info", "dim"];
		const texto = limpo(humano(r).titulo) + (r.silencioso ? " (silenciado)" : "") + (r.n > 1 ? ` ×${r.n}` : "");
		return this.fila(sel, width, estado!, cor!, texto, hhmm(r.ultimo), r.silencioso);
	}

	private linhaEvento(r: Registro, sel: boolean, width: number): string {
		const erro = r.sev >= 17;
		return this.fila(
			sel,
			width,
			erro ? "erro" : "ok",
			erro ? "error" : "dim",
			limpo(r.msg) + (r.n > 1 ? `  ×${r.n}` : ""),
			hhmmss(r.ultimo),
			false,
		);
	}

	/** Detalhe do problema escolhido: `glifo fonte · tipo · HH:MM:SS`, corpo quebrado na largura, `→ correção`, ids em dim.
	 * Com `bruto`, o corpo é o texto original (mensagem + detalhe) e a correção some. */
	private detalheProblema(r: Registro, width: number): string[] {
		const t = this.theme;
		const h = humano(r);
		const larg = Math.max(1, width - 2);
		const quebra = (s: string) =>
			s
				.replace(/\r/g, "")
				.replace(/\t/g, "  ")
				.split("\n")
				.flatMap((l) => (l ? wrapTextWithAnsi(l, larg) : [""]));
		const out = [
			...quebra(`${limpo(r.fonte)} · ${limpo(h.tipo)} · ${hhmmss(r.ultimo)}`),
			"",
			...quebra(this.bruto ? textoBruto(r) : h.corpo),
		];
		const ids = [
			h.requestId ? `request_id ${curto(h.requestId, 12)}` : "",
			r.traceId ? `trace ${curto(r.traceId, 8)}` : "",
			r.spanId ? `span ${curto(r.spanId, 8)}` : "",
		].filter(Boolean);
		const correcao = this.bruto ? undefined : h.correcao;
		if (correcao || ids.length) out.push("");
		if (correcao)
			wrapTextWithAnsi(
				limpo(correcao).replace(/\/[a-z][\w-]*/g, (c) => t.fg("accent", c)),
				Math.max(1, larg - 2),
			).forEach((w, i) => {
				out.push(`${i ? " " : "→"} ${w}`);
			});
		if (ids.length) for (const w of wrapTextWithAnsi(ids.join(" · "), larg)) out.push(t.fg("dim", w));
		return out.map((l) => ` ${l}`);
	}

	/** Evento aberto: meta (fixa no topo) e atributos (roláveis), quebrados na largura com a barra │. */
	private detalheEvento(r: Registro, width: number): { meta: string[]; corpo: string[] } {
		const t = this.theme;
		const sp = this.origem.get(r);
		const np = this.correlatos(r).length;
		const meta = sp
			? `${sp.nome} · ${hhmmss(sp.fim ?? sp.inicio)}${sp.tipo === "span" ? ` · ${sp.durMs ?? 0} ms` : ""}${sp.erro !== undefined ? " · erro" : ""}${np ? ` · ${pl(np, "problema", "problemas")}` : ""}`
			: r.fonte;
		const corpo = (sp ? this.atributos(sp) : r.msg).replace(/\r/g, "").replace(/\t/g, "  ").split("\n");
		const larg = Math.max(1, width - 6);
		const barra = (l: string, dim: boolean) =>
			wrapTextWithAnsi(dim ? t.fg("dim", l) : l, larg).map((w) => `    ${t.fg("dim", "│")} ${w}`);
		return { meta: barra(meta, true), corpo: corpo.flatMap((l) => barra(l, false)) };
	}

	/** Atributos do span, um por linha; o valor de várias linhas (nycode.hook.stderr) segue indentado. */
	private atributos(s: Span): string {
		const l = Object.entries(s.attrs).map(([k, v]) => {
			const [a, ...b] = String(v).split("\n");
			return [`${k}: ${a}`, ...b.map((x) => `  ${x}`)].join("\n");
		});
		if (s.erro !== undefined) l.unshift(`erro: ${s.erro}`);
		return l.join("\n") || "(sem atributos)";
	}

	/** Janela rolável de `W` linhas sobre `corpo`; os marcadores … linhas acima/abaixo contam no orçamento. */
	private janela(corpo: string[], W: number, fitLine: (s: string) => string): string[] {
		const dim = (s: string) => this.theme.fg("dim", s);
		const n = corpo.length;
		this.pagina = Math.max(1, W - 2);
		if (n <= W) {
			this.rol = 0;
			return corpo.map(fitLine);
		}
		this.rol = Math.max(0, Math.min(this.rol, n - W + 1));
		const cap = W - (this.rol > 0 ? 1 : 0);
		const tam = Math.max(1, n - this.rol <= cap ? n - this.rol : cap - 1);
		const out: string[] = [];
		if (this.rol > 0) out.push(fitLine(dim(` … ${this.rol} linhas acima`)));
		for (const l of corpo.slice(this.rol, this.rol + tam)) out.push(fitLine(l));
		if (this.rol + tam < n) out.push(fitLine(dim(` … ${n - this.rol - tam} linhas abaixo`)));
		return out;
	}

	/** Visão saúde: resumo fixo na 1ª linha, depois os blocos do /doctor numa janela rolável. Quebra em `width - 4`;
	 * a continuação repete o recuo da linha que continua (título 3, detalhe e correção 4). */
	private saude(B: number, width: number, fitLine: (s: string) => string): string[] {
		const t = this.theme;
		const achados = this.acoes.saude?.();
		if (!achados) return [fitLine(t.fg("dim", " rode /doctor para verificar a saúde do harness"))];
		const cor = { ok: "success", aviso: "warning", erro: "error" } as const;
		const nome = { ok: "ok", aviso: "warn", erro: "err" } as const;
		const glifo = (e: Achado["estado"]) => t.fg(cor[e], icon(nome[e], this.env));
		const n = contarDoctor(achados);
		const resumo =
			n.erro + n.aviso === 0
				? ` ${glifo("ok")} ${pl(achados.length, "verificação", "verificações")}, nenhum problema`
				: ` ${partesResumo(achados)
						.map(([e, txt]) => `${glifo(e)} ${txt}`)
						.join(" · ")}`;
		const larg = Math.max(1, width - 4);
		const linhas: string[] = [];
		for (const b of blocosDoctor(achados)) {
			wrapTextWithAnsi(limpo(b.titulo), larg).forEach((w, i) => {
				linhas.push(i === 0 ? ` ${glifo(b.estado)} ${w}` : `   ${w}`);
			});
			for (const l of [...b.linhas, ...(b.correcao ? [`→ ${b.correcao}`] : [])])
				for (const w of wrapTextWithAnsi(limpo(l), larg)) linhas.push(t.fg("dim", `    ${w}`));
		}
		return [fitLine(resumo), ...this.janela(linhas, B - 1, fitLine)];
	}

	/** Lista com janela de `B` linhas; os marcadores … acima/abaixo contam no orçamento. */
	private lista(
		itens: Registro[],
		B: number,
		fitLine: (s: string) => string,
		linha: (r: Registro, sel: boolean) => string,
	): string[] {
		const dim = (s: string) => this.theme.fg("dim", s);
		const n = itens.length;
		const tam = (topo: number) => {
			const cap = B - (topo > 0 ? 1 : 0);
			return Math.max(1, n - topo <= cap ? n - topo : cap - 1);
		};
		this.topo = Math.max(0, Math.min(this.topo, n - 1));
		if (this.index < this.topo) this.topo = this.index;
		while (this.index >= this.topo + tam(this.topo)) this.topo++;
		while (this.topo > 0 && n - (this.topo - 1) <= B - (this.topo - 1 > 0 ? 1 : 0)) this.topo--;
		const fim = this.topo + tam(this.topo);
		this.pagLista = Math.max(1, fim - this.topo - 1);
		const out: string[] = [];
		if (this.topo > 0) out.push(fitLine(dim(` … ${this.topo} acima`)));
		for (let i = this.topo; i < fim; i++) out.push(linha(itens[i]!, i === this.index));
		if (fim < n) out.push(fitLine(dim(` … ${n - fim} abaixo`)));
		return out;
	}

	/** Evento escolhido + meta fixa + janela rolável dos atributos. */
	private aberta(r: Registro, B: number, width: number, fitLine: (s: string) => string): string[] {
		const { meta, corpo } = this.detalheEvento(r, width);
		const out = [
			this.linhaEvento(r, true, width),
			...meta.slice(0, Math.max(1, Math.floor((B - 1) / 2))).map(fitLine),
		];
		return [...out, ...this.janela(corpo, Math.max(1, B - out.length), fitLine)];
	}

	/** Visão problemas em `B` linhas: lista (pelo menos 3 itens quando há), divisória e detalhe do item escolhido. */
	private problemas(
		itens: Registro[],
		atual: Registro,
		B: number,
		width: number,
		fitLine: (s: string) => string,
	): string[] {
		const linha = (r: Registro, sel: boolean) => this.linhaProblema(r, sel, width);
		const det = this.detalheProblema(atual, width);
		const n = itens.length;
		const livre = B - 1; // sem a divisória
		if (livre < 2) {
			this.transborda = false;
			return this.lista(itens, Math.max(1, B), fitLine, linha);
		}
		const L = Math.max(1, Math.min(n, Math.max(Math.min(n, 3), livre - det.length), livre - 1));
		this.transborda = det.length > livre - L;
		return [...this.lista(itens, L, fitLine, linha), DIV, ...this.janela(det, livre - L, fitLine)];
	}

	private dicas = (l: Dica[]): string =>
		l.map(([k, v]) => `${this.theme.fg("accent", k)} ${this.theme.fg("dim", v)}`).join(this.theme.fg("dim", " · "));

	/** Controle segmentado das visões: a ativa em cápsula (e negrito, para o mono), as outras dim. Não cabendo, só a ativa. */
	private segmentado(abas: Aba[], width: number): string {
		const t = this.theme;
		const cap = (a: string) => {
			try {
				return t.bg("customMessageBg", t.bold(` ${a} `));
			} catch {
				return t.bold(`[${a}]`);
			}
		};
		const todas = abas.map((a) => (a === this.aba ? cap(a) : t.fg("dim", ` ${a} `))).join("");
		return visibleWidth(todas) + 20 <= width ? todas : cap(this.aba);
	}

	render(width: number): string[] {
		const t = this.theme;
		const dim = (s: string) => t.fg("dim", s);
		const iw = Math.max(1, width);
		const fitLine = (s: string) => {
			const c = truncateToWidth(s, iw, "…");
			return c + " ".repeat(Math.max(0, iw - visibleWidth(c)));
		};
		const H = Math.max(4, Math.floor(this.altura()));
		const itens = this.itens();
		this.index = Math.max(0, Math.min(itens.length - 1, this.index));
		const atual = itens[this.index];
		if (!atual) this.aberto = false;
		const prob = this.aba === "problemas";
		const abas = this.abas();

		// As teclas mais úteis primeiro: `teclas()` mostra as quatro primeiras e `? mais`; `?` abre a lista completa.
		const copiar: Dica[] = this.acoes.copiar ? [["c", this.copiado ? "copiado" : "copiar"]] : [];
		const outraVisao: Dica[] = abas.length > 1 ? [["tab", "visão"]] : [];
		let pares: Dica[];
		if (this.aba === "saúde") pares = [...outraVisao, ["↑↓", "rolar"], ["esc", "fechar"], ["pgup pgdn", "página"]];
		else if (this.aba === "eventos") {
			const p: Dica[] = atual && this.correlatos(atual).length ? [["p", "problema"]] : []; // só no evento que tem problema correlacionado
			pares = this.aberto
				? [["enter", "fechar detalhe"], ["↑↓", "rolar"], ["esc", "fechar"], ["pgup pgdn", "página"], ...p]
				: [["enter", "detalhe"], ...outraVisao, ["esc", "fechar"], ["↑↓", "escolher"], ...p];
		} else {
			pares = [
				["enter", this.bruto ? "resumo" : "json bruto"],
				...copiar,
				...outraVisao,
				["esc", "fechar"],
				["↑↓", "item"],
				...(this.acoes.eventos ? [["e", "evento"] as Dica] : []),
				["s", atual?.silencioso ? "reativar" : "silenciar"],
				["t", this.info ? "sem info" : "info"],
				["l", "limpar"],
			];
		}
		const pe = prob
			? []
			: wrapTextWithAnsi(
					this.aba === "saúde"
						? " /doctor verifica de novo"
						: ` trilha completa: ${this.acoes.caminhoTrilha ?? this.acoes.caminhoLog.replace(/[^/]*$/, "traces.jsonl")}`,
					iw,
				).map((l) => fitLine(dim(l)));
		const ajuda = this.ajuda ? quebrarDica(pares, Math.max(1, iw - 2)).map((g) => fitLine(` ${this.dicas(g)}`)) : [];
		const extras = [...(this.nota ? [fitLine(` ${t.fg("warning", this.nota)}`)] : []), ...pe, ...ajuda].slice(
			0,
			Math.max(0, H - 4),
		);
		const B = Math.max(1, H - 3 - extras.length);

		let corpo: string[];
		if (this.aba === "saúde") corpo = this.saude(B, iw, fitLine);
		else if (!atual)
			corpo = [
				fitLine(
					dim(
						this.aba === "eventos"
							? " Nenhum evento ainda"
							: this.info
								? " Nenhuma entrada nesta sessão"
								: " Nenhum erro ou aviso nesta sessão",
					),
				),
			];
		else if (prob) corpo = this.problemasComResumo(itens, atual, B, iw, fitLine);
		else if (this.aberto) corpo = this.aberta(atual, B, iw, fitLine);
		else if (this.acoes.resumo && B >= 3) {
			const r = this.acoes.resumo();
			const tokens =
				iw >= 60
					? `tokens ${r.tokensEntrada} entrada / ${r.tokensSaida} saída`
					: `tok ${r.tokensEntrada}/${r.tokensSaida}`;
			corpo = [
				fitLine(dim(` ${pl(r.spans, "evento", "eventos")} · ${r.erros} com erro · ${tokens}`)),
				...this.lista(itens, B - 1, fitLine, (x, sel) => this.linhaEvento(x, sel, iw)),
			];
		} else corpo = this.lista(itens, B, fitLine, (x, sel) => this.linhaEvento(x, sel, iw));

		const linha = (l: string) => (l === DIV ? rule(t, iw) : l);
		const rodape = ` ${teclas(t, pares, this.ajuda ? false : undefined)}`;
		const out = [
			rule(t, iw, "Diagnóstico", this.segmentado(abas, iw)),
			...corpo.slice(0, B).map(linha),
			...extras,
			fitLine(rodape),
			rule(t, iw),
		];
		return out.length > H ? [...out.slice(0, H - 1), out.at(-1)!] : out;
	}

	/** Visão problemas: uma linha com a contagem (a única vez que ela aparece) e depois lista + detalhe. */
	private problemasComResumo(
		itens: Registro[],
		atual: Registro,
		B: number,
		width: number,
		fitLine: (s: string) => string,
	): string[] {
		const t = this.theme;
		const todos = this.acoes.lista();
		const e = todos.filter((r) => r.sev >= 17).length;
		const a = todos.filter((r) => r.sev === 13).length;
		const partes = [
			e ? t.fg("error", `${icon("err", this.env)} ${pl(e, "erro", "erros")}`) : "",
			a ? t.fg("warning", `${icon("warn", this.env)} ${pl(a, "aviso", "avisos")}`) : "",
			this.info ? t.fg("dim", "com informativas") : "",
		].filter(Boolean);
		if (B < 3) return this.problemas(itens, atual, B, width, fitLine);
		return [fitLine(` ${partes.join(t.fg("dim", " · "))}`), ...this.problemas(itens, atual, B - 1, width, fitLine)];
	}

	invalidate(): void {}
}
