/** Validação TOML sem dependência nova: tomllib da stdlib do Python (3.11+) via processo filho, sem shell, com timeout. */
import { spawnSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";

export type TomlParse = (text: string) => unknown;

const PY = "import sys,json,tomllib\nprint(json.dumps(tomllib.loads(sys.stdin.read()),default=str))";

/** Lança se python3/tomllib faltar ou o TOML for inválido; nunca devolve um parse parcial. */
export const pythonToml: TomlParse = (text) => {
	const r = spawnSync("python3", ["-c", PY], { input: text, encoding: "utf8", timeout: 5000, maxBuffer: 4 << 20 });
	if (r.error) throw new Error("python3 com tomllib indisponível para validar o TOML");
	if (r.status !== 0) throw new Error(`TOML inválido: ${(r.stderr ?? "").trim().split("\n").at(-1) ?? ""}`.trim());
	return JSON.parse(r.stdout);
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** Prova que `after` = `before` + exatamente a entrada `entry` ao fim de keyboard.bindings; lança caso contrário. */
export function assertOnlyAppended(before: unknown, after: unknown, entry: unknown): void {
	const a = structuredClone(before) as Obj;
	const b = structuredClone(after) as Obj;
	const kb = isObj(b.keyboard) ? b.keyboard : undefined;
	const list = kb && Array.isArray(kb.bindings) ? kb.bindings : undefined;
	if (!kb || !list || !isDeepStrictEqual(list.pop(), entry))
		throw new Error("a entrada não ficou no fim de keyboard.bindings");
	if (list.length === 0) delete kb.bindings;
	if (Object.keys(kb).length === 0) delete b.keyboard;
	if (!isDeepStrictEqual(a, b)) throw new Error("o TOML resultante difere do original além da entrada acrescentada");
}
