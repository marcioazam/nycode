/** /restart (alias /update): pede ao supervisor nativo do core (core/lifecycle/supervisor.ts) que relance o CLI na mesma sessão. */
import { existsSync, lstatSync, renameSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import type { ExtensionAPI, ExtensionCommandContext } from "../../../core/extensions/types.ts";
import { ELIGIBLE_ENV, MODE_ENV, OPTIN_ENV, parseMode, truthy } from "../permissions/modes.ts";

const BYPASS_ENV = "NYCODE_BYPASS_PERMISSIONS";

type Ctx = Pick<ExtensionCommandContext, "ui" | "isIdle" | "hasPendingMessages" | "sessionManager" | "shutdown">;
export interface RestartDeps {
	env?: Record<string, string | undefined>;
	ppid?: number;
	uid?: number | undefined;
	rename?: (from: string, to: string) => void;
	/** Argumentos do lançamento atual (padrão: process.argv sem node e script). */
	argv?: string[];
	/** nycode.getFlag: só devolve valor para flag registrada por extensão (string ou true). */
	getFlag?: (name: string) => boolean | string | undefined;
}
export type RestartResult = "requested" | "refused";

export interface PermissionState {
	mode: "default" | "acceptEdits";
	bypass: boolean;
	eligible: boolean;
	optin: boolean;
}
export interface RestartRequest {
	sessionFile: string;
	permission: PermissionState;
	argc: number;
	flagValues: number[];
}

/** Uma linha: sessão, estado de permissão VALIDADO (sem tokens/argumentos) e índices dos valores de flags de extensão. */
export function restartRequest(r: RestartRequest): string {
	const p = r.permission;
	return `{"v":2,"sessionFile":${JSON.stringify(r.sessionFile)},"permission":{"mode":"${p.mode}","bypass":${p.bypass ? 1 : 0},"eligible":${p.eligible ? 1 : 0},"optin":${p.optin ? 1 : 0}},"argc":${r.argc},"flagValues":[${r.flagValues.join(",")}]}\n`;
}

/** Estado atual. Bypass é independente do modo; bypassPermissions legado = default + bypass. plan não é restaurável: recusa, nunca vira default. */
export function permissionState(env: Record<string, string | undefined>): PermissionState | string {
	const parsed = parseMode(env[MODE_ENV]);
	if (!parsed.ok) return "modo de permissão ilegível";
	const legacy = "bypass" in parsed; // bypassPermissions legado = default + bypass
	const mode = legacy ? "default" : parsed.mode;
	if (mode === "plan")
		return "plan mode ativo: o reinício o perderia (o nycode nunca inicia em plan). Saia do plan mode antes de /restart; nada foi reiniciado.";
	if (env[ELIGIBLE_ENV] === undefined) return "elegibilidade de bypass desconhecida";
	const eligible = truthy(env[ELIGIBLE_ENV]);
	const optin = truthy(env[OPTIN_ENV]);
	const bypass = legacy || truthy(env[BYPASS_ENV]);
	if (bypass && !eligible && !optin) return "bypass sem elegibilidade nem opt-in";
	return { mode, bypass, eligible, optin };
}

/**
 * Índices (em argv) dos valores de flags de extensão com valor string, separados por espaço: o parser nativo do nycode consome
 * o próximo argumento que não começa com - nem @ (cli/args.js), e getFlag diz o tipo real. Inconsistência → mensagem (aborta).
 */
export function flagValueIndices(
	argv: string[],
	getFlag: (n: string) => boolean | string | undefined,
): number[] | string {
	const out: number[] = [];
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]!;
		if (a === "--") break;
		if (!a.startsWith("--") || a.includes("=")) continue;
		const v = getFlag(a.slice(2));
		if (typeof v !== "string") continue;
		const next = argv[i + 1];
		if (next === undefined || next.startsWith("-") || next.startsWith("@"))
			return `não consigo identificar o valor da flag ${a.slice(0, 40)}`;
		out.push(i + 1);
		i++;
	}
	return out;
}

const SAFE_PATH = /^\/[^"\\\u0000-\u001f]+$/;

export async function restartCommand(ctx: Ctx, args: string, d: RestartDeps = {}): Promise<RestartResult> {
	const refuse = (m: string): RestartResult => {
		ctx.ui.notify(m, "warning");
		return "refused";
	};
	if (args.trim()) return refuse("/restart e /update não aceitam argumentos.");
	const env = d.env ?? process.env;
	const wrapper = Number(env.NYCODE_RESTART_WRAPPER_PID);
	const req = env.NYCODE_RESTART_REQUEST_FILE;
	if (!Number.isInteger(wrapper) || wrapper <= 0 || !req) {
		return refuse(
			"/restart só funciona numa sessão interativa em terminal supervisionada pelo próprio nycode: este processo foi iniciado sem supervisor (sem terminal, modo -p/--mode, subagente ou sem diretório privado para o pedido). Abra o nycode num terminal; depois /restart funciona. Nada foi reiniciado.",
		);
	}
	if ((d.ppid ?? process.ppid) !== wrapper)
		return refuse(
			"/restart só vale no nycode iniciado diretamente pelo supervisor (este processo não é filho dele, ex.: subagente); nada foi reiniciado.",
		);
	if (!ctx.isIdle() || ctx.hasPendingMessages())
		return refuse(
			"Agente ocupado: aguarde terminar (ou interrompa com Esc) antes de /restart; nada foi interrompido.",
		);
	const session = ctx.sessionManager.getSessionFile();
	if (!session || !isAbsolute(session) || !SAFE_PATH.test(session) || !existsSync(session)) {
		return refuse("Sem arquivo de sessão gravado para retomar (sessão efêmera ou ainda vazia); nada foi reiniciado.");
	}
	const perm = permissionState(env);
	if (typeof perm === "string")
		return refuse(`/restart recusado: ${perm}${perm.endsWith(".") ? "" : "; nada foi reiniciado."}`);
	const argv = d.argv ?? process.argv.slice(2);
	const values = flagValueIndices(argv, d.getFlag ?? (() => undefined));
	if (typeof values === "string")
		return refuse(
			`/restart recusado: ${values}; reiniciar poderia perder flags ou reenviar o prompt inicial. Nada foi reiniciado.`,
		);
	const dir = dirname(req);
	const uid = "uid" in d ? d.uid : process.getuid?.();
	try {
		const st = lstatSync(dir);
		if (!st.isDirectory() || st.isSymbolicLink() || (uid !== undefined && st.uid !== uid) || (st.mode & 0o077) !== 0)
			throw new Error("diretório do pedido não é privado");
		const tmp = join(dir, `restart.${process.pid}.tmp`);
		writeFileSync(
			tmp,
			restartRequest({ sessionFile: session, permission: perm, argc: argv.length, flagValues: values }),
			{ mode: 0o600, flag: "w" },
		);
		(d.rename ?? renameSync)(tmp, req);
	} catch (e) {
		return refuse(`/restart falhou ao gravar o pedido: ${e instanceof Error ? e.message : e}; nada foi reiniciado.`);
	}
	ctx.ui.notify("Reiniciando o nycode e retomando esta sessão…", "info");
	ctx.shutdown();
	return "requested";
}

export function registerRestart(nycode: ExtensionAPI, d?: RestartDeps): void {
	for (const name of ["restart", "update"]) {
		nycode.registerCommand(name, {
			description: "Reinicia o nycode e retoma esta mesma sessão (aplica atualização já instalada; não baixa nada)",
			handler: async (args, ctx) =>
				void (await restartCommand(ctx, args, { getFlag: (n) => nycode.getFlag(n), ...d })),
		});
	}
}
