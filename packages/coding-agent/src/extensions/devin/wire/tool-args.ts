// Tolerant parser for tool-call argument JSON that is still streaming. Ported from pi-devin-plus 0.1.3 (MIT), see ../LICENSE.
import type { JsonObject } from "@nycode/ai";

function asObject(value: unknown): JsonObject {
	return value && typeof value === "object" ? (value as JsonObject) : {};
}

// Scans JSON text and reports whether it ends inside a string, and which brackets are still open.
function scanOpenState(text: string): { inString: boolean; escaped: boolean; stack: string[] } {
	const stack: string[] = [];
	let inString = false;
	let escaped = false;
	for (const ch of text) {
		if (escaped) {
			escaped = false;
		} else if (ch === "\\") {
			escaped = true;
		} else if (ch === '"') {
			inString = !inString;
		} else if (!inString) {
			if (ch === "{" || ch === "[") stack.push(ch);
			else if (ch === "}" || ch === "]") stack.pop();
		}
	}
	return { inString, escaped, stack };
}

/**
 * `JSON.parse` throws until the final delta closes the document, which would leave `toolCall.arguments` empty for the
 * whole stream, and the TUI renders calls incrementally from it. So: strict parse first; otherwise close an
 * unterminated string and any open arrays/objects, then parse the repaired text. Returns `{}` when repair fails.
 */
export function parsePartialToolArguments(partialJson: string): JsonObject {
	if (!partialJson || partialJson.trim() === "") return {};
	try {
		return asObject(JSON.parse(partialJson));
	} catch {
		// fall through to tolerant repair
	}

	let candidate = partialJson;
	const first = scanOpenState(candidate);
	if (first.escaped) candidate = candidate.slice(0, -1); // drop a trailing lone backslash
	if (first.inString) candidate += '"';

	// Drop a trailing comma or a dangling `"key":` before closing the object.
	candidate = candidate.replace(/,\s*$/, "").replace(/:\s*$/, ':""');
	if (first.inString) candidate = candidate.replace(/,\s*"[^"]*"\s*:\s*"$/, "");

	const { stack } = scanOpenState(candidate);
	while (stack.length > 0) candidate += stack.pop() === "{" ? "}" : "]";

	try {
		return asObject(JSON.parse(candidate));
	} catch {
		return {};
	}
}
