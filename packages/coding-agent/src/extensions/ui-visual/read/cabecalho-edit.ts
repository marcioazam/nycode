/**
 * Fundo do cabeçalho do Edit (antes o cabeçalho ficava sem fundo e só o diff tinha caixa): a linha ganha o
 * MESMO fundo, recuo e largura das linhas da caixa do diff (`boxed` em tools.ts), para cabeçalho e diff lerem como um cartão.
 * Sem cor no tema devolve a linha como está (layout anterior, sem fundo).
 */
import { visibleWidth } from "@nycode/tui";
import { bgOpen, type DiffTheme, keepBg } from "../diff.ts";
import { fitLine } from "../motion/chrome.ts";

/** `monta(iw)` desenha o cabeçalho na largura interna; o recuo é o `outputPad` da caixa (1 por padrão). */
export const comFundoEdit = (
	theme: Pick<DiffTheme, "bg">,
	fundo: string,
	outputPad: number | undefined,
	w: number,
	monta: (iw: number) => string,
): string => {
	const open = bgOpen(theme, fundo);
	if (!open || !theme.bg) return monta(w);
	const pad = outputPad ?? 1;
	const iw = Math.max(1, w - 2 * pad);
	const r = keepBg(fitLine(monta(iw), iw), open);
	return theme.bg(fundo, " ".repeat(pad) + r + " ".repeat(Math.max(0, iw - visibleWidth(r))) + " ".repeat(pad));
};
