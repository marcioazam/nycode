import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { basename, dirname, join, resolve, sep } from "path";
import { CONFIG_DIR_NAME } from "../config.ts";
import { parseFrontmatter } from "../utils/frontmatter.ts";
import { resolvePath } from "../utils/paths.ts";
import type { ResourceDiagnostic } from "./diagnostics.ts";
import { createSyntheticSourceInfo, type SourceInfo } from "./source-info.ts";

/**
 * Represents a prompt template loaded from a markdown file
 */
export interface PromptTemplate {
	name: string;
	description: string;
	argumentHint?: string;
	content: string;
	sourceInfo: SourceInfo;
	filePath: string; // Absolute path to the template file
}

/**
 * Parse command arguments respecting quoted strings (bash-style)
 * Returns array of arguments
 */
export function parseCommandArgs(argsString: string): string[] {
	const args: string[] = [];
	let current = "";
	// Tracks whether a token has started, so quoted empty strings ("" or '') are kept as arguments
	let hasToken = false;
	let inQuote: string | null = null;
	// Where the open quote started, so an unclosed quote can be re-read as literal text
	let quoteStart = 0;

	for (let i = 0; i < argsString.length; i++) {
		const char = argsString[i];

		if (inQuote) {
			if (char === "\\" && argsString[i + 1] === inQuote) {
				// A backslash before the open quote's character keeps it as text: "say \"hi\"" gives say "hi"
				current += inQuote;
				i++;
			} else if (char === inQuote) {
				inQuote = null;
			} else {
				current += char;
			}
		} else if ((char === '"' || char === "'") && !hasToken) {
			// Quotes only open at the start of an argument, so apostrophes inside words stay literal
			inQuote = char;
			quoteStart = i;
			hasToken = true;
		} else if (/\s/.test(char)) {
			if (hasToken) {
				args.push(current);
				current = "";
				hasToken = false;
			}
		} else {
			current += char;
			hasToken = true;
		}

		if (inQuote && i === argsString.length - 1) {
			// Unclosed quote: keep the quote character as text and parse the rest normally
			// (current was empty when the quote opened, because quotes only open a new argument)
			inQuote = null;
			current = argsString[quoteStart];
			i = quoteStart;
		}
	}

	if (hasToken) {
		args.push(current);
	}

	return args;
}

/**
 * Substitute argument placeholders in template content
 * Supports:
 * - $1, $2, ... for positional args
 * - $@ and $ARGUMENTS for all args
 * - ${N:-default} for positional arg N with default when missing/empty
 * - ${@:-default} and ${ARGUMENTS:-default} for all args with a default when empty
 * - ${@:N} for args from Nth onwards (bash-style slicing)
 * - ${@:N:L} for L args starting from Nth
 *
 * Note: Replacement happens on the template string only. Argument and default values
 * containing patterns like $1, $@, or $ARGUMENTS are NOT recursively substituted.
 */
export function substituteArgs(content: string, args: string[]): string {
	const allArgs = args.join(" ");
	let result = "";
	let index = 0;
	while (index < content.length) {
		const substituted = content[index] === "$" ? substitutePlaceholder(content, index, args, allArgs) : undefined;
		if (substituted === undefined) {
			result += content[index] ?? "";
			index++;
			continue;
		}
		result += substituted.value;
		index = substituted.next;
	}
	return result;
}

/** One placeholder at `index`, which points at `$`. The three forms are tried in the old alternation order. */
function substitutePlaceholder(
	content: string,
	index: number,
	args: string[],
	allArgs: string,
): { value: string; next: number } | undefined {
	const withDefault = readDefaultPlaceholder(content, index);
	if (withDefault) {
		const value =
			withDefault.target === "@" || withDefault.target === "ARGUMENTS"
				? allArgs
				: args[parseInt(withDefault.target, 10) - 1];
		return { value: value ? value : withDefault.fallback, next: withDefault.next };
	}
	const slice = readSlicePlaceholder(content, index);
	if (slice) {
		let start = parseInt(slice.start, 10) - 1;
		if (start < 0) start = 0;
		const taken =
			slice.length === undefined ? args.slice(start) : args.slice(start, start + parseInt(slice.length, 10));
		return { value: taken.join(" "), next: slice.next };
	}
	const simple = readSimplePlaceholder(content, index);
	if (!simple) return undefined;
	if (simple.target === "ARGUMENTS" || simple.target === "@") return { value: allArgs, next: simple.next };
	return { value: args[parseInt(simple.target, 10) - 1] ?? "", next: simple.next };
}

function readDefaultPlaceholder(
	content: string,
	index: number,
): { target: string; fallback: string; next: number } | undefined {
	if (!content.startsWith("${", index)) return undefined;
	let cursor = index + 2;
	let target: string;
	if (content.startsWith("ARGUMENTS", cursor)) {
		target = "ARGUMENTS";
		cursor += "ARGUMENTS".length;
	} else if (content[cursor] === "@") {
		target = "@";
		cursor += 1;
	} else {
		const start = cursor;
		while (cursor < content.length && isDigit(content[cursor]!)) cursor++;
		if (cursor === start) return undefined;
		target = content.slice(start, cursor);
	}
	if (!content.startsWith(":-", cursor)) return undefined;
	const fallbackStart = cursor + 2;
	const end = content.indexOf("}", fallbackStart);
	if (end < 0) return undefined;
	return { target, fallback: content.slice(fallbackStart, end), next: end + 1 };
}

function readSlicePlaceholder(
	content: string,
	index: number,
): { start: string; length?: string; next: number } | undefined {
	if (!content.startsWith("${@:", index)) return undefined;
	let cursor = index + 4;
	const startAt = cursor;
	while (cursor < content.length && isDigit(content[cursor]!)) cursor++;
	if (cursor === startAt) return undefined;
	const start = content.slice(startAt, cursor);
	let length: string | undefined;
	if (content[cursor] === ":") {
		const lengthAt = cursor + 1;
		cursor = lengthAt;
		while (cursor < content.length && isDigit(content[cursor]!)) cursor++;
		if (cursor === lengthAt || content[cursor] !== "}") return undefined;
		length = content.slice(lengthAt, cursor);
	}
	if (content[cursor] !== "}") return undefined;
	return { start, length, next: cursor + 1 };
}

function readSimplePlaceholder(content: string, index: number): { target: string; next: number } | undefined {
	if (content.startsWith("$ARGUMENTS", index)) return { target: "ARGUMENTS", next: index + "$ARGUMENTS".length };
	if (content.startsWith("$@", index)) return { target: "@", next: index + 2 };
	let cursor = index + 1;
	const start = cursor;
	while (cursor < content.length && isDigit(content[cursor]!)) cursor++;
	if (cursor === start) return undefined;
	return { target: content.slice(start, cursor), next: cursor };
}

function isDigit(character: string): boolean {
	return character >= "0" && character <= "9";
}

function loadTemplateFromFile(
	filePath: string,
	sourceInfo: SourceInfo,
): { template: PromptTemplate | null; diagnostics: ResourceDiagnostic[] } {
	const diagnostics: ResourceDiagnostic[] = [];
	let rawContent: string;
	try {
		rawContent = readFileSync(filePath, "utf-8");
	} catch (error) {
		const message = error instanceof Error ? error.message : "failed to read prompt template file";
		diagnostics.push({ type: "warning", message, path: filePath });
		return { template: null, diagnostics };
	}

	let frontmatter: Record<string, unknown>;
	let body: string;
	try {
		({ frontmatter, body } = parseFrontmatter(rawContent));
	} catch (error) {
		const message = error instanceof Error ? error.message : "failed to parse prompt template file";
		diagnostics.push({ type: "warning", message, path: filePath });
		return { template: null, diagnostics };
	}

	const name = basename(filePath).replace(/\.md$/, "");

	// Get description from frontmatter or first non-empty line
	let description = typeof frontmatter.description === "string" ? frontmatter.description : "";
	if (!description) {
		const firstLine = body.split("\n").find((line) => line.trim());
		if (firstLine) {
			// Truncate if too long
			description = firstLine.slice(0, 60);
			if (firstLine.length > 60) description += "...";
		}
	}

	const argumentHint = typeof frontmatter["argument-hint"] === "string" ? frontmatter["argument-hint"] : undefined;
	return {
		template: {
			name,
			description,
			...(argumentHint && { argumentHint }),
			content: body,
			sourceInfo,
			filePath,
		},
		diagnostics,
	};
}

/**
 * Scan a directory for .md files (non-recursive) and load them as prompt templates.
 */
function loadTemplatesFromDir(dir: string, getSourceInfo: (filePath: string) => SourceInfo): LoadPromptTemplatesResult {
	const templates: PromptTemplate[] = [];
	const diagnostics: ResourceDiagnostic[] = [];

	if (!existsSync(dir)) {
		return { templates, diagnostics };
	}

	try {
		const entries = readdirSync(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(dir, entry.name);

			// For symlinks, check if they point to a file
			let isFile = entry.isFile();
			if (entry.isSymbolicLink()) {
				try {
					const stats = statSync(fullPath);
					isFile = stats.isFile();
				} catch {
					// Broken symlink, skip it
					continue;
				}
			}

			if (isFile && entry.name.endsWith(".md")) {
				const result = loadTemplateFromFile(fullPath, getSourceInfo(fullPath));
				if (result.template) {
					templates.push(result.template);
				}
				diagnostics.push(...result.diagnostics);
			}
		}
	} catch {
		return { templates, diagnostics };
	}

	return { templates, diagnostics };
}

export interface LoadPromptTemplatesOptions {
	/** Working directory for project-local templates. */
	cwd: string;
	/** Agent config directory for global templates. */
	agentDir: string;
	/** Explicit prompt template paths (files or directories). */
	promptPaths: string[];
	/** Include default prompt directories. */
	includeDefaults: boolean;
}

export interface LoadPromptTemplatesResult {
	templates: PromptTemplate[];
	diagnostics: ResourceDiagnostic[];
}

/**
 * Load all prompt templates from:
 * 1. Global: agentDir/prompts/
 * 2. Project: cwd/{CONFIG_DIR_NAME}/prompts/
 * 3. Explicit prompt paths
 */
export function loadPromptTemplates(options: LoadPromptTemplatesOptions): LoadPromptTemplatesResult {
	const resolvedCwd = resolvePath(options.cwd);
	const resolvedAgentDir = resolvePath(options.agentDir);
	const promptPaths = options.promptPaths;
	const includeDefaults = options.includeDefaults;

	const templates: PromptTemplate[] = [];
	const diagnostics: ResourceDiagnostic[] = [];
	const addResult = (result: LoadPromptTemplatesResult): void => {
		templates.push(...result.templates);
		diagnostics.push(...result.diagnostics);
	};

	const globalPromptsDir = join(resolvedAgentDir, "prompts");
	const projectPromptsDir = resolve(resolvedCwd, CONFIG_DIR_NAME, "prompts");

	const isUnderPath = (target: string, root: string): boolean => {
		const normalizedRoot = resolve(root);
		if (target === normalizedRoot) {
			return true;
		}
		const prefix = normalizedRoot.endsWith(sep) ? normalizedRoot : `${normalizedRoot}${sep}`;
		return target.startsWith(prefix);
	};

	const getSourceInfo = (resolvedPath: string): SourceInfo => {
		if (isUnderPath(resolvedPath, globalPromptsDir)) {
			return createSyntheticSourceInfo(resolvedPath, {
				source: "local",
				scope: "user",
				baseDir: globalPromptsDir,
			});
		}
		if (isUnderPath(resolvedPath, projectPromptsDir)) {
			return createSyntheticSourceInfo(resolvedPath, {
				source: "local",
				scope: "project",
				baseDir: projectPromptsDir,
			});
		}
		return createSyntheticSourceInfo(resolvedPath, {
			source: "local",
			baseDir: statSync(resolvedPath).isDirectory() ? resolvedPath : dirname(resolvedPath),
		});
	};

	if (includeDefaults) {
		addResult(loadTemplatesFromDir(globalPromptsDir, getSourceInfo));
		addResult(loadTemplatesFromDir(projectPromptsDir, getSourceInfo));
	}

	// 3. Load explicit prompt paths
	for (const rawPath of promptPaths) {
		const resolvedPath = resolvePath(rawPath, resolvedCwd, { trim: true });
		if (!existsSync(resolvedPath)) {
			continue;
		}

		try {
			const stats = statSync(resolvedPath);
			if (stats.isDirectory()) {
				addResult(loadTemplatesFromDir(resolvedPath, getSourceInfo));
			} else if (stats.isFile() && resolvedPath.endsWith(".md")) {
				const result = loadTemplateFromFile(resolvedPath, getSourceInfo(resolvedPath));
				if (result.template) {
					templates.push(result.template);
				}
				diagnostics.push(...result.diagnostics);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : "failed to read prompt template path";
			diagnostics.push({ type: "warning", message, path: resolvedPath });
		}
	}

	return { templates, diagnostics };
}

/**
 * Expand a prompt template if it matches a template name.
 * Returns the expanded content or the original text if not a template.
 */
export function expandPromptTemplate(text: string, templates: PromptTemplate[]): string {
	if (!text.startsWith("/")) return text;

	const match = text.match(/^\/([^\s]+)(?:\s+([\s\S]*))?$/);
	if (!match) return text;

	const templateName = match[1];
	const argsString = match[2] ?? "";

	const template = templates.find((t) => t.name === templateName);
	if (template) {
		const args = parseCommandArgs(argsString);
		return substituteArgs(template.content, args);
	}

	return text;
}
