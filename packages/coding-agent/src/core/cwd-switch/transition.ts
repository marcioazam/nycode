// /cd transition: same session, other cwd. The header is rewritten (transaction.ts), the runtime is rebuilt in the new
// cwd through switchSession, and any failure rolls the header and the runtime back to the old cwd.

import { statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { hasTrustRequiringProjectResources, ProjectTrustStore } from "../trust-manager.ts";
import { type CwdSessionManager, type CwdTransaction, setCwdTransaction } from "./transaction.ts";

/** Marker read by the `directory` extension: the transition exists in this core. */
export const MARK = Symbol.for("nycode.session-cwd");
(globalThis as Record<symbol, unknown>)[MARK] = { version: 1 };

export interface CwdInfo {
	ok: boolean;
	cwd?: string;
	reason?: string;
	trusted?: boolean;
	policy?: boolean;
}

export interface CwdSwitchOptions {
	piSessionCwd: { cwd: string };
	withSession?: (ctx: unknown, info?: CwdInfo) => unknown;
}

export type CwdSwitchResult = { cancelled: boolean; piSessionCwd?: CwdInfo };

/** True when `options` asks for a cwd transition (the extension passes `piSessionCwd` through switchSession). */
export function hasSessionCwd(options: unknown): options is CwdSwitchOptions {
	return (
		typeof options === "object" &&
		options !== null &&
		"piSessionCwd" in options &&
		Boolean((options as CwdSwitchOptions).piSessionCwd)
	);
}

/** The slice of InteractiveMode the transition uses (private fields read structurally). */
export interface TransitionHost {
	sessionManager: CwdSessionManager & { setCwd?: never };
	runtimeHost: {
		cwd: string;
		services: { agentDir: string; settingsManager?: { projectTrusted?: boolean; getDefaultProjectTrust?(): string } };
		switchSession(path: string, options: unknown): Promise<{ cancelled: boolean }>;
	};
	clearStatusIndicator?(): void;
	createProjectTrustContext(cwd: string): unknown;
	handleFatalRuntimeError(prefix: string, error: unknown): Promise<never>;
}

export const hooks = { argv: (): string[] => process.argv.slice(2) };
const approves = (argv: string[]) => argv.some((a) => a === "--approve" || a === "-a");

interface Pre {
	needs?: boolean;
	policy: boolean;
	refuse?: string;
}

/**
 * Native trust state of the new cwd, read BEFORE the switch. `refuse`: `--approve` (global override of the core) cannot
 * authorise a new scope that requires trust without a saved `true` decision. `needs`: the cwd has resources that require
 * trust. `policy`: project configs disabled by policy (`--no-approve/-na`, or `defaultProjectTrust: "never"` with no saved decision).
 */
function trustPre(host: TransitionHost, cwd: string): Pre {
	const argv = hooks.argv();
	const noApprove = argv.some((a) => a === "--no-approve" || a === "-na");
	const pre: Pre = { needs: undefined, policy: noApprove };
	pre.needs = Boolean(hasTrustRequiringProjectResources(cwd));
	const saved = pre.needs ? new ProjectTrustStore(host.runtimeHost.services.agentDir).get(cwd) : null;
	if (approves(argv) && !noApprove && pre.needs && saved !== true) {
		return {
			...pre,
			refuse:
				saved === false
					? "`--approve` do lançamento não vale para um diretório com decisão de confiança salva NEGADA; abra o nycode nesse diretório"
					: "`--approve` do lançamento não vale para um diretório novo com .nycode/ ou .agents/skills sem decisão de confiança salva; abra o nycode nesse diretório",
		};
	}
	if (
		!noApprove &&
		saved === null &&
		host.runtimeHost.services.settingsManager?.getDefaultProjectTrust?.() === "never"
	)
		pre.policy = true;
	return pre;
}

const refuse = (reason: string): CwdSwitchResult => ({ cancelled: true, piSessionCwd: { ok: false, reason } });
const msg = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Body of handleResumeSession when options.piSessionCwd = {cwd}: same session, other cwd. */
export async function sessionCwdTransition(
	host: TransitionHost,
	sessionPath: string,
	options: CwdSwitchOptions,
): Promise<CwdSwitchResult> {
	host.clearStatusIndicator?.();
	const rt = host.runtimeHost;
	const mgr = host.sessionManager;
	const target = options.piSessionCwd.cwd;
	let tx: CwdTransaction;
	let pre: Pre;
	// withSession receives (ctx, info): the old ctx is stale after the switch, so the notice to the user travels through here.
	const opts = (info: () => CwdInfo) => ({
		withSession: options.withSession && ((rctx: unknown) => options.withSession?.(rctx, info())),
		projectTrustContextFactory: (c: string) => host.createProjectTrustContext(c),
	});
	// Single rule of the success info (callback and final return); `pre` is only read when the callback runs, already assigned.
	const okInfo = (): CwdInfo => {
		const trusted = rt.services.settingsManager?.projectTrusted !== false;
		const info: CwdInfo = { ok: true, cwd: rt.cwd, trusted };
		return !trusted && pre.policy && pre.needs !== false ? { ...info, policy: true } : info;
	};
	try {
		if (typeof target !== "string" || !isAbsolute(target)) return refuse("cwd inválido");
		const file = mgr.getSessionFile();
		if (!file || resolve(sessionPath) !== resolve(file)) return refuse("só a sessão atual pode mudar de diretório");
		try {
			if (!statSync(target).isDirectory()) return refuse(`${target} não é um diretório`);
		} catch {
			return refuse(`${target} não existe`);
		}
		pre = trustPre(host, target);
		if (pre.refuse) return refuse(pre.refuse);
		tx = setCwdTransaction(mgr, target);
	} catch (err) {
		return refuse(`/cd abortado sem alterar a sessão: ${msg(err)}`);
	}
	// Undoes the header and rebinds the runtime to the old cwd (same session, original bytes). A failure in any step is a native fatal error.
	const rollback = async (reason: string): Promise<CwdSwitchResult> => {
		try {
			tx.undo();
		} catch (undoErr) {
			return host.handleFatalRuntimeError("Failed to roll back /cd", undoErr);
		}
		try {
			await rt.switchSession(
				sessionPath,
				opts(() => ({ ok: false, reason, cwd: tx.previous })),
			);
		} catch (recErr) {
			return host.handleFatalRuntimeError("Failed to resume session", recErr);
		}
		return refuse(reason);
	};
	let result: { cancelled: boolean };
	try {
		result = await rt.switchSession(sessionPath, opts(okInfo));
	} catch (err) {
		if (err instanceof Error && err.name === "MissingSessionCwdError") {
			// thrown before the teardown: old runtime intact
			try {
				tx.undo();
			} catch (undoErr) {
				return host.handleFatalRuntimeError("Failed to roll back /cd", undoErr);
			}
			return refuse(`falhou antes de trocar (${err.message}); cwd antigo mantido`);
		}
		return rollback(`falha ao criar o runtime em ${target} (${msg(err)}); voltou a ${tx.previous}`);
	}
	if (result.cancelled) {
		try {
			tx.undo();
		} catch (undoErr) {
			return host.handleFatalRuntimeError("Failed to roll back /cd", undoErr);
		}
		return refuse("cancelado por uma extensão (session_before_switch)");
	}
	// Trust observed AFTER (native state of the new runtime): not trusted + resources requiring trust + no policy = refusal.
	const trusted = rt.services.settingsManager?.projectTrusted !== false;
	if (!trusted && pre.needs !== false && !pre.policy) {
		return rollback(`confiança recusada para ${target}: /cd cancelado; sessão mantida em ${tx.previous}`);
	}
	// Reconciliation failed: the tail written in the old inode is NOT in the new file. No pretended success: native fatal error
	// (visible), backup kept and named for recovery (`mv`); never the transcript content.
	try {
		tx.finish();
	} catch (err) {
		const where = tx.backup ? ` Backup recuperável: ${tx.backup}` : "";
		return host.handleFatalRuntimeError(
			"Failed to reconcile /cd",
			new Error(`reconciliação do histórico falhou (${msg(err)}).${where}`, { cause: err }),
		);
	}
	return { cancelled: false, piSessionCwd: okInfo() };
}
