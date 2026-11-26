/** Constants, dependency shape and pure helpers of the diagnostic extension (index.ts wires them to the session). */
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type Entrada, SEVS, type Sev } from "./registro.ts";

export const SINK = Symbol.for("nycode:diag");
export const DOCTOR = Symbol.for("nycode:doctor");
export const MARCA = Symbol.for("nycode:diag-notify");
export const MARCA_FIO = Symbol.for("nycode:diag-fio");
/** Abre o modal; livre nos padrões do nycode 1.5.2, em claude-compat/shortcuts.ts e em EXT_ACTIONS (comandos/catalog.ts). */
export const ATALHO = "ctrl+e" as const; // antes alt+e; ctrl+e sai do fim de linha (fica End) em keybindings.json
export const RESERVA = 40; // colunas do rodapé que ficam para o resto da linha (modelo, esforço, pasta, custo)
export const MAX_LINHA = 2048;
export const DIA = 24 * 3600_000;
export const VIGIA_MS = 30_000; // intervalo da checagem de tool travada
export const SUBS: Array<[string, string]> = [
	["eventos", "abre na aba eventos"],
	["trace", "mostra o trace id desta sessão"],
	["limpar", "limpa a lista"],
];

export interface Deps {
	env?: Record<string, string | undefined>;
	agora?: () => number;
	dir?: string;
	console?: Pick<Console, "warn" | "error">;
	processo?: {
		on: (e: "uncaughtExceptionMonitor", f: (err: unknown) => void) => unknown;
		off: (e: "uncaughtExceptionMonitor", f: (err: unknown) => void) => unknown;
	};
	crashes?: string;
	agentDir?: string;
	versao?: string;
	fetch?: typeof fetch;
	exec?: (cmd: string, args: string[]) => Promise<{ code: number; stdout: string; stderr: string }>;
	log?: (linha: string) => void;
	colunas?: () => number;
	copiar?: (texto: string) => Promise<void>;
	timer?: { setInterval: (f: () => void, ms: number) => unknown; clearInterval: (h: unknown) => void };
}

export const execReal = (cmd: string, args: string[]) =>
	new Promise<{ code: number; stdout: string; stderr: string }>((res) =>
		execFile(
			cmd,
			args,
			{ timeout: 20_000, maxBuffer: 1 << 20, encoding: "utf8" },
			(err: (Error & { code?: unknown }) | null, stdout, stderr) =>
				res({
					code: err ? (typeof err.code === "number" ? err.code : 1) : 0,
					stdout: String(stdout ?? ""),
					stderr: String(stderr ?? ""),
				}),
		),
	);

export const escapar = (s: string) => s.replace(/\r/g, "").replace(/\t/g, "\\t").replace(/\n/g, "\\n");
export const cortar = (s: string, n: number) => (n <= 0 ? "" : s.slice(0, n));
export const eventoModelo = (m: { provider?: string; id?: string } | undefined) =>
	m?.provider && m?.id ? `${m.provider}/${m.id}` : "desconhecido";

export const primeiraLinha = (s: string) => s.split(/\r?\n/).find((l) => l.trim()) ?? "";
export const mensagem = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Valida o que chega pelo sink global; lixo vira undefined. */
export function entradaValida(x: unknown): Entrada | undefined {
	if (!x || typeof x !== "object") return undefined;
	const o = x as Record<string, unknown>;
	if (
		!SEVS.includes(o.sev as number) ||
		typeof o.fonte !== "string" ||
		!o.fonte ||
		typeof o.tipo !== "string" ||
		!o.tipo ||
		typeof o.msg !== "string" ||
		!o.msg
	)
		return undefined;
	return {
		sev: o.sev as Sev,
		fonte: o.fonte,
		tipo: o.tipo,
		msg: o.msg,
		detalhe: typeof o.detalhe === "string" ? o.detalhe : undefined,
		quieto: o.quieto === true,
	};
}

/** Nome do agente do filho: NYCODE_AGENT_HOOKS (agentes com hooks) ou o registro do fleet do nycode (`<dir>/<runId>.json`). */
export function nomeDoFilho(env: Record<string, string | undefined>): string | undefined {
	const valido = (a: unknown) => (typeof a === "string" && /^[\w.-]{1,40}$/.test(a) ? a : undefined);
	try {
		const a = valido(JSON.parse(env.NYCODE_AGENT_HOOKS ?? "").agent);
		if (a) return a;
	} catch {}
	try {
		const dir = env.NYCODE_FLEET_DIR;
		const id = env.NYCODE_FLEET_RUN_ID;
		if (!dir || !id || !/^[\w-]{1,40}$/.test(id)) return undefined;
		return valido(JSON.parse(readFileSync(join(dir, `${id}.json`), "utf8")).agent);
	} catch {
		return undefined;
	}
}

/** Runs `f` and swallows anything it throws: the diagnostics never change how the host fails. */
export const seguro =
	<A extends unknown[]>(f: (...a: A) => void) =>
	(...a: A) => {
		try {
			f(...a);
		} catch {}
	};

export type NotifyType = "info" | "warning" | "error";
export type NotifyFn = ((m: string, t?: NotifyType) => void) & { [MARCA]?: object; original?: NotifyFn };
/** Payload of the nycode:subagent channel (event bus data is unknown: read at the trust boundary). */
export type SubagenteEvento = {
	phase?: string;
	agentId?: unknown;
	agentType?: unknown;
	toolCallId?: unknown;
	planStep?: unknown;
	state?: unknown;
	exitCode?: unknown;
	partial?: unknown;
};
export type ParteTexto = { type?: string; text?: string };
