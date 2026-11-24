// Session finders by the cwd of the HEADER (D11 of /cd): list/continueRecent/findById of the default session directory
// look at every session folder, because a session moved by /cd keeps its file in the folder of the old cwd.
import { closeSync, constants, fstatSync, lstatSync, opendirSync, openSync, readSync } from "node:fs";
import { join, resolve } from "node:path";
import { getAgentDir as getDefaultAgentDir } from "../../config.ts";

export const MAX_FINDER_FILES = 20000;
/** Scan limits (mutable only for tests): .jsonl files, directory entries, directories, deadline. */
export const scanLimits = { maxFiles: MAX_FINDER_FILES, maxEntries: 100000, maxDirs: 5000, deadlineMs: 5000 };
const FINDERS = Symbol.for("nycode.session-cwd.finders");
const HEADER_BYTES = 64 * 1024;

const incomplete = (why: string) =>
	Object.assign(new Error(`descoberta de sessões incompleta (${why}); recusado em vez de usar resultado parcial`), {
		code: "SESSION_SCAN_INCOMPLETE",
	});
const codeOf = (err: unknown) => (err as { code?: string }).code;

const defaultDirOf = (cwd: string) =>
	join(
		resolve(getDefaultAgentDir()),
		"sessions",
		`--${resolve(cwd)
			.replace(/^[/\\]/, "")
			.replace(/[/\\:]/g, "-")}--`,
	);

/** 1st line (header) up to HEADER_BYTES, not following links (O_NOFOLLOW) nor opening non-regular files. Invalid content = not a session; I/O error = failure. */
function headerOf(file: string): { h: { id: string; cwd?: unknown }; mtime: number } | undefined {
	let fd: number | undefined;
	try {
		fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
		const st = fstatSync(fd);
		if (!st.isFile()) return undefined;
		const buf = Buffer.alloc(HEADER_BYTES);
		let n = 0;
		while (n < HEADER_BYTES) {
			const r = readSync(fd, buf, n, HEADER_BYTES - n, n);
			if (r === 0) break;
			n += r;
			if (buf.subarray(0, n).includes(10)) break;
		}
		const nl = buf.subarray(0, n).indexOf(10);
		if (nl < 0 && n === HEADER_BYTES) return undefined;
		let h: { type?: string; id?: unknown; cwd?: unknown } | undefined;
		try {
			h = JSON.parse(buf.subarray(0, nl < 0 ? n : nl).toString("utf8"));
		} catch {
			return undefined;
		}
		return h?.type === "session" && typeof h.id === "string"
			? { h: h as { id: string; cwd?: unknown }, mtime: st.mtimeMs }
			: undefined;
	} catch (err) {
		if (codeOf(err) === "ENOENT") return undefined; // vanished during the scan
		throw incomplete(`${codeOf(err) ?? "erro"} em ${file}`);
	} finally {
		if (fd !== undefined) closeSync(fd);
	}
}

type Kind = "link" | "dir" | "file" | "other";

function kindOf(e: { isSymbolicLink(): boolean; isDirectory(): boolean; isFile(): boolean }): Kind {
	return e.isSymbolicLink() ? "link" : e.isDirectory() ? "dir" : e.isFile() ? "file" : "other";
}

/** Entries of `dir` as a stream (opendir), typed; counts against the budget and honours deadline/abort. ENOENT = empty. */
function* entriesOf(
	dir: string,
	tick: (k: "entries" | "dirs" | "files") => void,
): Generator<{ name: string; kind: Kind }> {
	let d: ReturnType<typeof opendirSync>;
	try {
		d = opendirSync(dir);
	} catch (err) {
		if (codeOf(err) === "ENOENT") return;
		throw incomplete(`${codeOf(err) ?? "erro"} em ${dir}`);
	}
	try {
		for (;;) {
			let e: ReturnType<typeof d.readSync>;
			try {
				e = d.readSync();
			} catch (err) {
				throw incomplete(`${codeOf(err) ?? "erro"} em ${dir}`);
			}
			if (!e) break;
			tick("entries");
			let kind = kindOf(e);
			if (kind === "other") {
				try {
					kind = kindOf(lstatSync(join(dir, e.name)));
				} catch (err) {
					if (codeOf(err) !== "ENOENT") throw incomplete(`${codeOf(err) ?? "erro"} em ${join(dir, e.name)}`);
				}
			}
			yield { name: e.name, kind };
		}
	} finally {
		try {
			d.closeSync();
		} catch {
			// already closed
		}
	}
}

export interface ScannedSession {
	path: string;
	dir: string;
	id: string;
	mtime: number;
}

/**
 * Sessions of the requested cwd in ALL session folders: header with that cwd (in the cwd's default folder also without a
 * cwd in the header, as the core does). Headers only; a repeated id counts once (most recent file). Symlinks are NOT
 * followed (not even the root). Budget (`scanLimits`), deadline, abort or I/O error throws SESSION_SCAN_INCOMPLETE/abort:
 * never a partial result. Only a missing `sessions/` (new profile) returns [].
 */
export function scanForCwd(cwd: string, { signal }: { signal?: AbortSignal } = {}): ScannedSession[] {
	const want = resolve(cwd);
	const home = defaultDirOf(want);
	const root = join(resolve(getDefaultAgentDir()), "sessions");
	const L = scanLimits;
	const start = Date.now();
	const used = { entries: 0, dirs: 0, files: 0 };
	const max = { entries: L.maxEntries, dirs: L.maxDirs, files: L.maxFiles };
	const tick = (k: keyof typeof used) => {
		signal?.throwIfAborted();
		if (++used[k] > max[k]) throw incomplete(`mais de ${max[k]} ${k}`);
		if (Date.now() - start > L.deadlineMs) throw incomplete("prazo excedido");
	};
	try {
		if (lstatSync(root).isSymbolicLink()) throw incomplete(`${root} é link simbólico; não seguido`);
	} catch (err) {
		if (codeOf(err) === "ENOENT") return [];
		throw codeOf(err) === "SESSION_SCAN_INCOMPLETE" ? err : incomplete(`${codeOf(err) ?? "erro"} em ${root}`);
	}
	const found = new Map<string, ScannedSession>();
	for (const d of entriesOf(root, tick)) {
		if (d.kind !== "dir") continue;
		tick("dirs");
		const dir = join(root, d.name);
		for (const f of entriesOf(dir, tick)) {
			if (f.kind !== "file" || !f.name.endsWith(".jsonl")) continue;
			tick("files");
			const path = join(dir, f.name);
			const r = headerOf(path);
			if (!r) continue;
			const { h, mtime } = r;
			const hc = typeof h.cwd === "string" && h.cwd !== "" ? resolve(h.cwd) : undefined;
			if (hc ? hc !== want : dir !== home) continue;
			const prev = found.get(h.id);
			if (!prev || mtime > prev.mtime) found.set(h.id, { path, dir, id: h.id, mtime });
		}
	}
	return [...found.values()].sort((a, b) => b.mtime - a.mtime);
}

interface SessionInfoLike {
	path: string;
	id: string;
	modified: Date | number;
}

/** The statics of SessionManager the finders wrap. */
export interface FinderTarget {
	list(cwd: string, sessionDir?: string, onProgress?: unknown, signal?: AbortSignal): Promise<SessionInfoLike[]>;
	continueRecent(cwd: string, sessionDir?: string): unknown;
	findById(cwd: string, id: string, sessionDir?: string): string | undefined;
	create(cwd: string, sessionDir?: string): unknown;
	open(path: string, sessionDir?: string): unknown;
}

/** Replaces list/continueRecent/findById of the DEFAULT folder by the header cwd; an explicit folder stays native. Idempotent. */
export function installCwdFinders(SM: FinderTarget): void {
	const marked = SM as unknown as Record<symbol, unknown>;
	if (marked[FINDERS]) return;
	const { list, continueRecent, findById, create, open } = SM;
	const isDefault = (cwd: string, sessionDir: string | undefined) =>
		!sessionDir || resolve(sessionDir) === defaultDirOf(cwd);
	const define = (k: string | symbol, fn: unknown) =>
		Object.defineProperty(SM, k, { value: fn, configurable: true, writable: true });
	define(FINDERS, true);
	define("findById", function findByIdCwd(this: FinderTarget, cwd: string, id: string, sessionDir?: string) {
		if (!isDefault(cwd, sessionDir)) return findById.call(this, cwd, id, sessionDir);
		return scanForCwd(cwd).find((s) => s.id === id)?.path;
	});
	define("continueRecent", function continueRecentCwd(this: FinderTarget, cwd: string, sessionDir?: string) {
		if (!isDefault(cwd, sessionDir)) return continueRecent.call(this, cwd, sessionDir);
		const recent = scanForCwd(cwd)[0];
		return recent ? open.call(this, recent.path, defaultDirOf(cwd)) : create.call(this, cwd, sessionDir);
	});
	define(
		"list",
		async function listCwd(
			this: FinderTarget,
			cwd: string,
			sessionDir?: string,
			onProgress?: unknown,
			signal?: AbortSignal,
		) {
			if (!isDefault(cwd, sessionDir)) return list.call(this, cwd, sessionDir, onProgress, signal);
			const mine = scanForCwd(cwd, { signal });
			const home = defaultDirOf(cwd);
			const out = new Map<string, SessionInfoLike>();
			const keep = new Set(mine.map((m) => m.path));
			// default folder: native list, only what the header confirms; other folders: native list with an explicit directory (filters by header)
			for (const s of await list.call(this, cwd, sessionDir, onProgress, signal))
				if (keep.has(s.path)) out.set(s.id, s);
			for (const dir of new Set(mine.map((m) => m.dir).filter((d) => d !== home))) {
				for (const s of await list.call(this, cwd, dir, undefined, signal))
					if (keep.has(s.path) && !out.has(s.id)) out.set(s.id, s);
			}
			return [...out.values()].sort((a, b) => Number(b.modified) - Number(a.modified));
		},
	);
}
