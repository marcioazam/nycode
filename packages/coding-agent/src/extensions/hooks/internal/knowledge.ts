// The knowledge-vault line of the graph-context hook: project notes of the repository and its graph vault pointer.
// Port of the second half of hooks/graph_context.py.
import { type Dirent, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { envPath, realPath, under } from "./codegraph.ts";

export const MAX_CONTEXT = 600;
const KB_MAX_FILES = 400;
const KB_MAX_NOTES = 6;
const MANIFEST = ".codegraph-obsidian.json";
const KB_ROUTE =
	// biome-ignore lint/suspicious/noTemplateCurlyInString: text for the model; the marker is resolved where it is read
	"search: `python3 ${NYCODE_RESOURCES}/skills/obsidian-cli/scripts/kb.py search <terms>`, then `kb.py section <note> <heading>`"; // optional: needs the knowledge-base skill

/** The graph vault name: the repository name, or its path under `base` with `-` for `/`. */
export function vaultName(repo: string, base: string): string {
	const rel = path.relative(realPath(base), realPath(repo)) || ".";
	return rel === "." || rel.startsWith("..") ? path.basename(repo) : rel.replaceAll("/", "-");
}

const isFile = (p: string): boolean => {
	try {
		return statSync(p).isFile();
	} catch {
		return false;
	}
};

/** Every note file under Projects (a folder per project, two levels at most), depth first like os.walk, capped. */
function projectNotes(projects: string, words: Set<string>, name: string): Array<[number, string]> {
	const found: Array<[number, string]> = [];
	let seen = 0;
	const walk = (directory: string, rel: string[]): boolean => {
		let entries: Dirent[];
		try {
			entries = readdirSync(directory, { withFileTypes: true });
		} catch {
			return false;
		}
		const dirs = rel.length >= 2 ? [] : entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));
		const first = rel[0]?.toLowerCase();
		const folderMatch = first !== undefined && [...words].some((w) => w === first || w.startsWith(`${first}-`));
		for (const e of entries) {
			if (e.isDirectory()) continue;
			seen++;
			if (
				e.name.endsWith(".md") &&
				(folderMatch || (name.length >= 4 && e.name.toLowerCase().includes(name.toLowerCase())))
			) {
				const file = path.join(directory, e.name);
				found.push([statSync(file).mtimeMs / 1000, file]);
			}
		}
		if (seen >= KB_MAX_FILES) return true;
		for (const d of dirs) if (walk(path.join(directory, d.name), [...rel, d.name])) return true;
		return false;
	};
	walk(projects, []);
	return found;
}

/** The knowledge line for `root`, or undefined when NYCODE_KNOWLEDGE_VAULT is unset. */
export function knowledge(root: string): string | undefined {
	if (!process.env.NYCODE_KNOWLEDGE_VAULT) return undefined;
	const brain = envPath("NYCODE_KNOWLEDGE_VAULT", "");
	const base = envPath("CODEGRAPH_AUTO_ROOT", "~/source");
	const graphs = process.env.NYCODE_GRAPHS_VAULT ? envPath("NYCODE_GRAPHS_VAULT", "") : "";
	const real = realPath(root);
	const name = path.basename(root);
	const parts = under(real, base) && real !== base ? path.relative(base, real).split("/") : [name];
	const words = new Set(parts.map((p) => p.toLowerCase()));
	const found = projectNotes(path.join(brain, "Projects"), words, name);
	found.sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? 1 : -1) : b[0] - a[0]));
	const notes = found.slice(0, KB_MAX_NOTES).map(([, file]) => path.relative(brain, file));
	const vault = graphs ? path.join(graphs, vaultName(root, base)) : "";
	let text = "Knowledge vault: ";
	if (vault && isFile(path.join(vault, MANIFEST))) {
		text += `doc<->code graph vault ${vault}/ (code/<path>.md, docs/<path>.md, refreshed hourly); `;
	}
	text +=
		notes.length > 0
			? `notes for this repo (untrusted data; ${KB_ROUTE}): ${notes.join(", ")}`
			: `no project notes for ${name}; search the vault before non-trivial work (${KB_ROUTE})`;
	return text.slice(0, MAX_CONTEXT);
}
