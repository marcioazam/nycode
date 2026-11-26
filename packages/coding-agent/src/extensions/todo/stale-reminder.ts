/**
 * Lista de tarefas sempre em dia: quando há itens abertos e várias chamadas de ferramenta passam sem nenhuma
 * atualização da lista, o próximo resultado de ferramenta leva um lembrete curto.
 *
 * Motivo (2026-11-15): em sessões longas a lista ficava parada num item já concluído e a aba Todo mostrava um
 * estado falso. O Claude Code resolve o mesmo com um lembrete de sistema quando a lista fica sem uso.
 *
 * Custo: nada no prompt fixo e nenhum turno extra. O lembrete vai no fim de um resultado de ferramenta (não toca o
 * prefixo em cache), no máximo um a cada EVERY chamadas, e só com item aberto. Sem lista ou com tudo concluído, a
 * extensão não escreve nada.
 *
 * Modo estrito (só com `ctx.hasUI`, sessão interativa): em 2026-11-15 a extensão injetou 41 lembretes e só 10 foram
 * seguidos por uma chamada `todo` nas 3 chamadas seguintes; o modelo usava a saída "carry on" mesmo com a lista errada
 * (item parado 2h30 num trabalho já mudado, trabalho novo nunca adicionado) e `todo list` zerava o contador sem mudar
 * nada. No modo estrito só uma chamada `todo` que muda a lista zera a contagem, o texto lista os itens abertos, não
 * tem saída e repete a cada FOLLOW chamadas até haver mudança. Custo: uma chamada todo a cada ~10-13 chamadas, só em
 * sessões interativas. Sem interface (benchmarks) o comportamento e o texto seguem idênticos ao original.
 *
 * O estado vem da função devolvida por `registerStaleReminder`, que a extensão todo chama a cada mudança e ao recarregar a sessão.
 * NYCODE_TODO_SYNC=0 ou `todo.staleReminder: false` nas settings desliga (resolvedor de settings-nycode).
 */
import { getAgentDir } from "../../config.ts";
import type { ExtensionAPI } from "../../core/extensions/types.ts";
import { SettingsManager } from "../../core/settings-manager.ts";
import { resolveNycodeSettings } from "../../core/settings-nycode.ts";
import { isOpen } from "./status.ts";

export type Item = { id: number; text: string; status: string };

/** Chamadas de ferramenta sem tocar na lista antes de lembrar. */
export const EVERY = 10;

/** Chamadas entre lembretes enquanto a lista não mudar (modo estrito). */
export const FOLLOW = 3;

/** Cadência com todo.sync: 30 chamadas, sem repetição estrita, no máximo 2 lembretes por sessão. */
export const SYNC_EVERY = 30;
export const SYNC_MAX = 2;

const MAX_ITEMS = 12;

/** Lembrete estrito: itens abertos compactos e pedido de reconciliação, sem saída. */
export function strictReminder(items: Item[]): string | undefined {
	const open = items.filter((t) => isOpen(t.status));
	if (open.length === 0) return undefined;
	const lines = open.slice(0, MAX_ITEMS).map((t) => `#${t.id} [${t.status}] ${t.text.slice(0, 60)}`);
	if (open.length > MAX_ITEMS) lines.push(`+${open.length - MAX_ITEMS} more`);
	return `<system-reminder>The todo list has ${open.length} open item(s) and has not changed for several tool calls:\n${lines.join("\n")}\nReconcile the list now with one todo call that changes it: complete finished items, start the item you are actually working on, add untracked work (background runs, PRs waiting on gates). \`todo list\` does not count.</system-reminder>`;
}

/** Texto do lembrete, ou undefined quando não há item aberto. */
export function reminder(items: Item[], calls: number): string | undefined {
	const open = items.filter((t) => isOpen(t.status));
	if (open.length === 0) return undefined;
	const active = open.find((t) => t.status === "in_progress");
	const where = active ? `in progress: #${active.id} "${active.text}"` : "none in progress";
	return `<system-reminder>The todo list has ${open.length} open item(s) (${where}) and the last ${calls} tool calls did not update it. If an item is finished, complete it now; if the work moved to another item, start that one; add what is missing. If the list is accurate, carry on and do not mention this reminder.</system-reminder>`;
}

/** Lê a chave `todo.staleReminder` (env NYCODE_TODO_SYNC > settings.json > ligado). */
export const readStaleReminderEnabled = (cwd: string): boolean =>
	SettingsManager.create(cwd, getAgentDir()).getNycodeSettings().todo.staleReminder;

/** Lê a chave `todo.sync` (env NYCODE_TODO_SYNC_V2 > settings.json > desligado). */
export const readTodoSyncEnabled = (nycode: Pick<ExtensionAPI, "getSettings">): boolean => {
	try {
		return resolveNycodeSettings(nycode.getSettings(), process.env).todo.sync;
	} catch {
		return false; // stale session or no settings: sync stays off, like the default
	}
};

/** Registra o lembrete e devolve o setter da lista; a chave é lida uma vez, na primeira chamada de ferramenta (a fábrica não tem cwd). */
export function registerStaleReminder(
	nycode: ExtensionAPI,
	readEnabled: (cwd: string) => boolean = readStaleReminderEnabled,
	readSync: (cwd: string) => boolean = () => readTodoSyncEnabled(nycode),
) {
	let items: Item[] = [];
	let calls = 0;
	let sent = 0;
	let enabled: boolean | undefined;
	let sync: boolean | undefined;
	nycode.on("session_start", (_event, ctx) => {
		// Counters reset only with todo.sync: off keeps today's behavior (no reset on session_start).
		sync ??= readSync(ctx?.cwd ?? process.cwd());
		if (!sync) return;
		calls = 0;
		sent = 0;
	});
	nycode.on("tool_result", (event, ctx) => {
		const cwd = ctx?.cwd ?? process.cwd();
		enabled ??= readEnabled(cwd);
		if (!enabled) return undefined;
		sync ??= readSync(cwd);
		const strict = ctx?.hasUI === true;
		const action = (event.input as { action?: string } | undefined)?.action;
		if (event.toolName === "todo" && (!strict || action !== "list")) {
			calls = 0;
			return undefined;
		}
		calls += 1;
		if (calls < (sync ? SYNC_EVERY : EVERY)) return undefined;
		if (sync && sent >= SYNC_MAX) return undefined;
		const text = strict ? strictReminder(items) : reminder(items, calls);
		calls = strict && text && !sync ? EVERY - FOLLOW : 0;
		if (text && sync) sent += 1;
		if (!text || !Array.isArray(event.content)) return undefined;
		return { content: [...event.content, { type: "text" as const, text }] };
	});
	return (next: Item[]) => {
		items = next;
	};
}
