// Desenho das chamadas read/bash/edit/write/grep/find/ls em uma linha, dentro do shell padrão do nycode (Box com
// fundo toolPendingBg/SuccessBg/ErrorBg e padding horizontal = outputPad, aplicado pelo nycode: não somamos o nosso):
// `estado ícone verbo  alvo ……… resumo · tempo`; detalhe (saída, erro) recuado sob o verbo com `│`.
// O diff do edit (colapsado ou expandido) sai pelo renderer inline de diff.ts (estilo Xcode), na largura inteira e sem
// recuo; sem diff, ou se o desenho falhar, vale o renderer nativo recuado.
// O bash é o cartão do shell (Variante 04, motion/shell.ts): bloco com trilho de estado, saída e rodapé.
// As demais ferramentas só ganham o ícone na 1ª linha do renderCall nativo.
// Só troca renderCall/renderResult via nycode.registerToolRenderer; execução, schema e prompt ficam nativos
// (nunca chamamos registerTool, então não colide com ferramentas-sombra de outras extensões).

import type { ExtensionAPI, ToolRenderers } from "../../core/extensions/types.ts";
import { fitLine, formatDuration } from "./motion/chrome.ts";
import { iniciou, reiniciar, terminou } from "./motion/vivo.ts";
import { type Renderers, TOOLS, type ToolName } from "./tools/base.ts";
import { definirHistorico, fim, wrap } from "./tools/builtin.ts";
import { withIcon } from "./tools/outras.ts";
export { fitLine, formatDuration };
export { subagentEstado } from "./tools/outras.ts";

export default function (nycode: ExtensionAPI): void {
	if (process.env.NYCODE_SUBAGENT === "1") return;
	nycode.on?.("tool_execution_start", (event: { toolCallId: string }) => iniciou(event.toolCallId));
	nycode.on?.("tool_execution_end", (event: { toolCallId: string }) => {
		fim.set(event.toolCallId, Date.now());
		terminou(event.toolCallId);
	});
	nycode.on?.("session_start", (_event: unknown, ctx: { sessionManager?: { getBranch?: () => unknown[] } }) => {
		reiniciar(); // chamada que não recebeu tool_execution_end (reload, troca de sessão) não fica "rodando" para sempre
		definirHistorico(() => ctx.sessionManager?.getBranch?.() ?? []);
	});
	nycode.on?.("session_shutdown", () => reiniciar());
	nycode.registerToolRenderer((toolName, next) => {
		// Renderers and Theme above model only what this file reads; the host types are stricter on parameters.
		const base = next() as unknown as Renderers | undefined;
		if (!base) return undefined;
		const out = (TOOLS as readonly string[]).includes(toolName)
			? wrap(toolName as ToolName, base)
			: withIcon(toolName, base);
		return out as unknown as ToolRenderers;
	});
}
