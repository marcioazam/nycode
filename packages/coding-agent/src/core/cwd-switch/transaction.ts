// Header transaction of /cd: rewrites the first line (header) of the session file with the new cwd, keeping the rest byte
// for byte, and can undo it. A writer that still appends to the old inode loses nothing: its tail is reconciled.
import { randomBytes } from "node:crypto";
import {
	appendFileSync,
	closeSync,
	constants,
	existsSync,
	fchmodSync,
	fstatSync,
	fsyncSync,
	linkSync,
	openSync,
	readFileSync,
	readSync,
	renameSync,
	statSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { isAbsolute, resolve } from "node:path";

export const MAX_SESSION_BYTES = 512 * 1024 * 1024;

/** The slice of SessionManager the transaction touches (private fields read structurally). */
export interface CwdSessionManager {
	cwd: string;
	fileEntries: Array<{ type?: string; id?: string; cwd?: string }>;
	isPersisted(): boolean;
	getSessionFile(): string | undefined;
}

export interface CwdTransaction {
	previous: string;
	backup?: string;
	undo(): void;
	finish(): void;
}

const hex = () => randomBytes(4).toString("hex");
const fail = (msg: string): never => {
	throw new Error(msg);
};

function memoryShape(mgr: CwdSessionManager) {
	if (typeof mgr.cwd !== "string" || !Array.isArray(mgr.fileEntries))
		fail("formato interno do SessionManager desconhecido; /cd recusado");
	const header = mgr.fileEntries.find((e) => e?.type === "session");
	if (!header || typeof header.id !== "string") fail("sessão sem cabeçalho em memória; /cd recusado");
	return header as { id: string; cwd?: string };
}

function readExact(file: string) {
	const st = statSync(file);
	if (!st.isFile()) fail(`${file} não é arquivo regular`);
	if (st.size > MAX_SESSION_BYTES) fail(`sessão maior que ${MAX_SESSION_BYTES} bytes; /cd recusado`);
	return { st, bytes: readFileSync(file) };
}

/** Reads EXACTLY `len` bytes at `position` (read injectable in tests); a short read repeats, EOF before the end fails. */
export function readFully(
	fd: number,
	buf: Buffer,
	offset: number,
	len: number,
	position: number,
	read: typeof readSync = readSync,
): void {
	let got = 0;
	while (got < len) {
		const n = read(fd, buf, offset + got, len - got, position + got);
		if (!Number.isInteger(n) || n <= 0) fail(`EOF/leitura curta: ${got} de ${len} bytes; /cd não reconcilia`);
		got += n;
	}
}

/** Tail of the backup from `from`: size bounded BEFORE allocating; truncated, NUL or incomplete/non-JSON line = failure (backup kept). */
export function bakTail(bak: string, from: number): Buffer {
	const fd = openSync(bak, constants.O_RDONLY | constants.O_NOFOLLOW);
	try {
		const st = fstatSync(fd);
		if (!st.isFile()) fail(`backup ${bak} não é arquivo regular`);
		if (st.size > MAX_SESSION_BYTES || st.size - from > MAX_SESSION_BYTES)
			fail(`backup ${bak} maior que o limite ${MAX_SESSION_BYTES} bytes`);
		if (st.size < from) fail(`backup ${bak} menor (${st.size}) que o já lido (${from}): cauda inconsistente`);
		const buf = Buffer.alloc(st.size - from);
		readFully(fd, buf, 0, buf.length, from);
		if (buf.length) {
			if (buf.includes(0) || buf[buf.length - 1] !== 10)
				fail(`cauda de ${bak} malformada (NUL ou linha incompleta); backup retido`);
			for (const line of buf.toString("utf8").split("\n")) {
				if (!line) continue;
				try {
					JSON.parse(line);
				} catch {
					fail(`cauda de ${bak} com linha não-JSON; backup retido`);
				}
			}
		}
		return buf;
	} finally {
		closeSync(fd);
	}
}

/** Appends to the new file what a writer put in the old inode after our read; returns the new read offset. */
function reconcile(file: string, bak: string, from: number): number {
	const tail = bakTail(bak, from);
	if (tail.length) appendFileSync(file, tail);
	return from + tail.length;
}

/** Rewrites the first line (header) of the session file keeping the rest byte for byte. */
function rewriteHeaderOnDisk(file: string, id: string, cwd: string): { backup: string; reconciled: number } {
	const { st, bytes } = readExact(file);
	const nl = bytes.indexOf(10);
	const end = nl < 0 ? bytes.length : nl;
	let header: { type?: string; id?: string };
	try {
		header = JSON.parse(bytes.subarray(0, end).toString("utf8"));
	} catch {
		return fail(`cabeçalho de ${file} não é JSON; /cd recusado`);
	}
	if (!header || header.type !== "session" || typeof header.id !== "string")
		fail(`1ª linha de ${file} não é um cabeçalho de sessão; /cd recusado`);
	if (header.id !== id) fail(`id do arquivo (${header.id}) difere da sessão aberta (${id}); /cd recusado`);
	const out = Buffer.concat([Buffer.from(JSON.stringify({ ...header, cwd })), bytes.subarray(end)]);
	const tag = hex();
	const tmp = `${file}.cwd-${tag}.tmp`;
	const bak = `${file}.cwd-bak-${tag}`;
	let fd: number | undefined;
	let linked = false;
	try {
		fd = openSync(tmp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, st.mode & 0o777);
		fchmodSync(fd, st.mode & 0o777);
		writeFileSync(fd, out);
		fsyncSync(fd);
		closeSync(fd);
		fd = undefined;
		linkSync(file, bak); // old inode: detects and recovers concurrent appends
		linked = true;
		const now = statSync(file);
		if (now.ino !== st.ino || now.size !== bytes.length || now.mtimeMs !== st.mtimeMs)
			fail(`${file} mudou durante a transação; /cd abortado sem gravar`);
		renameSync(tmp, file);
	} catch (err) {
		if (fd !== undefined) closeSync(fd);
		for (const p of [tmp, ...(linked ? [bak] : [])]) {
			try {
				unlinkSync(p);
			} catch {
				// already gone
			}
		}
		throw err;
	}
	// After the rename the file HAS changed: a failed re-append cannot become "aborted without writing". The backup stays and finish() retries.
	let reconciled = bytes.length;
	try {
		reconciled = reconcile(file, bak, bytes.length);
	} catch {
		// pending tail: backup kept
	}
	return { backup: bak, reconciled };
}

const unlinkQuiet = (p: string) => {
	try {
		unlinkSync(p);
	} catch {
		// already gone
	}
};

/** Changes the session cwd (header on disk + memory). */
export function setCwdTransaction(mgr: CwdSessionManager, newCwd: string): CwdTransaction {
	const header = memoryShape(mgr);
	if (typeof newCwd !== "string" || !isAbsolute(newCwd) || /[\0\n\r]/.test(newCwd))
		fail("cwd precisa ser caminho absoluto sem controles");
	const cwd = resolve(newCwd);
	const previous = mgr.cwd;
	const previousHeaderCwd = header.cwd;
	const setMemory = (c: string, h: string | undefined) => {
		mgr.cwd = c;
		header.cwd = h;
	};
	const file = mgr.isPersisted() ? mgr.getSessionFile() : undefined;
	if (!file) {
		setMemory(cwd, cwd);
		return { previous, undo: () => setMemory(previous, previousHeaderCwd), finish() {} };
	}
	if (existsSync(file)) {
		const done = rewriteHeaderOnDisk(file, header.id, cwd);
		setMemory(cwd, cwd);
		let reconciled = done.reconciled;
		return {
			previous,
			backup: done.backup,
			undo() {
				// Before rewriting: what a writer still put in the old inode must not be lost; on failure the backup stays.
				reconciled = reconcile(file, done.backup, reconciled);
				const back = rewriteHeaderOnDisk(file, header.id, previousHeaderCwd ?? previous);
				setMemory(previous, previousHeaderCwd);
				unlinkQuiet(done.backup);
				unlinkQuiet(back.backup);
			},
			finish() {
				reconciled = reconcile(file, done.backup, reconciled);
				unlinkQuiet(done.backup);
			},
		};
	}
	// Session without a file yet: materialise it with the new cwd (wx: a collision refuses). If undone, remove only what we created.
	const entries = mgr.fileEntries.map((e) => (e === header ? { ...e, cwd } : e));
	const text = entries.map((e) => `${JSON.stringify(e)}\n`).join("");
	const fd = openSync(file, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
	try {
		writeFileSync(fd, text);
		fsyncSync(fd);
	} catch (err) {
		closeSync(fd);
		unlinkQuiet(file);
		throw err;
	}
	closeSync(fd);
	setMemory(cwd, cwd);
	return {
		previous,
		undo() {
			if (existsSync(file) && readFileSync(file, "utf8") === text) unlinkSync(file);
			setMemory(previous, previousHeaderCwd);
		},
		finish() {},
	};
}
