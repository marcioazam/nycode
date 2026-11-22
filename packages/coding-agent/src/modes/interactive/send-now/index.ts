// nycode: K22 send-now (Ctrl+Enter / Ctrl+X Ctrl+S): aborts the running agent and `!bash`, waits for idle and submits the
// draft through the native onSubmit; shift+backspace / shift+up / shift+down act on the queued messages. Background
// subagent children are not touched.
import {
	dropLastQueued,
	editorText,
	editSelected,
	moveSelection,
	type QueueHost,
	type QueueSession,
	takeUserQueues,
} from "./queues.ts";

export const WAIT_MS = 10_000;
export const CHORD_MS = 3000;
const POLL_MS = 10;
const CTRL_X = "\x18";
// Backspace reported as code 8 (some terminals) is not recognised by matchesKey("shift+backspace"): treated as the same key.
const SHIFT_BACKSPACE_CODE_8 = /^\x1b\[(?:8;2(?::1)?u|27;2;8~)$/;

interface SessionView extends QueueSession {
	isIdle: boolean;
	isBashRunning: boolean;
	abort(): Promise<void>;
	abortBash(): void;
}

type InputResult = { consume?: boolean; data?: string } | undefined;

/** The slice of InteractiveMode send-now uses (private fields read structurally). */
export interface SendNowHost extends QueueHost {
	session: SessionView;
	editor: QueueHost["editor"] & { handleInput(data: string): void; handleClaudeChord?(data: string): boolean };
	defaultEditor: { onSubmit(text: string): unknown };
	renderer: { getFocusedComponent(): unknown };
	keybindings: { matches(data: string, id: string): boolean };
	clearAllQueues(): unknown;
	addExtensionTerminalInputListener(handler: (data: string) => InputResult): () => void;
}

const inflight = new WeakSet<object>();
const installed = new WeakMap<object, () => void>(); // host -> remove (one listener per host; reinstalling replaces it)
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

// Without a switch it goes back before the new text. With a switch only reachable history (up), never the draft of the other session.
function restore(host: SendNowHost, session: SessionView, editor: SendNowHost["editor"], captured: string): string {
	if (host.session === session && host.editor === editor) {
		editor.setText([captured, editorText(editor)].filter((t) => t.trim()).join("\n\n"));
		return "devolvido ao editor";
	}
	if (host.editor.addToHistory) {
		host.editor.addToHistory(captured);
		return "guardado no histórico do editor atual (↑)";
	}
	// showError only draws in the terminal: it does not send the draft to the model nor save it in the new session.
	return `recuperável neste aviso local (editor sem histórico):\n${captured}`;
}

/** Aborts the agent and the `!bash`, waits for idle; rejects on failure or at the limit. */
async function cancelAndWait(session: SessionView, waitMs: number): Promise<void> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const limit = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error(`o agente não ficou ocioso em ${waitMs / 1000}s`)), waitMs);
	});
	let stopped = false;
	const work = (async () => {
		if (session.isBashRunning) session.abortBash();
		// Usage-limit wait of auto-resume: outside the agent run the core abort does not wake it.
		try {
			(globalThis as { __piAutoResumeCancel?: () => void }).__piAutoResumeCancel?.();
		} catch {
			// extension absent
		}
		if (!session.isIdle) await session.abort();
		while (!stopped && (!session.isIdle || session.isBashRunning)) await sleep(POLL_MS);
	})();
	work.catch(() => {}); // a late rejection (after the limit) is not an unhandledRejection
	try {
		await Promise.race([work, limit]);
	} finally {
		stopped = true;
		clearTimeout(timer);
	}
}

/** Sends the queue and the draft now: takes the human queues, cancels what runs and submits the captured text. */
export async function sendNow(host: SendNowHost, waitMs = WAIT_MS): Promise<void> {
	if (inflight.has(host)) return;
	const { session, editor } = host;
	let queued: { steering: string[]; followUp: string[] };
	try {
		queued = host.getAllQueuedMessages();
	} catch (err) {
		host.showError?.(`Enviar agora falhou ao ler as filas (${message(err)}); nada foi retirado.`);
		return;
	}
	const captured = [[...queued.steering, ...queued.followUp].join("\n\n"), editorText(editor)]
		.filter((t) => t.trim())
		.join("\n\n");
	if (!captured.trim()) return;
	inflight.add(host);
	try {
		try {
			takeUserQueues(host);
		} catch (err) {
			host.showError?.(`Enviar agora falhou (${message(err)}); rascunho e filas mantidos.`);
			return;
		}
		editor.setText("");
		host.updatePendingMessagesDisplay?.();
		try {
			await cancelAndWait(session, waitMs);
		} catch (err) {
			const where = restore(host, session, editor, captured);
			host.showError?.(
				`Enviar agora falhou (${message(err)}); rascunho ${where}. Nada foi enviado; tente Esc e Enter.`,
			);
			return;
		}
		if (host.session !== session || host.editor !== editor) {
			const where = restore(host, session, editor, captured);
			host.showError?.(`Enviar agora cancelado: a sessão ou o editor mudou; rascunho ${where}.`);
			return;
		}
		try {
			await host.defaultEditor.onSubmit(captured);
		} catch (err) {
			const where = restore(host, session, editor, captured);
			host.showError?.(`Enviar agora falhou ao submeter (${message(err)}); rascunho ${where}.`);
		}
	} finally {
		inflight.delete(host);
	}
}

/** Registers the listener (idempotent per host). Call after clearExtensionTerminalInputListeners(). */
export function installSendNow(host: SendNowHost): () => void {
	installed.get(host)?.();
	let armed: ReturnType<typeof setTimeout> | undefined;
	const disarm = () => {
		clearTimeout(armed);
		armed = undefined;
	};
	const focused = () => host.renderer.getFocusedComponent() === host.editor;
	const flush = () => {
		if (!armed) return;
		disarm();
		if (focused()) host.editor.handleInput(CTRL_X);
	};
	const is = (data: string, id: string) => host.keybindings.matches(data, id);
	const listener = (data: string): InputResult => {
		if (!focused()) {
			disarm();
			return undefined;
		}
		if (armed) {
			if (is(data, "app.message.sendNowChord")) {
				disarm();
				void sendNow(host);
				return { consume: true };
			}
			// A single owner of the prefix: do not copy Ctrl+X before a combination the editor recognises.
			try {
				if (host.editor.handleClaudeChord?.(data)) {
					disarm();
					return { consume: true };
				}
			} catch (err) {
				disarm();
				host.showError?.(`Atalho Ctrl+X falhou: ${message(err)}`);
				return { consume: true };
			}
			flush();
		}
		if (is(data, "app.message.sendNow")) {
			void sendNow(host);
			return { consume: true };
		}
		if ((is(data, "app.queue.drop") || SHIFT_BACKSPACE_CODE_8.test(data)) && dropLastQueued(host))
			return { consume: true };
		if (is(data, "app.queue.selectPrev") && moveSelection(host, -1)) return { consume: true };
		if (is(data, "app.queue.selectNext") && moveSelection(host, 1)) return { consume: true };
		if (is(data, "app.message.dequeue") && editSelected(host)) return { consume: true };
		if (is(data, "app.message.copy")) {
			armed = setTimeout(flush, CHORD_MS);
			armed.unref?.();
			return { consume: true };
		}
		return undefined;
	};
	const off = host.addExtensionTerminalInputListener(listener);
	const remove = () => {
		disarm();
		off();
	};
	installed.set(host, remove);
	return remove;
}
