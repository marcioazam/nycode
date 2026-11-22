// Visual-only filter of the chat for /focus: the last prompt, a one-line summary of what happened after it, and the
// chosen reply. Nothing here changes real children, messages or context; it only reads components structurally.

const DIM = ["\x1b[2m", "\x1b[22m"] as const;
// Real format of the background subagent notice: customType and "Background subagent run <id> (<agent>) <state> after <n> turns."
const BG_TYPE = "subagent-background";
const BG_STATE = /Background subagent run \S+ \([^)]*\) (\w+) after \d+ turns/;
const SUBAGENT_TOOLS = new Set(["subagent", "Agent", "Task"]);

/** A chat child seen structurally: the components come from several classes and extensions. */
export interface ChatChild {
	render(width: number): string[];
	[field: string]: unknown;
}

export type ChildKind = "assistant" | "tool" | "bash" | "bg-notice" | "custom" | "user" | "other";

interface ToolView extends ChatChild {
	toolName: string;
	args?: { tasks?: unknown; chain?: unknown };
	result?: { isError?: boolean; details?: { diff?: unknown } };
}

function noticeText(c: ChatChild): string {
	const content = (c.message as { content?: unknown } | undefined)?.content;
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content.map((p: { text?: unknown } | undefined) => (typeof p?.text === "string" ? p.text : "")).join("\n");
}

/** Classifies a chat child by the shape of its fields (feature detection on foreign component classes). */
export function classify(c: ChatChild): ChildKind {
	if ("lastMessage" in c && "hasToolCalls" in c) return "assistant";
	if (typeof c.toolName === "string" && typeof c.toolCallId === "string") return "tool";
	if (typeof c.command === "string" && typeof c.setComplete === "function") return "bash";
	if ("customRenderer" in c && "message" in c)
		return (c.message as { customType?: unknown } | undefined)?.customType === BG_TYPE ? "bg-notice" : "custom";
	if (typeof c.text === "string" && "markdownTransformers" in c) return "user";
	return "other";
}

function diffStats(diff: unknown): [number, number] {
	if (typeof diff !== "string") return [0, 0];
	let add = 0;
	let del = 0;
	for (const line of diff.split("\n")) {
		if (line.startsWith("+") && !line.startsWith("+++")) add++;
		else if (line.startsWith("-") && !line.startsWith("---")) del++;
	}
	return [add, del];
}

function subagentCount(c: ToolView): number {
	if (Array.isArray(c.args?.tasks)) return c.args.tasks.length;
	if (Array.isArray(c.args?.chain)) return c.args.chain.length;
	return 1;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** One-line summary counted from the real components after the last prompt. */
export function summarize(children: readonly ChatChild[]): string {
	let tools = 0;
	let add = 0;
	let del = 0;
	let subs = 0;
	let bg = 0;
	let errs = 0;
	let hidden = 0;
	for (const c of children) {
		const kind = classify(c);
		if (kind === "bash") tools++;
		else if (kind === "bg-notice") {
			if (BG_STATE.exec(noticeText(c))?.[1] === "completed") bg++;
			else errs++; // failed, cancelled or unknown format: never "completed"
		} else if (kind === "custom") hidden++;
		else if (kind === "tool") {
			const t = c as ToolView;
			tools++;
			if (t.result?.isError) errs++;
			if (t.toolName === "edit") {
				const [a, d] = diffStats(t.result?.details?.diff);
				add += a;
				del += d;
			}
			if (SUBAGENT_TOOLS.has(t.toolName)) subs += subagentCount(t);
		}
	}
	const parts: string[] = [];
	if (tools) parts.push(plural(tools, "ferramenta", "ferramentas"));
	if (add || del) parts.push(`edições +${add} −${del}`);
	if (subs) parts.push(plural(subs, "subagente", "subagentes"));
	if (bg)
		parts.push(
			`${plural(bg, "notificação", "notificações")} em segundo plano ${bg === 1 ? "concluída" : "concluídas"}`,
		);
	if (errs) parts.push(plural(errs, "erro", "erros"));
	if (hidden) parts.push(plural(hidden, "mensagem de extensão oculta", "mensagens de extensão ocultas"));
	return parts.length ? `⏺ ${parts.join(" · ")}` : "";
}

// Shape of the tui Spacer: numeric `lines` plus `setLines`; spacing only, no content.
const isLayoutSpacer = (c: ChatChild) => typeof c.lines === "number" && typeof c.setLines === "function";

/** Focus lines; without a user prompt it returns null (native render). */
export function focusLines(children: readonly ChatChild[], width: number): string[] | null {
	let last = -1;
	children.forEach((c, i) => {
		if (classify(c) === "user") last = i;
	});
	const lastChild = children[last];
	if (!lastChild) return null;
	const after = children.slice(last + 1);
	const assistant = after.findLast((c) => classify(c) === "assistant");
	const summary = summarize(after);
	const out = [...lastChild.render(width)];
	if (summary) out.push("", `${DIM[0]}${summary.slice(0, Math.max(1, width))}${DIM[1]}`);
	// Fail-safe: showError/showWarning of the core (Spacer + ThemedText) are "other"; whatever is opaque and not a
	// layout Spacer of the last turn stays visible, in order, next to the chosen reply. Nothing is rendered to classify.
	for (const c of after) {
		if (c === assistant || (classify(c) === "other" && !isLayoutSpacer(c))) out.push("", ...c.render(width));
	}
	return out;
}
