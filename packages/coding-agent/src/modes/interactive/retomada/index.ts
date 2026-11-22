// nycode: K20 centred divider for a resumed session (/resume), in place of the plain "Resumed session" status line.
import { Spacer, visibleWidth } from "@nycode/tui";
import { theme } from "../theme/theme.ts";

/** Time since the last activity, short pt-BR; "" for an invalid value. */
export function ha(ms: number): string {
	if (!Number.isFinite(ms) || ms < 0) return "";
	const m = Math.floor(ms / 60000);
	if (m < 1) return "agora há pouco";
	if (m < 60) return `há ${m} min`;
	const h = Math.floor(m / 60);
	return h < 24 ? `há ${h}h` : `há ${Math.floor(h / 24)}d`;
}

/** Title and details, in order of importance (the end goes first when width is short). */
export function partes(input: { nome: string | undefined; ultima: number; agora: number }): string[] {
	const p = ["sessão retomada"];
	if (input.nome?.trim()) p.push(input.nome.trim());
	const q = ha(input.agora - input.ultima);
	if (q) p.push(`parada ${q}`);
	return p;
}

/** Centres the label, dropping the trailing details first. */
export function linha(width: number, ps: readonly string[], vw: (s: string) => number = (s) => [...s].length): string {
	const kept = [...ps];
	let texto = kept.join(" · ");
	while (kept.length > 1 && vw(texto) > width) {
		kept.pop();
		texto = kept.join(" · ");
	}
	for (const c of [...texto].reverse()) {
		if (vw(texto) <= width) break;
		texto = texto.slice(0, -c.length);
	}
	return " ".repeat(Math.max(0, Math.floor((width - vw(texto)) / 2))) + texto;
}

/** The slice of InteractiveMode the divider uses (private fields read structurally). */
export interface ResumeHost {
	sessionManager: { getLeafEntry(): { timestamp: string } | undefined; getSessionName(): string | undefined };
	chatContainer: { addChild(child: { invalidate(): void; render(width: number): string[] } | Spacer): void };
	ui: { requestRender(): void };
}

/** Adds the divider to the chat: called where the core showed "Resumed session". */
export function mostrarRetomada(im: ResumeHost): void {
	const sm = im.sessionManager;
	const ultima = Date.parse(sm.getLeafEntry()?.timestamp ?? "");
	const ps = partes({ nome: sm.getSessionName(), ultima, agora: Date.now() });
	im.chatContainer.addChild(new Spacer(1));
	im.chatContainer.addChild({
		invalidate() {},
		render: (width) => [theme.fg("dim", linha(width, ps, visibleWidth))],
	});
	im.ui.requestRender();
}
