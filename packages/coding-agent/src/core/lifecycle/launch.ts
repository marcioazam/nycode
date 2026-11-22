// Entry of the CLI: supervise first (no other module of the CLI is loaded in the supervisor), then run the CLI.

import { superviseIfInteractive } from "./supervisor.ts";

/** Marks the supervised child as the lifecycle root, so the watchdog of its parent link applies to it alone. */
export function markLifecycleRoot(env: NodeJS.ProcessEnv): void {
	if (env.NYCODE_RESTART_WRAPPER_PID === String(process.ppid)) env.NYCODE_LIFECYCLE_ROOT_PID = String(process.pid);
}

/** Supervises an interactive run, otherwise runs the CLI in this process. Not async: the entry has no top-level await. */
export function launch(args: string[]): void {
	superviseIfInteractive(args)
		.then(() => {
			markLifecycleRoot(process.env);
			// Lazy on purpose: a supervisor must not pay for the whole CLI (about 135 MB resident) it never runs.
			return import("../../cli/run.ts");
		})
		.then(({ runCli }) => runCli(args))
		.catch((error: unknown) => {
			console.error(error);
			process.exit(1);
		});
}
