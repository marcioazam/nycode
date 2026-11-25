// Queue edits behind the send-now keys: drop the chosen (or last) queued message, edit the chosen one, move the choice.
// The agent queues are read structurally (private fields of the core); an unknown shape refuses and removes nothing.

export interface QueuedMessage {
	role?: string;
	content?: unknown;
}

interface Lane {
	messages?: QueuedMessage[];
}

export interface QueueSession {
	agent?: {
		steeringQueue?: Lane;
		followUpQueue?: Lane;
		steer?(message: QueuedMessage): void;
		followUp?(message: QueuedMessage): void;
	};
	_followUpMessages?: string[];
	_steeringMessages?: string[];
	_emitQueueUpdate?(): void;
}

export interface QueueHost {
	session?: QueueSession;
	editor: {
		getText(): string;
		getExpandedText?(): string;
		setText(text: string): void;
		addToHistory?(text: string): void;
	};
	compactionQueuedMessages?: { mode: string; text: string }[];
	getAllQueuedMessages(): { steering: string[]; followUp: string[] };
	updatePendingMessagesDisplay?(): void;
	showError?(message: string): void;
	ui?: { requestRender?(): void };
}

type Mode = "steer" | "followUp";
interface Target {
	mode: Mode;
	k: number;
	text: string | undefined;
}

// Chosen queue item: index in the displayed list [steering..., followUp...], shared with the queue
// view (extensions/up-dequeue) through this global; undefined = none (the keys act on the last one).
const SEL = "__piFilaSel";
const globals = globalThis as { __piFilaSel?: number };
export const getSel = (): number | undefined => (Number.isInteger(globals[SEL]) ? globals[SEL] : undefined);
const setSel = (i: number | undefined) => {
	if (i === undefined) delete globals[SEL];
	else globals[SEL] = i;
};

export const editorText = (e: QueueHost["editor"]): string => e.getExpandedText?.() ?? e.getText();
const redraw = (host: QueueHost) => {
	host.updatePendingMessagesDisplay?.();
	host.ui?.requestRender?.();
};

/** Steering and follow-up lanes of the agent without the human messages; throws when the core shape changed. */
export function takeUserQueues(host: QueueHost & { clearAllQueues(): unknown }): void {
	const agent = host.session?.agent;
	const steering = agent?.steeringQueue?.messages;
	const followUp = agent?.followUpQueue?.messages;
	if (!agent?.steer || !agent.followUp || !steering || !followUp)
		throw new Error("forma das filas do core mudou; nada foi retirado");
	// clearAllQueues returns only human text but also erases subagent completions: keep the extension messages.
	const keepSteering = steering.filter((m) => m.role !== "user");
	const keepFollowUp = followUp.filter((m) => m.role !== "user");
	host.clearAllQueues();
	for (const message of keepSteering) agent.steer(message);
	for (const message of keepFollowUp) agent.followUp(message);
}

/**
 * Removes human message `k` (position in the getAllQueuedMessages list) from lane `mode`, keeping custom extension
 * messages. Returns the removed text, "" when there is no item, or null when the core queue shape changed.
 */
function removeQueued(host: QueueHost, mode: Mode, k: number, fallbackText: string | undefined): string | null {
	const agent = host.session?.agent;
	const lane = mode === "followUp" ? agent?.followUpQueue?.messages : agent?.steeringQueue?.messages;
	if (!lane) return null;
	const humans: number[] = [];
	lane.forEach((m, i) => {
		if (m.role === "user") humans.push(i);
	});
	const human = humans[k];
	if (human !== undefined) {
		const [removed] = lane.splice(human, 1);
		const msgText = Array.isArray(removed?.content)
			? (removed.content as { type?: string; text?: string }[])
					.filter((c) => c?.type === "text")
					.map((c) => c.text ?? "")
					.join("\n") || fallbackText
			: fallbackText;
		const mirrors = mode === "followUp" ? host.session?._followUpMessages : host.session?._steeringMessages;
		if (mirrors && mirrors.length > 0) {
			const at = mirrors[k] === msgText ? k : msgText !== undefined ? mirrors.lastIndexOf(msgText) : -1;
			mirrors.splice(at >= 0 ? at : mirrors.length - 1, 1);
			host.session?._emitQueueUpdate?.();
		}
		return msgText ?? "";
	}
	const comp = host.compactionQueuedMessages ?? [];
	const ci = comp.map((m, i) => (m.mode === mode ? i : -1)).filter((i) => i >= 0)[k - humans.length];
	if (ci === undefined) return "";
	const [removed] = comp.splice(ci, 1);
	return removed?.text ?? "";
}

function where(queued: { steering: string[]; followUp: string[] }, i: number): Target | undefined {
	if (i < queued.steering.length) return { mode: "steer", k: i, text: queued.steering[i] };
	const k = i - queued.steering.length;
	return k < queued.followUp.length ? { mode: "followUp", k, text: queued.followUp[k] } : undefined;
}

function readQueues(host: QueueHost, what: string) {
	try {
		return host.getAllQueuedMessages();
	} catch (err) {
		host.showError?.(
			`${what} falhou ao ler as filas (${err instanceof Error ? err.message : String(err)}); nada foi retirado.`,
		);
		return null;
	}
}

/**
 * Drops the chosen item or, with no choice, the last human message (follow-up first), keeping custom extension messages
 * and saving the text in the editor history. Returns false when no human message is queued (the key goes on to the editor).
 */
export function dropLastQueued(host: QueueHost): boolean {
	const queued = readQueues(host, "Excluir da fila");
	if (!queued) return true;
	const total = queued.steering.length + queued.followUp.length;
	if (!total) return false;
	const sel = getSel();
	const alvo = where(
		queued,
		sel !== undefined && sel < total ? sel : queued.followUp.length ? total - 1 : queued.steering.length - 1,
	);
	if (!alvo) return false;
	const msgText = removeQueued(host, alvo.mode, alvo.k, alvo.text);
	if (msgText === null) {
		host.showError?.("Excluir da fila falhou (forma das filas do core mudou); nada foi retirado.");
		return true;
	}
	if (sel !== undefined) setSel(total - 1 > 0 ? Math.min(sel, total - 2) : undefined);
	if (msgText) host.editor.addToHistory?.(msgText);
	redraw(host);
	return true;
}

/** With a chosen item, takes only it out of the queue and puts it in the editor before the draft; without, false. */
export function editSelected(host: QueueHost): boolean {
	const sel = getSel();
	if (sel === undefined) return false;
	const queued = readQueues(host, "Editar da fila");
	if (!queued) return true;
	const alvo = where(queued, sel);
	if (!alvo) {
		setSel(undefined);
		return false;
	}
	const msgText = removeQueued(host, alvo.mode, alvo.k, alvo.text);
	if (msgText === null) {
		host.showError?.("Editar da fila falhou (forma das filas do core mudou); nada foi retirado.");
		return true;
	}
	setSel(undefined);
	host.editor.setText([msgText, editorText(host.editor)].filter((t) => t.trim()).join("\n\n"));
	redraw(host);
	return true;
}

/** Choose a queue item (up from the last one; down after the last = none). Without a queue, false (the key goes on). */
export function moveSelection(host: QueueHost, dir: -1 | 1): boolean {
	let queued: { steering: string[]; followUp: string[] };
	try {
		queued = host.getAllQueuedMessages();
	} catch {
		return false;
	}
	const total = queued.steering.length + queued.followUp.length;
	if (!total) {
		setSel(undefined);
		return false;
	}
	const sel = getSel();
	const cur = sel !== undefined && sel < total ? sel : undefined;
	if (dir < 0) setSel(cur === undefined ? total - 1 : Math.max(0, cur - 1));
	else setSel(cur === undefined || cur + 1 >= total ? undefined : cur + 1);
	redraw(host);
	return true;
}
