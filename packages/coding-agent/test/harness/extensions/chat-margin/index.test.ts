// The chat margin leaves the user message with only the chat margin and the Markdown padding.
import assert from "node:assert/strict";
import { test } from "vitest";
import type { ExtensionAPI } from "../../../../src/core/extensions/types.ts";
import chatMargin from "../../../../src/extensions/chat-margin/index.ts";
import { UserMessageComponent } from "../../../../src/modes/interactive/components/user-message.ts";
import { initTheme } from "../../../../src/modes/interactive/theme/theme.ts";

initTheme("dark");

// A mensagem do usuário perdeu quase todo o recuo lateral; antes RECUO (2) de cada lado além do padding
// do Markdown, agora só o padding (1). Fica a margem do chat (outputPad 1) sem fundo, como o texto da resposta.
test("mensagem do usuário: só a margem do chat e o padding do Markdown, sem RECUO", () => {
	chatMargin({ on() {}, getSettings: () => ({}) } as unknown as ExtensionAPI);
	const plain = (l: string) => l.replace(/\x1b\[[0-9;]*m|\x1b\][^\x07]*\x07/g, "");
	const ls = new UserMessageComponent("oi", undefined, 1).render(40).map(plain);
	const linha = ls.find((l) => l.includes("oi"))!;
	assert.equal(linha.indexOf("oi"), 2, `margem 1 + padding 1: «${linha}»`);
	assert.equal(linha.length, 40);
});
