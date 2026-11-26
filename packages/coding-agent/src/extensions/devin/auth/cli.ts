// Locates and runs the local Devin CLI. Ported from an MIT-licensed Devin provider extension, see ../LICENSE.
import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Absolute candidate paths, in order. `DEVIN_CLI` (an absolute path to the `devin` binary) comes first. There is no
 * PATH lookup: a binary found through PATH would run with the user's credentials without being named anywhere.
 */
function candidateBins(env: NodeJS.ProcessEnv, home: string): string[] {
	const override = env.DEVIN_CLI;
	return [
		...(override && isAbsolute(override) ? [override] : []),
		join(home, ".local/bin/devin"),
		join(home, ".devin/bin/devin"),
		"/opt/homebrew/bin/devin",
		"/usr/local/bin/devin",
		"/Applications/Devin.app/Contents/Resources/app/extensions/windsurf/devin/bin/devin",
	];
}

/** Path of the Devin CLI binary, or null when none of the fixed candidates exists. */
export function findDevinBin(env: NodeJS.ProcessEnv = process.env, home: string = homedir()): string | null {
	return candidateBins(env, home).find((bin) => existsSync(bin)) ?? null;
}

export interface RunResult {
	stdout: string;
	stderr: string;
	code: number;
}

/** Runs the Devin CLI with fixed arguments (never through a shell). Throws when the binary is missing. */
export async function runDevin(
	args: string[],
	opts: { timeoutMs?: number; inheritStdio?: boolean } = {},
): Promise<RunResult> {
	const bin = findDevinBin();
	if (!bin) {
		throw new Error("Devin CLI not found. Install the Devin CLI, or set DEVIN_CLI to the absolute path of `devin`.");
	}

	if (opts.inheritStdio) {
		return await new Promise((resolve, reject) => {
			const child = spawn(bin, args, { stdio: "inherit" });
			child.on("error", reject);
			child.on("close", (code) => {
				resolve({ stdout: "", stderr: "", code: code ?? 1 });
			});
		});
	}

	try {
		const { stdout, stderr } = await execFileAsync(bin, args, {
			timeout: opts.timeoutMs ?? 30_000,
			maxBuffer: 8 * 1024 * 1024,
		});
		return { stdout, stderr, code: 0 };
	} catch (error) {
		const err = error as { stdout?: string; stderr?: string; code?: unknown };
		// execFile reports a non-zero exit as a numeric `code`; spawn failures and timeouts carry a string or none.
		if (typeof err.code === "number") return { stdout: err.stdout ?? "", stderr: err.stderr ?? "", code: err.code };
		throw error;
	}
}

/** Output of `devin version`, or null when unavailable. */
export async function devinVersion(): Promise<string | null> {
	try {
		const { stdout, code } = await runDevin(["version"], { timeoutMs: 8_000 });
		if (code !== 0) return null;
		return stdout.trim() || null;
	} catch {
		return null;
	}
}
