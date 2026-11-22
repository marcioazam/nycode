/** Morte do pai: se o supervisor (wrapper) some (SIGKILL), o nycode RAIZ se encerra sozinho em vez de ficar órfão gastando modelo pago. */
import type { ExtensionAPI } from "../../../core/extensions/types.ts";

export interface WatchdogDeps {
	env?: Record<string, string | undefined>;
	pid?: number;
	ppid?: () => number;
	/** Só existência (sinal 0); nunca mata nada. */
	alive?: (pid: number) => boolean;
	exit?: (code: number) => void;
	intervalMs?: number;
	graceMs?: number;
}

const isAlive = (pid: number): boolean => {
	try {
		process.kill(pid, 0);
		return true;
	} catch (e) {
		return (e as NodeJS.ErrnoException).code === "EPERM";
	}
};

/**
 * Ativa só no processo cujo PID é o NYCODE_LIFECYCLE_ROOT_PID escrito pelo supervisor (o filho exec'd, mesmo PID) e cujo
 * pai inicial é o wrapper: subagentes herdam as variáveis mas têm outro PID, então não ligam o vigia. Devolve o `stop`.
 */
export function startWatchdog(shutdown: () => void, d: WatchdogDeps = {}): (() => void) | undefined {
	const env = d.env ?? process.env;
	const wrapper = Number(env.NYCODE_RESTART_WRAPPER_PID);
	const root = Number(env.NYCODE_LIFECYCLE_ROOT_PID);
	const pid = d.pid ?? process.pid;
	const ppid = d.ppid ?? (() => process.ppid);
	if (!Number.isInteger(wrapper) || wrapper <= 1 || root !== pid || ppid() !== wrapper) return undefined;
	const alive = d.alive ?? isAlive;
	const exit = d.exit ?? ((c: number) => process.exit(c));
	let timer: ReturnType<typeof setInterval> | undefined;
	const stop = () => {
		if (timer) clearInterval(timer);
		timer = undefined;
	};
	timer = setInterval(() => {
		if (ppid() === wrapper && alive(wrapper)) return;
		stop();
		try {
			shutdown();
		} catch {
			/* o backstop abaixo encerra mesmo assim */
		}
		setTimeout(() => exit(1), d.graceMs ?? 10_000).unref();
	}, d.intervalMs ?? 1000);
	timer.unref();
	return stop;
}

export function registerWatchdog(nycode: ExtensionAPI, d?: WatchdogDeps): void {
	let stop: (() => void) | undefined;
	nycode.on("session_start", (_e, ctx) => {
		stop ??= startWatchdog(() => {
			try {
				ctx.abort();
			} finally {
				ctx.shutdown();
			}
		}, d);
	});
	nycode.on("session_shutdown", () => {
		stop?.();
		stop = undefined;
	});
}
