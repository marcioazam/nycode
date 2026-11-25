/**
 * Mensagem `[plan-mode-execute]`: o que dá para saber do plano
 * a partir do ramo da sessão. O nycode grava uma entrada `custom` `plan-mode` ({todos: [{step, text, completed}], executing})
 * ANTES de enviar a mensagem e a regrava a cada mudança; `plan-complete` e `plan-cancelled` são mensagens que fecham a execução.
 * Sem essas entradas só resta o texto `Execute the plan. Start with: <1ª etapa>`: mostra só a 1ª etapa, sem total (nunca inventa).
 */
export type Etapa = { text: string; completed: boolean };
export type Estado = "executando" | "concluido" | "encerrado";
export type Plano = { etapas: Etapa[]; total?: number; estado: Estado };
type Entrada = Record<string, any>;

const TIPO = "plan-mode-execute";
const INICIO = /^Execute the plan\. Start with: (.+)$/m;

const etapasDe = (data: unknown): Etapa[] | undefined => {
	const todos = (data as { todos?: unknown } | undefined)?.todos;
	if (!Array.isArray(todos) || !todos.length) return undefined;
	const out = todos
		.filter((t) => typeof t?.text === "string")
		.map((t) => ({ text: String(t.text), completed: Boolean(t.completed) }));
	return out.length === todos.length ? out : undefined;
};

/** Só o texto da mensagem: a 1ª etapa, ou nenhuma quando o plano não tem etapas rastreadas. */
export const planoDoTexto = (texto: string): Plano => {
	const m = INICIO.exec(texto);
	return { etapas: m ? [{ text: m[1]!.trim(), completed: false }] : [], estado: "executando" };
};

/** O plano desta mensagem: etapas da entrada `plan-mode` anterior a ela; progresso e fim das entradas depois dela. */
export function planoDe(entradas: Entrada[] | undefined, texto: string, ts: number): Plano {
	const base = planoDoTexto(texto);
	if (!entradas) return base;
	let idx = -1,
		melhor = Infinity;
	entradas.forEach((e, i) => {
		if (e.type !== "custom_message" || e.customType !== TIPO || e.content !== texto) return;
		const d = Math.abs(Date.parse(e.timestamp) - ts);
		const dd = Number.isNaN(d) ? Number.MAX_VALUE : d;
		if (dd <= melhor) {
			melhor = dd;
			idx = i;
		}
	});
	if (idx < 0) return base;
	let etapas: Etapa[] | undefined;
	for (let i = idx - 1; i >= 0 && !etapas; i--)
		if (entradas[i]!.type === "custom" && entradas[i]!.customType === "plan-mode")
			etapas = etapasDe(entradas[i]!.data);
	if (!etapas) return base;
	let estado: Estado = "executando";
	for (let i = idx + 1; i < entradas.length; i++) {
		const e = entradas[i]!;
		if (e.type === "custom" && e.customType === "plan-mode") {
			const novas = etapasDe(e.data);
			if (novas?.length === etapas.length) etapas = novas;
		} else if (e.type === "custom_message") {
			if (e.customType === "plan-complete") {
				estado = "concluido";
				break;
			}
			if (e.customType === "plan-cancelled" || e.customType === TIPO) {
				estado = "encerrado";
				break;
			}
		}
	}
	if (estado === "concluido") etapas = etapas.map((t) => ({ ...t, completed: true }));
	return { etapas, total: etapas.length, estado };
}
