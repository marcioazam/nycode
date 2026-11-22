// K19: ui-controls runtime (/focus, /color) against structural fakes and the real core components.
import assert from "node:assert/strict";
import { Spacer } from "@nycode/tui";
import { test } from "vitest";
import { ThemedText } from "../../../../src/modes/interactive/components/themed-text.ts";
import { InteractiveMode } from "../../../../src/modes/interactive/interactive-mode.ts";
import { classify, focusLines, summarize } from "../../../../src/modes/interactive/ui-controls/focus.ts";
import { COLORS, createControls, installUiControls, KEY } from "../../../../src/modes/interactive/ui-controls/index.ts";

const lines = (text: any) => (w: any) => text.split("\n").map((l: any) => l.slice(0, w));
const user = (text: any): any => ({ text, markdownTransformers: [], render: lines(text) });
const assistant = (text: any): any => ({ lastMessage: { content: [] }, hasToolCalls: false, render: lines(text) });
const tool = (toolName: any, extra: any = {}): any => ({
	toolName,
	toolCallId: `${toolName}-1`,
	args: {},
	render: lines(`[${toolName} cru]`),
	...extra,
});
const spacer = (): any => ({ lines: 1, setLines() {}, render: () => [""] }); // shape of the tui Spacer
const strip = (a: any) => a.map((l: any) => l.replace(/\x1b\[[0-9;]*m/g, ""));
const custom = (customType = "plan-gate", content = "aviso") => ({
	customRenderer: undefined,
	message: { role: "custom", customType, content, display: true },
	render: lines("[ext cru]"),
});
// texto real de backgroundCompletionText (subagent registry text)
const bgText = (state: any) => `Background subagent run r1 (swarm-worker) ${state} after 3 turns.\n\nsaída`;
const bg = (state: any) => custom("subagent-background", bgText(state));
const bash = (): any => ({ command: "ls", setComplete() {}, render: lines("[bash cru]") });

function mkHost({ mode = "fullscreen", children = [] as any[] } = {}): any {
	const container: any = {
		children,
		render() {
			return this.children.flatMap((c: any) => c.render(40));
		},
	};
	const editor: any = {
		borderColor: undefined,
		render() {
			return [typeof this.borderColor === "function" ? this.borderColor("─") : "─"];
		},
	};
	const defaultEditor: any = { borderColor: undefined };
	const host: any = {
		ui: {
			mode,
			requestRender() {
				host.renders++;
			},
		},
		renders: 0,
		chatContainer: container,
		editorContainer: {
			children: [],
			render(w: any) {
				return host.editor.render(w);
			},
		},
		editor,
		defaultEditor,
		isBashMode: false,
		errors: [],
		showError: (m: any) => host.errors.push(m as never),
		// espelha updateEditorBorderColor do core: atribui a cor nativa do nível/bash
		updateEditorBorderColor() {
			host.editor.borderColor = host.isBashMode ? (s: any) => `<bash>${s}` : (s: any) => `<think>${s}`;
		},
	};
	return host;
}

test("classify distingue componentes pela estrutura", () => {
	assert.deepEqual([user("a"), assistant("b"), tool("edit"), bash(), custom(), spacer()].map(classify), [
		"user",
		"assistant",
		"tool",
		"bash",
		"custom",
		"other",
	]);
	assert.equal(classify(bg("completed")), "bg-notice");
});

test("summarize conta ferramentas, diff de edit, subagentes e notificações dos dados reais", () => {
	const edit = tool("edit", { result: { details: { diff: "--- a\n+++ b\n+1 x\n+2 y\n-3 z\n 4 ctx" } } });
	const subs = tool("subagent", { args: { tasks: [{}, {}, {}] } });
	const one = tool("Agent");
	assert.equal(
		summarize([
			edit,
			subs,
			one,
			bash(),
			bg("completed"),
			{
				...bg("completed"),
				message: { customType: "subagent-background", content: [{ type: "text", text: bgText("completed") }] },
			},
		]),
		"⏺ 4 ferramentas · edições +2 −1 · 4 subagentes · 2 notificações em segundo plano concluídas",
	);
	assert.equal(summarize([tool("read")]), "⏺ 1 ferramenta");
	assert.equal(summarize([edit].map((e) => ({ ...e, result: { details: { diff: 42 } } }))), "⏺ 1 ferramenta");
	assert.equal(summarize([spacer(), assistant("x")]), "");
});

test("summarize não chama de concluída a falha, o erro ou a mensagem de outra extensão", () => {
	assert.equal(summarize([bg("failed")]), "⏺ 1 erro");
	assert.equal(
		summarize([bg("completed"), bg("failed"), bg("cancelled")]),
		"⏺ 1 notificação em segundo plano concluída · 2 erros",
	);
	assert.equal(summarize([custom("subagent-background", "texto fora do formato")]), "⏺ 1 erro");
	assert.equal(summarize([custom(), custom("claude-stop-hook", "x")]), "⏺ 2 mensagens de extensão ocultas");
	assert.equal(
		summarize([tool("bash", { result: { isError: true } }), tool("read", { result: { isError: false } })]),
		"⏺ 2 ferramentas · 1 erro",
	);
});

test("setTuiMode usa o switchTuiMode do core, valida e não finge sucesso", () => {
	const host = mkHost({ children: [user("p"), assistant("fim")] });
	const calls: any[] = [];
	host.switchTuiMode = (m: any) => {
		calls.push(m);
		if (host.overlay) return false;
		host.ui.mode = m;
		return true;
	};
	const c = createControls(host as never);
	c.setFocus(true);
	host.overlay = true;
	assert.throws(() => c.setTuiMode("regular"), /recusou/);
	assert.equal(c.mode(), "fullscreen");
	assert.equal(c.isFocus(), true);
	host.overlay = false;
	c.setTuiMode("regular");
	assert.equal(c.mode(), "regular");
	assert.equal(c.isFocus(), false);
	assert.deepEqual(host.chatContainer.render().length, 2); // nativo em regular
	assert.throws(() => c.setFocus(true), /fullscreen/);
	c.setTuiMode("fullscreen");
	assert.equal(c.isFocus(), false); // sem estado oculto: foco não volta sozinho
	assert.deepEqual(calls, ["regular", "regular", "fullscreen"]);
	assert.throws(() => createControls(mkHost() as never).setTuiMode("regular"), /switchTuiMode/);
});

test("focusLines mostra só o último prompt, uma linha de resumo e a resposta final", () => {
	const kids = [
		user("antigo"),
		assistant("resposta antiga"),
		spacer(),
		user("novo prompt"),
		assistant("narração intermediária"),
		tool("read"),
		tool("edit"),
		spacer(),
		assistant("resposta final"),
	];
	const out = focusLines(kids, 80);
	assert.deepEqual(
		out?.map((l) => l.replace(/\x1b\[[0-9;]*m/g, "")),
		["novo prompt", "", "⏺ 2 ferramentas", "", "resposta final"],
	);
	assert.equal(focusLines([assistant("x")], 80), null);
	assert.deepEqual(focusLines([user("só prompt")], 80), ["só prompt"]);
});

test("setFocus filtra só o render, não os filhos reais; off e reset restauram o descritor", () => {
	const kids = [user("p"), tool("read"), assistant("fim")];
	const host = mkHost({ children: kids });
	const before = Object.getOwnPropertyDescriptor(host.chatContainer, "render");
	const c = createControls(host as never);
	c.setFocus(true);
	assert.equal(c.isFocus(), true);
	assert.equal(host.chatContainer.render().length, 5);
	assert.equal(host.chatContainer.children, kids);
	assert.equal(kids.length, 3);
	c.setFocus(false);
	assert.deepEqual(host.chatContainer.render(), ["p", "[read cru]", "fim"]);
	c.setFocus(true);
	c.reset();
	assert.equal(Object.getOwnPropertyDescriptor(host.chatContainer, "render")?.value, before?.value);
	assert.equal(c.isFocus(), false);
});

test("foco acompanha streaming: filhos novos entram no próximo render", () => {
	const host = mkHost({ children: [user("p"), assistant("parcial")] });
	const c = createControls(host as never);
	c.setFocus(true);
	host.chatContainer.children.push(tool("bash") as never, assistant("parcial mais longo") as never);
	assert.deepEqual(
		host.chatContainer.render(40).map((l: string) => l.replace(/\x1b\[[0-9;]*m/g, "")),
		["p", "", "⏺ 1 ferramenta", "", "parcial mais longo"],
	);
});

test("modo regular, valor não booleano e exceção do filtro: erro explícito e render nativo", () => {
	const regular = mkHost({ mode: "regular" });
	const rc = createControls(regular as never);
	assert.throws(() => rc.setFocus(true), /fullscreen/);
	rc.setFocus(false);

	const bad = tool("edit");
	Object.defineProperty(bad, "result", {
		get() {
			throw new Error("resultado ilegível");
		},
	});
	const broken = mkHost({ children: [user("p"), bad, assistant("a")] });
	const c = createControls(broken as never);
	c.setFocus(true);
	assert.deepEqual(broken.chatContainer.render(), ["p", "[edit cru]", "a"]); // render nativo, chat não quebra
	assert.equal(c.isFocus(), false);
	assert.match(broken.errors[0], /Modo foco desligado: resultado ilegível/);
});

test("cor: validação, uso por accessor, efeito bash preservado, default restaura o nativo", () => {
	const host = mkHost();
	const c = createControls(host as never);
	host.updateEditorBorderColor();
	assert.equal(host.editor.render()[0], "<think>─");
	assert.throws(() => c.setPromptColor("magenta" as never), TypeError);
	assert.throws(() => c.setPromptColor("\x1b[31m" as never), TypeError);
	c.setPromptColor("cyan");
	assert.equal(c.getPromptColor(), "cyan");
	assert.equal(host.editorContainer.render()[0], `\x1b[38;5;${COLORS.cyan}m─\x1b[39m`);
	assert.equal(host.editor.borderColor("x"), `\x1b[38;5;${COLORS.cyan}mx\x1b[39m`);
	host.isBashMode = true;
	host.updateEditorBorderColor(); // core escreve a cor de bash como nativa
	assert.equal(host.editor.borderColor("x"), "<bash>x");
	host.isBashMode = false;
	assert.equal(host.editor.borderColor("x"), `\x1b[38;5;${COLORS.cyan}mx\x1b[39m`);
	host.updateEditorBorderColor(); // nível de raciocínio muda: override continua
	assert.equal(host.editor.borderColor("x").includes("38;5;80"), true);
	c.setPromptColor("default");
	assert.equal(host.editor.borderColor("x"), "<think>x");
});

test("cor sobrevive à troca de editor e a cópia do core não vira valor nativo", () => {
	const host = mkHost();
	const c = createControls(host as never);
	host.updateEditorBorderColor();
	c.setPromptColor("red");
	host.defaultEditor.borderColor = host.editor.borderColor; // estado antes da troca: ambos com accessor
	const novo: any = {
		borderColor: undefined,
		render() {
			return [this.borderColor?.("─")];
		},
	};
	novo.borderColor = host.defaultEditor.borderColor; // core copia defaultEditor.borderColor
	host.editor = novo;
	host.chatContainer.render();
	host.editorContainer.render(); // reconcile no render do container
	assert.equal(novo.borderColor?.("y"), `\x1b[38;5;${COLORS.red}my\x1b[39m`);
	c.setPromptColor("default");
	assert.equal(novo.borderColor?.("y"), "<think>y"); // a cópia da cor escolhida não ficou como nativa
});

test("reset devolve o campo borderColor como propriedade de dados com o valor nativo atual", () => {
	const host = mkHost();
	const c = createControls(host as never);
	host.updateEditorBorderColor();
	c.setPromptColor("pink");
	host.updateEditorBorderColor();
	c.reset();
	const d = Object.getOwnPropertyDescriptor(host.editor, "borderColor");
	assert.equal(typeof d?.value, "function");
	assert.equal(d?.value("z"), "<think>z");
	assert.equal(c.getPromptColor(), "default");
});

test("installUiControls registra o controlador global congelado, uma vez por host", () => {
	const host = mkHost();
	const a = installUiControls(host as never);
	assert.equal(installUiControls(host as never), a);
	assert.equal((globalThis as any)[KEY], a);
	assert.ok(Object.isFrozen(a));
	assert.equal(a.apiVersion, 1);
	assert.equal(a.mode(), "fullscreen");
	delete (globalThis as any)[KEY];
});

test("SDK real: showError/showWarning (Spacer + ThemedText) aparecem no foco, na ordem, sem Spacer", () => {
	assert.equal(classify(new ThemedText(() => "x") as never), "other");
	const kids = [
		user("antigo"),
		new Spacer(1),
		new ThemedText(() => "Erro antigo"),
		user("prompt"),
		assistant("resp"),
		new Spacer(1),
		new ThemedText(() => "Warning: provedor lento"),
		new Spacer(1),
		new ThemedText(() => "Error: falha real"),
	];
	const out = strip(focusLines(kids as never, 80)).map((l: any) => l.trim());
	assert.ok(out.includes("Warning: provedor lento") && out.includes("Error: falha real"));
	assert.ok(
		out.indexOf("resp") < out.indexOf("Warning: provedor lento") &&
			out.indexOf("Warning: provedor lento") < out.indexOf("Error: falha real"),
	);
	assert.ok(!out.some((l: any) => l.includes("antigo")));
});

test("foco mantém componente opaco novo do último turno em ordem cronológica, sem Spacer nem conteúdo oculto", () => {
	const opaque = (t: any) => ({ render: lines(t) });
	const kids = [
		opaque("opaco antigo"),
		user("p1"),
		opaque("opaco p1"),
		user("p2"),
		opaque("antes"),
		assistant("narra"),
		tool("read"),
		spacer(),
		opaque("meio"),
		custom(),
		assistant("final"),
		spacer(),
		opaque("depois"),
	];
	const before = [...kids];
	const out = strip(focusLines(kids, 80));
	assert.deepEqual(out, [
		"p2",
		"",
		"⏺ 1 ferramenta · 1 mensagem de extensão oculta",
		"",
		"antes",
		"",
		"meio",
		"",
		"final",
		"",
		"depois",
	]);
	assert.deepEqual(kids, before);
	assert.ok(kids.every((c, i) => c === before[i]));
	assert.ok(!out.some((l) => /narra|ext cru|read cru|antigo|p1/.test(l)));
});

test("classificação não chama render dos componentes opacos que não vão ao último turno", () => {
	let n = 0;
	const spy = {
		render() {
			n++;
			return ["x"];
		},
	};
	focusLines([spy, user("p1"), assistant("a")], 80);
	assert.equal(n, 0);
	focusLines([user("p"), spacer(), assistant("a")], 80);
});

test("K19: updateEditorBorderColor installs the controls for its host and keeps the native colour", () => {
	const editor: any = {};
	const host: any = {
		isBashMode: false,
		editor,
		session: { thinkingLevel: "off" },
		activeStatusIndicator: undefined,
		ui: { requestRender() {} },
	};
	(globalThis as any)[KEY] = undefined;
	(InteractiveMode.prototype as any).updateEditorBorderColor.call(host);
	const controls = (globalThis as any)[KEY];
	assert.equal(controls.apiVersion, 1);
	assert.equal(typeof editor.borderColor, "function");
	(globalThis as any)[KEY] = undefined;
});
