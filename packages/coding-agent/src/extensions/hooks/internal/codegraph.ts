// Git and codegraph probes of the graph-context hook: the nearest index, its freshness (cached while the database is
// unchanged) and the detached auto-init. Port of the first half of hooks/graph_context.py.
import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
	accessSync,
	chmodSync,
	closeSync,
	constants,
	mkdirSync,
	openSync,
	readFileSync,
	realpathSync,
	renameSync,
	statSync,
	unlinkSync,
	writeFileSync,
	writeSync,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const STATUS_LIMIT = 262_144;
const STATUS_TTL = 60;
const AUTO_MAX_FILES = 20_000;
const MARKER_TTL = 6 * 3600;
const INDEX_DB = path.join(".codegraph", "codegraph.db");

/** Python `os.path.realpath`: symlinks resolved when the path exists, the plain absolute path otherwise. */
export const realPath = (p: string): string => {
	try {
		return realpathSync(p);
	} catch {
		return path.resolve(p);
	}
};

export function under(child: string, root: string): boolean {
	const c = realPath(child);
	const r = realPath(root);
	return c === r || c.startsWith(`${r.replace(/\/+$/, "")}/`);
}

/** Output of `git -C cwd ...args` (trimmed), or undefined when git fails or passes its 2 s limit. */
export async function runGit(cwd: string, ...args: string[]): Promise<string | undefined> {
	const env = { ...process.env };
	for (const k of ["GIT_DIR", "GIT_WORK_TREE", "GIT_COMMON_DIR"]) delete env[k];
	try {
		const { stdout } = await execFileAsync("git", ["-C", cwd, ...args], { env, timeout: 2000, maxBuffer: 1 << 28 });
		return stdout.trim();
	} catch {
		return undefined;
	}
}

/** The main checkout of a worktree root, and whether `root` is such a worktree. */
export async function mainCheckout(root: string): Promise<[string, boolean]> {
	const common = await runGit(root, "rev-parse", "--path-format=absolute", "--git-common-dir");
	if (common && path.basename(common) === ".git") {
		const main = path.dirname(common);
		if (realPath(main) !== realPath(root)) return [main, true];
	}
	return [root, false];
}

const isFile = (p: string): boolean => {
	try {
		return statSync(p).isFile();
	} catch {
		return false;
	}
};

/** The nearest directory holding a codegraph index, walking from `start` up to `stop` (inclusive). */
export function findIndex(start: string, stop: string): string | undefined {
	let current = realPath(start);
	const stopPath = realPath(stop);
	for (;;) {
		if (isFile(path.join(current, INDEX_DB))) return current;
		if (current === stopPath || path.dirname(current) === current) return undefined;
		current = path.dirname(current);
	}
}

/** An environment path with `~` expanded and symlinks resolved. */
export function envPath(name: string, fallback: string): string {
	const value = process.env[name] || fallback;
	return realPath(value.startsWith("~") ? homedir() + value.slice(1) : value);
}

export function codegraphBin(): string | undefined {
	const override = process.env.CODEGRAPH_BIN;
	const candidates = override
		? [override]
		: (process.env.PATH ?? "").split(":").map((d) => path.join(d || ".", "codegraph"));
	for (const c of candidates) {
		try {
			accessSync(c, constants.X_OK);
			if (isFile(c)) return c;
		} catch {
			// not executable here
		}
	}
	return undefined;
}

const statusCacheFile = (indexRoot: string): string => {
	const base =
		process.env.CODEGRAPH_STATUS_CACHE ||
		path.join(process.env.XDG_RUNTIME_DIR || path.join(homedir(), ".cache"), "claude-graph-context");
	return path.join(base, `${createHash("sha1").update(indexRoot).digest("hex").slice(0, 16)}.json`);
};

/** Changes whenever an indexer or the watcher writes the database or its WAL. */
function indexStamp(indexRoot: string): number[] {
	const stamp: number[] = [];
	for (const name of ["codegraph.db", "codegraph.db-wal"]) {
		try {
			const info = statSync(path.join(indexRoot, ".codegraph", name), { bigint: true });
			stamp.push(Number(info.mtimeNs), Number(info.size));
		} catch {
			stamp.push(0, 0);
		}
	}
	return stamp;
}

type Status = Record<string, unknown>;

function cachedStatus(cache: string, stamp: number[], ttl: number): Status | undefined {
	try {
		const saved = JSON.parse(readFileSync(cache, "utf8")) as { stamp: number[]; at: number; status: unknown };
		const age = Date.now() / 1000 - saved.at;
		if (JSON.stringify(saved.stamp) === JSON.stringify(stamp) && age >= 0 && age < ttl) {
			return typeof saved.status === "object" && saved.status !== null ? (saved.status as Status) : undefined;
		}
	} catch {
		// no usable cache
	}
	return undefined;
}

function storeStatus(cache: string, stamp: number[], status: Status): void {
	try {
		mkdirSync(path.dirname(cache), { recursive: true, mode: 0o700 });
		const temporary = `${cache}.${process.pid}.tmp`;
		writeFileSync(temporary, JSON.stringify({ stamp, at: Date.now() / 1000, status }));
		chmodSync(temporary, 0o600);
		renameSync(temporary, cache);
	} catch {
		// a missing cache only costs the next call one status run
	}
}

/** `codegraph status --json` of an index, cached while its database is unchanged; undefined when it cannot be had. */
export async function indexStatus(indexRoot: string): Promise<Status | undefined> {
	const parsedTtl = Number.parseFloat(process.env.CODEGRAPH_STATUS_TTL ?? String(STATUS_TTL));
	const ttl = Number.isNaN(parsedTtl) ? STATUS_TTL : parsedTtl;
	const cache = statusCacheFile(indexRoot);
	const stamp = indexStamp(indexRoot);
	if (ttl > 0) {
		const hit = cachedStatus(cache, stamp, ttl);
		if (hit !== undefined) return hit;
	}
	const binary = codegraphBin();
	if (!binary) return undefined;
	let stdout: string;
	try {
		({ stdout } = await execFileAsync(binary, ["status", "--json", indexRoot], {
			timeout: 5000,
			maxBuffer: 1 << 28,
			env: { ...process.env, CODEGRAPH_TELEMETRY: "0" },
		}));
	} catch {
		return undefined;
	}
	let status: unknown;
	try {
		status = JSON.parse(stdout.slice(0, STATUS_LIMIT));
	} catch {
		return undefined;
	}
	if (ttl > 0 && typeof status === "object" && status !== null) storeStatus(cache, stamp, status as Status);
	return status as Status;
}

/** A main checkout under the auto root, outside dot directories, small enough to index unattended. */
export async function durable(root: string): Promise<boolean> {
	const base = envPath("CODEGRAPH_AUTO_ROOT", "~/source");
	const real = realPath(root);
	if (real === base || !under(real, base) || !isDir(path.join(real, ".git"))) return false;
	if (
		path
			.relative(base, real)
			.split("/")
			.some((part) => part.startsWith("."))
	)
		return false;
	const tracked = await runGit(real, "ls-files", "-z");
	const limit = Number(process.env.CODEGRAPH_AUTO_MAX_FILES) || AUTO_MAX_FILES;
	return tracked !== undefined && tracked.split("\0").length - 1 <= limit;
}

const isDir = (p: string): boolean => {
	try {
		return statSync(p).isDirectory();
	} catch {
		return false;
	}
};

/** Spawns a detached `codegraph init -y`: "started" or "running" with the log path, undefined without a CLI. */
export function startIndex(root: string): [string, string] | undefined {
	const binary = codegraphBin();
	if (!binary) return undefined;
	const state = envPath("CODEGRAPH_AUTO_STATE", "~/.cache/claude-codegraph-auto");
	mkdirSync(state, { recursive: true });
	const key = createHash("sha1").update(realPath(root)).digest("hex").slice(0, 16);
	const marker = path.join(state, `${key}.started`);
	const log = path.join(state, `${key}.log`);
	try {
		if (Date.now() / 1000 - statSync(marker).mtimeMs / 1000 < MARKER_TTL) return ["running", log];
		unlinkSync(marker);
	} catch {
		// no marker yet
	}
	let fd: number;
	try {
		fd = openSync(marker, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
	} catch {
		return ["running", log];
	}
	writeSync(fd, root);
	closeSync(fd);
	const out = openSync(log, "a");
	spawn(binary, ["init", "-y", root], {
		cwd: root,
		stdio: ["ignore", out, out],
		detached: true,
		env: { ...process.env, CODEGRAPH_TELEMETRY: "0" },
	}).unref();
	closeSync(out);
	return ["started", log];
}
