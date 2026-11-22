/** /doctor puro e só leitura: tudo o que é externo entra por `d`. Nunca grava, nunca corrige, nunca inclui segredos. */

export type Estado = "ok" | "aviso" | "erro";
export type Achado = { id: string; estado: Estado; titulo: string; detalhe?: string; correcao?: string };
type Fs = {
	existsSync(p: string): boolean;
	readFileSync(p: string, enc: "utf8"): string;
	statSync(p: string): { size: number };
	accessSync(p: string, mode?: number): void;
	readdirSync?(p: string): string[];
};
export type Entrada = {
	env: Record<string, string | undefined>;
	agentDir: string;
	exec(cmd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }>;
	fs: Fs;
	sessao?: { modelo?: string; temAuth?: boolean; erros: number; avisos: number; crashes: number };
};

const X_OK = 1;
const W_OK = 2;
const LIMITE_LOG = 20 * 1024 * 1024;
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const ach = (id: string, estado: Estado, titulo: string, detalhe?: string, correcao?: string): Achado => ({
	id,
	estado,
	titulo,
	detalhe,
	correcao,
});
type Json = Record<string, unknown>;
const json = (d: Entrada, p: string): Json | undefined =>
	d.fs.existsSync(p) ? (JSON.parse(String(d.fs.readFileSync(p, "utf8"))) as Json) : undefined;
const juntar = (...p: string[]) => p.join("/").replace(/\/+/g, "/");
const ehExec = (d: Entrada, p: string) => {
	try {
		d.fs.accessSync(p, X_OK);
		return true;
	} catch {
		return false;
	}
};

/** Caminho (com ~ e $HOME expandidos) ou nome resolvido no PATH; devolve o caminho achado e se é executável. */
function resolver(d: Entrada, cmd: string): { caminho: string; achou: boolean } {
	const home = d.env.HOME ?? "";
	const c = cmd.replace(/^~(?=\/|$)/, home).replace(/^\$\{?HOME\}?/, home);
	if (c.includes("/")) return { caminho: c, achou: d.fs.existsSync(c) && ehExec(d, c) };
	for (const dir of (d.env.PATH ?? "").split(":").filter(Boolean)) {
		const p = juntar(dir, c);
		if (d.fs.existsSync(p) && ehExec(d, p)) return { caminho: p, achou: true };
	}
	return { caminho: c, achou: false };
}
const primeiro = (s: string) =>
	s
		.trim()
		.split(/\s+/)[0]
		?.replace(/^["']|["']$/g, "") ?? "";
const pl = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const PATCH = "patch não reverte na árvore instalada";

/** Troca o diretório home por `~` quando ele aparece como caminho inteiro (não como prefixo de outro nome). */
export function abreviarHome(s: string | undefined, home: string | undefined): string | undefined {
	const h = (home ?? "").replace(/\/+$/, "");
	if (!s || !h) return s;
	return s.replace(new RegExp(`(^|[^\\w/.-])${h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=/|$|[^\\w.-])`, "g"), "$1~");
}

async function piDoctor(d: Entrada): Promise<Achado[]> {
	const script = juntar(d.agentDir, "claude-home/bin/doctor/nycode-doctor");
	if (!d.fs.existsSync(script)) return [ach("nycode-doctor", "aviso", "nycode-doctor não encontrado", script)];
	const r = await d.exec(script, []);
	const falhas = r.stdout
		.split("\n")
		.filter((l) => l.startsWith("FALHA  "))
		.map((l) => l.slice(7).trim());
	const patches = falhas.filter((f) => f.startsWith(`${PATCH}: `)).length;
	const motivo = `rode ${script} para ver o motivo${patches > 1 ? " de cada um" : ""}`;
	if (falhas.length)
		return falhas.map((f) =>
			ach(
				"nycode-doctor",
				"erro",
				`nycode-doctor: ${f}`,
				undefined,
				f.startsWith(`${PATCH}: `) ? motivo : `rode ${script} e corrija o item`,
			),
		);
	if (r.code !== 0)
		return [ach("nycode-doctor", "erro", `nycode-doctor saiu com código ${r.code}`, undefined, `rode ${script}`)];
	return [ach("nycode-doctor", "ok", "nycode-doctor sem falhas")];
}

function wrapper(d: Entrada): Achado[] {
	return d.env.NYCODE_DIAG_INBOX
		? [ach("wrapper", "ok", "nycode aberto pelo wrapper")]
		: [
				ach(
					"wrapper",
					"aviso",
					"nycode fora do wrapper (sem NYCODE_DIAG_INBOX)",
					undefined,
					"abra o nycode pelo ~/.local/bin/nycode",
				),
			];
}

function versao(d: Entrada, p: string): string | undefined {
	try {
		const v = json(d, p)?.version;
		return typeof v === "string" ? v : undefined;
	} catch {
		return undefined;
	}
}

function versoes(d: Entrada): Achado[] {
	let nycode = d.env.NYCODE_VERSION;
	if (!nycode) {
		const rel = juntar(d.agentDir, "install/releases");
		let nome: string | undefined;
		try {
			nome = String(d.fs.readFileSync(juntar(d.agentDir, "install/current-version"), "utf8")).trim();
		} catch {
			/* sem current-version */
		}
		if (!nome && d.fs.readdirSync)
			nome = [...d.fs.readdirSync(rel)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop();
		if (nome) nycode = versao(d, juntar(rel, nome, "node_modules/@nycode/coding-agent/package.json"));
	}
	const code = versao(d, juntar(d.agentDir, "npm/node_modules/nycode/package.json"));
	const node = d.env.NYCODE_DOCTOR_NODE ?? process.version;
	const titulo = `nycode ${nycode ?? "?"} · nycode ${code ?? "?"} · node ${node}`;
	return [
		nycode && code ? ach("versoes", "ok", titulo) : ach("versoes", "aviso", titulo, "versão não encontrada em disco"),
	];
}

function hooks(d: Entrada): Achado[] {
	const fontes = [juntar(d.agentDir, "settings.json"), juntar(d.agentDir, "claude-home/settings.json")];
	const out: Achado[] = [];
	let total = 0;
	for (const f of fontes) {
		let h: unknown;
		try {
			h = json(d, f)?.hooks;
		} catch {
			out.push(ach("hooks", "erro", `${f} ilegível (JSON inválido)`, undefined, "corrija o JSON de settings.json"));
			continue;
		}
		if (!h || typeof h !== "object") continue;
		for (const [evento, grupos] of Object.entries(h as Record<string, unknown>)) {
			for (const g of Array.isArray(grupos) ? grupos : []) {
				for (const x of Array.isArray(g?.hooks) ? g.hooks : []) {
					if (x?.type !== "command" || typeof x.command !== "string") continue;
					total++;
					const r = resolver(d, primeiro(x.command));
					if (!r.achou)
						out.push(
							ach(
								"hooks",
								"erro",
								`hook ${evento}: ${r.caminho} ausente ou não executável`,
								undefined,
								"corrija o comando em settings.json",
							),
						);
				}
			}
		}
	}
	return out.length ? out : total ? [ach("hooks", "ok", `${total} hooks com comando executável`)] : [];
}

function mcp(d: Entrada): Achado[] {
	const servers = json(d, juntar(d.agentDir, "mcp.json"))?.mcpServers;
	if (!servers || typeof servers !== "object") return [];
	const out: Achado[] = [];
	let n = 0;
	for (const [nome, s] of Object.entries(servers as Record<string, Json>)) {
		if (typeof s?.command !== "string") continue;
		if (resolver(d, primeiro(s.command)).achou) n++;
		else
			out.push(
				ach(
					`mcp:${nome}`,
					"aviso",
					`servidor MCP ${nome}: binário não encontrado`,
					undefined,
					"instale o binário ou ajuste mcp.json",
				),
			);
	}
	return [ach("mcp", "ok", `${n} servidores MCP com binário`), ...out];
}

function credencial(d: Entrada): Achado[] {
	const s = d.sessao;
	if (!s || s.temAuth === undefined) return [];
	const m = s.modelo ?? "modelo atual";
	return s.temAuth
		? [ach("credencial", "ok", `credencial presente para ${m}`)]
		: [ach("credencial", "erro", `sem credencial para ${m}`, undefined, "rode /login")];
}

function diag(d: Entrada): Achado[] {
	const dir = juntar(d.agentDir, "diag");
	const out: Achado[] = [];
	try {
		d.fs.accessSync(dir, W_OK);
		out.push(ach("diag", "ok", "diretório diag gravável"));
	} catch {
		return [
			ach(
				"diag",
				"erro",
				`diretório diag ausente ou sem escrita: ${dir}`,
				undefined,
				"crie o diretório com permissão de escrita",
			),
		];
	}
	for (const f of ["diag.jsonl", "traces.jsonl"]) {
		const p = juntar(dir, f);
		if (d.fs.existsSync(p) && d.fs.statSync(p).size > LIMITE_LOG)
			out.push(ach(`diag:${f}`, "aviso", `${f} acima de 20 MiB`, p, "apague ou rotacione o arquivo"));
	}
	return out;
}

/** Validação mínima de NYCODE_MODEL_LOCK (JSON + forma); o módulo da trava fica fora para o doctor continuar autocontido. */
function trava(d: Entrada): Achado[] {
	const bruto = d.env.NYCODE_MODEL_LOCK;
	if (!bruto?.trim()) return [];
	let j: Json | undefined;
	try {
		j = JSON.parse(bruto) as Json;
	} catch (e) {
		return [
			ach(
				"trava",
				"erro",
				"NYCODE_MODEL_LOCK não é JSON válido",
				msg(e).slice(0, 80),
				"corrija ou remova NYCODE_MODEL_LOCK",
			),
		];
	}
	const m = j?.models;
	const ok =
		j?.version === 1 &&
		m &&
		typeof m === "object" &&
		!Array.isArray(m) &&
		Object.values(m).every((v) => Array.isArray(v) && v.length > 0);
	if (!ok)
		return [
			ach(
				"trava",
				"erro",
				"NYCODE_MODEL_LOCK inválido: esperado {version:1, models:{modelo:[esforços]}}",
				undefined,
				"corrija ou remova NYCODE_MODEL_LOCK",
			),
		];
	return [ach("trava", "ok", "trava de modelos válida", Object.keys(m).join(", "))];
}

function otlp(d: Entrada): Achado[] {
	const v = d.env.OTEL_EXPORTER_OTLP_ENDPOINT;
	if (!v) return [ach("otlp", "ok", "exportação só local")];
	try {
		const u = new URL(v);
		if (u.protocol === "http:" || u.protocol === "https:")
			return [ach("otlp", "ok", `exportação OTLP para ${u.origin}`)];
	} catch {
		/* cai no erro */
	}
	return [
		ach(
			"otlp",
			"erro",
			"OTEL_EXPORTER_OTLP_ENDPOINT não é uma URL http/https válida",
			undefined,
			"use http(s)://host:porta",
		),
	];
}

function crashes(d: Entrada): Achado[] {
	const n = d.sessao?.crashes ?? 0;
	return n > 0
		? [
				ach(
					"crashes",
					"aviso",
					`${pl(n, "crash", "crashes")} nas últimas 24 h`,
					undefined,
					"veja os erros no /diagnostico",
				),
			]
		: [];
}

function sessao(d: Entrada): Achado[] {
	const s = d.sessao;
	if (!s || !(s.erros > 0 || s.avisos > 0)) return [];
	const partes = [
		s.erros > 0 ? pl(s.erros, "erro", "erros") : "",
		s.avisos > 0 ? pl(s.avisos, "aviso", "avisos") : "",
	].filter(Boolean);
	return [
		ach(
			"sessao",
			"aviso",
			`${partes.join(" e ")} nesta sessão`,
			undefined,
			"veja as abas erros e avisos do /diagnostico",
		),
	];
}

const CHECKS: [string, (d: Entrada) => Achado[] | Promise<Achado[]>][] = [
	["nycode-doctor", piDoctor],
	["wrapper", wrapper],
	["versoes", versoes],
	["hooks", hooks],
	["mcp", mcp],
	["credencial", credencial],
	["diag", diag],
	["trava", trava],
	["otlp", otlp],
	["crashes", crashes],
	["sessao", sessao],
];

/** Nunca lança: um check que falha vira um Achado `erro` com o id do check. */
export async function verificar(d: Entrada): Promise<Achado[]> {
	const out: Achado[] = [];
	for (const [id, fn] of CHECKS) {
		try {
			out.push(...(await fn(d)));
		} catch (e) {
			out.push(ach(id, "erro", `verificação ${id} falhou`, msg(e).slice(0, 200)));
		}
	}
	let home: string | undefined;
	try {
		home = d.env.HOME;
	} catch {
		/* env inválido: sem abreviação */
	}
	return out.map((a) => ({ ...a, detalhe: abreviarHome(a.detalhe, home), correcao: abreviarHome(a.correcao, home) }));
}

const ORDEM: Estado[] = ["erro", "aviso", "ok"];
/** Título do grupo quando o prefixo comum tem plural próprio; os demais usam `prefixo (n)`. */
const PLURAL: Record<string, (n: number) => string> = {
	[`nycode-doctor: ${PATCH}`]: (n) => `nycode-doctor: ${n} patches não revertem na árvore instalada`,
};

export type Bloco = { estado: Estado; titulo: string; linhas: string[]; correcao?: string };

/** Achados em blocos, erros primeiro. Vizinhos com o mesmo `id` e a mesma correção dividem uma correção só; se os
 * títulos têm o mesmo prefixo antes do último `: `, viram um título com contagem e uma linha por sufixo distinto. */
export function blocosDoctor(achados: Achado[]): Bloco[] {
	const out: Bloco[] = [];
	for (const e of ORDEM) {
		const l = achados.filter((x) => x.estado === e);
		for (let i = 0; i < l.length; ) {
			const a = l[i]!;
			let j = i + 1;
			if (a.correcao) while (j < l.length && l[j]!.id === a.id && l[j]!.correcao === a.correcao) j++;
			const g = l.slice(i, j);
			i = j;
			const corte = g.map((x) => x.titulo.lastIndexOf(": "));
			const prefixo = a.titulo.slice(0, Math.max(0, corte[0]!));
			if (g.length > 1 && corte.every((c, k) => c > 0 && g[k]!.titulo.slice(0, c) === prefixo)) {
				const linhas: string[] = [];
				const vistos = new Set<string>();
				g.forEach((x, k) => {
					const s = x.titulo.slice(corte[k]! + 2);
					if (!vistos.has(s)) linhas.push(s);
					vistos.add(s);
					if (x.detalhe) linhas.push(x.detalhe);
				});
				out.push({
					estado: e,
					titulo: PLURAL[prefixo]?.(vistos.size) ?? `${prefixo} (${vistos.size})`,
					linhas,
					correcao: a.correcao,
				});
			} else {
				g.forEach((x, k) => {
					out.push({
						estado: e,
						titulo: x.titulo,
						linhas: x.detalhe ? [x.detalhe] : [],
						correcao: k === g.length - 1 ? x.correcao : undefined,
					});
				});
			}
		}
	}
	return out;
}

export const contarDoctor = (achados: Achado[]): Record<Estado, number> => {
	const n: Record<Estado, number> = { erro: 0, aviso: 0, ok: 0 };
	for (const a of achados) n[a.estado]++;
	return n;
};

/** Partes do resumo na ordem da lista: erros, avisos, ok. */
export const partesResumo = (achados: Achado[]): Array<[Estado, string]> => {
	const n = contarDoctor(achados);
	return [
		["erro", pl(n.erro, "erro", "erros")],
		["aviso", pl(n.aviso, "aviso", "avisos")],
		["ok", `${n.ok} ok`],
	];
};

/** Saída de texto (modo sem UI): blocos e, no fim, o resumo `n erros · n avisos · n ok`. */
export function formatarDoctor(achados: Achado[], glifo: (estado: Estado) => string): string[] {
	const linhas: string[] = [];
	for (const b of blocosDoctor(achados)) {
		linhas.push(`${glifo(b.estado)} ${b.titulo}`);
		for (const l of b.linhas) linhas.push(`  ${l}`);
		if (b.correcao) linhas.push(`  → ${b.correcao}`);
	}
	linhas.push(
		partesResumo(achados)
			.map(([, t]) => t)
			.join(" · "),
	);
	return linhas;
}

export const codigoSaida = (achados: Achado[]): 0 | 1 => (achados.some((a) => a.estado === "erro") ? 1 : 0);
