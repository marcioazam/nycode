/** /cd: análise do argumento, validação de destino e completação de Tab (docs/specs/claude-code-parity/directory.md D7/D8). */
import { opendirSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve, sep } from "node:path";
import { agentDir as defaultAgentDir } from "../commands/settings/store.ts";

export const MAX_SCAN = 2000; // entradas lidas por Tab (não recursivo)
export const MAX_ITEMS = 50;
const CONTROL = /[\u0000-\u001f\u007f]/;

/** Aspas simples/duplas e `\x` (inclui `\ `): o que o editor insere ao completar nomes com espaço. */
export function parseArg(raw: string): { ok: true; value: string } | { ok: false; error: string } {
	let out = "";
	let quote = "";
	const s = raw.trim();
	for (let i = 0; i < s.length; i++) {
		const c = s[i]!;
		if (c === "\\" && quote !== "'") {
			if (i + 1 >= s.length) return { ok: false, error: "barra invertida no fim do caminho" };
			out += s[++i];
		} else if (quote) {
			if (c === quote) quote = "";
			else out += c;
		} else if (c === '"' || c === "'") quote = c;
		else out += c;
	}
	if (quote) return { ok: false, error: "aspas sem fechar" };
	if (!out) return { ok: false, error: "informe um diretório" };
	if (CONTROL.test(out)) return { ok: false, error: "caminho com caracteres de controle" };
	return { ok: true, value: out };
}

export const escapePath = (name: string) => name.replace(/([\\ '"])/g, "\\$1");

const expand = (p: string, cwd: string, home: string) =>
	p === "~" ? home : p.startsWith("~/") ? join(home, p.slice(2)) : isAbsolute(p) ? p : resolve(cwd, p);
const safeReal = (p: string) => {
	try {
		return realpathSync(p);
	} catch {
		return p;
	}
};

function secret(real: string, home: string, agent: string): string | undefined {
	const bad = [
		join(home, ".ssh"),
		join(home, ".aws"),
		join(home, ".gnupg"),
		join(home, ".config", "gcloud"),
		join(home, ".kube"),
		agent,
	];
	return bad.find((b) => real === b || real.startsWith(b + sep));
}

export type Resolved = { ok: true; dir: string } | { ok: false; error: string };

/** Destino real (symlink resolvido) de um diretório existente; diretórios de segredos recusados. */
export function resolveTarget(raw: string, cwd: string, home = homedir(), agent = defaultAgentDir()): Resolved {
	const p = parseArg(raw);
	if (!p.ok) return p;
	let real: string;
	try {
		real = realpathSync(expand(p.value, cwd, home));
		if (!statSync(real).isDirectory()) return { ok: false, error: `${p.value} não é um diretório` };
	} catch {
		return { ok: false, error: `${p.value} não existe ou não é acessível` };
	}
	const hit = secret(real, safeReal(home), safeReal(agent));
	return hit ? { ok: false, error: `recusado: ${hit} guarda segredos/credenciais` } : { ok: true, dir: real };
}

export type Item = { value: string; label: string };

/** Subdiretórios do prefixo digitado: não recursivo, `MAX_SCAN` leituras, ocultos só com prefixo `.`, falha = null. */
export function completeDirs(prefix: string, cwd: string, home = homedir()): Item[] | null {
	const typed = parseArgLoose(prefix);
	const slash = typed.lastIndexOf("/");
	const dirPart = slash >= 0 ? typed.slice(0, slash + 1) : "";
	const namePart = typed.slice(slash + 1);
	const base = dirPart ? expand(dirPart === "~/" ? "~" : dirPart.replace(/\/+$/, "") || "/", cwd, home) : cwd;
	const items: Item[] = [];
	let dir: ReturnType<typeof opendirSync>;
	try {
		dir = opendirSync(base);
	} catch {
		return null;
	}
	try {
		for (let scanned = 0, e = dir.readSync(); e && scanned < MAX_SCAN; e = dir.readSync(), scanned++) {
			if (!e.name.startsWith(namePart) || (e.name.startsWith(".") && !namePart.startsWith("."))) continue;
			let isDir = e.isDirectory();
			if (!isDir && e.isSymbolicLink()) {
				try {
					isDir = statSync(join(base, e.name)).isDirectory();
				} catch {
					isDir = false;
				}
			}
			if (isDir) items.push({ value: `${escapePath(dirPart)}${escapePath(e.name)}/`, label: `${e.name}/` });
		}
	} catch {
		return null;
	} finally {
		dir.closeSync();
	}
	items.sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0)); // determinístico (sem ICU)
	return items.slice(0, MAX_ITEMS);
}

/** Como parseArg, mas tolerante ao argumento incompleto (aspas abertas, `\` no fim) enquanto o usuário digita. */
function parseArgLoose(s: string): string {
	let out = "";
	let quote = "";
	for (let i = 0; i < s.length; i++) {
		const c = s[i]!;
		if (c === "\\" && quote !== "'") {
			if (i + 1 < s.length) out += s[++i];
		} else if (quote) {
			if (c === quote) quote = "";
			else out += c;
		} else if (c === '"' || c === "'") quote = c;
		else out += c;
	}
	return out;
}
