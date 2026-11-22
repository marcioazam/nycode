// node --experimental-strip-types --test ~/.nycode/agent/extensions/ui-visual/test/compact.test.ts
import assert from "node:assert/strict";
import { test } from "vitest";
import { hookContainer } from "../../../../src/extensions/chat-margin/inset.ts";
import compact, { attach, compactRender, findChat } from "../../../../src/extensions/ui-visual/compact.ts";

// Mesma forma do ToolExecutionComponent do nycode 1.5.2 com renderShell 'self': '' + linhas; a linha 0 ignora cliques.
const tool = (rows: string[], shell = "self") => {
	const clicks: number[] = [];
	return {
		toolCallId: "call",
		getRenderShell: () => shell,
		render: () => (rows.length ? ["", ...rows] : []),
		handleMouse: (e: { y: number }) => {
			if (e.y > 0) clicks.push(e.y);
			return e.y > 0 ? { handled: true } : undefined;
		},
		clicks,
	};
};
const text = (rows: string[]) => ({ render: () => rows });
const lines = (children: any[]) => compactRender(children, 80).lines;

test("tools consecutivas ficam coladas; a primeira do grupo mantém o respiro", () => {
	assert.deepEqual(lines([text(["oi"]), tool(["a"]), tool(["b"]), tool(["c", "  │ x"]), text(["", "fim"])]), [
		"oi",
		"",
		"a",
		"b",
		"c",
		"  │ x",
		"",
		"fim",
	]);
});

test("filho vazio entre duas tools não separa; texto separa", () => {
	assert.deepEqual(lines([tool(["a"]), text([]), tool(["b"])]), ["", "a", "b"]);
	assert.deepEqual(lines([tool(["a"]), text(["t"]), tool(["b"])]), ["", "a", "t", "", "b"]);
	assert.deepEqual(lines([tool(["a"]), tool([]), tool(["b"])]), ["", "a", "b"]);
});

test("só cola tools sem caixa (self): depois de uma tool com caixa o respiro fica, e a caixa nunca é tocada", () => {
	assert.deepEqual(lines([tool(["box"], "default"), tool(["a"])]), ["", "box", "", "a"]);
	assert.deepEqual(lines([tool(["a"]), tool(["box"], "default"), tool(["b"])]), ["", "a", "", "box", "", "b"]);
	// Uma tool 'self' cuja primeira linha não é o espaçador fica intacta.
	const odd = { ...tool(["a"]), render: () => ["x", "y"] };
	assert.deepEqual(lines([tool(["a"]), odd]), ["", "a", "x", "y"]);
});

test("layout: alturas batem com as linhas e o clique na linha colada chega à tool", () => {
	const first = tool(["a"]);
	const second = tool(["b", "detalhe"]);
	const { lines: out, layout } = compactRender([first, second], 80);
	assert.deepEqual(
		layout.map((l) => l.height),
		[2, 2],
	);
	assert.equal(out.length, 4);
	assert.equal(layout[0].component, first);
	// Linha 0 da segunda tool é agora o cabeçalho: o clique é repassado com o deslocamento do espaçador removido.
	assert.deepEqual(layout[1].component.handleMouse?.({ y: 0, height: 2 }), { handled: true });
	layout[1].component.handleMouse?.({ y: 1, height: 2 });
	assert.deepEqual(second.clicks, [1, 2]);
});

test("findChat acha o contêiner com tools; attach embrulha uma vez e respeita render alheio", () => {
	class Container {
		children: any[] = [];
		mouseLayout: any;
		render(_w: number): string[] {
			return ["nativo"];
		}
	}
	const chat = new Container();
	chat.children = [text(["oi"]), tool(["a"]), tool(["b"])];
	const doc = new Container();
	doc.children = [new Container(), chat];
	const tui = { children: [doc, new Container()] };
	assert.equal(findChat(tui), chat);
	assert.equal(findChat({ children: [new Container()] }), undefined);
	assert.equal(findChat(undefined), undefined);
	assert.equal(attach(chat as any), true);
	assert.deepEqual(chat.render(80), ["oi", "", "a", "b"]);
	assert.deepEqual(
		chat.mouseLayout.children.map((c: any) => c.height),
		[1, 2, 1],
	);
	assert.equal(chat.mouseLayout.width, 80);
	const wrapped = chat.render;
	assert.equal(attach(chat as any), true);
	assert.equal(chat.render, wrapped);
	const foreign = new Container();
	foreign.render = () => ["outro"];
	assert.equal(attach(foreign as any), false);
	assert.deepEqual(foreign.render(80), ["outro"]);
});

test("extensão: widget sem linhas que embrulha o chat quando a primeira tool aparece; nada em subagente ou sem UI", () => {
	const saved = process.env.NYCODE_SUBAGENT;
	delete process.env.NYCODE_SUBAGENT;
	try {
		class Container {
			children: any[] = [];
			render(_w: number): string[] {
				return ["nativo"];
			}
		}
		const chat = new Container();
		const tui = { children: [chat] };
		let start: any;
		compact({
			on: (_n: string, h: unknown) => {
				start = h;
			},
		} as any);
		let factory: any;
		start({}, { hasUI: false, ui: { setWidget: () => assert.fail("sem UI não registra") } });
		start(
			{},
			{
				hasUI: true,
				ui: {
					setWidget: (_n: string, f: unknown) => {
						factory = f;
					},
				},
			},
		);
		const widget = factory(tui);
		assert.deepEqual(widget.render(80), []);
		assert.deepEqual(chat.render(80), ["nativo"]);
		chat.children = [tool(["a"]), tool(["b"])];
		assert.deepEqual(widget.render(80), []);
		assert.deepEqual(chat.render(80), ["", "a", "b"]);
		process.env.NYCODE_SUBAGENT = "1";
		const events: string[] = [];
		compact({ on: (n: string) => events.push(n) } as any);
		assert.deepEqual(events, []);
	} finally {
		if (saved === undefined) delete process.env.NYCODE_SUBAGENT;
		else process.env.NYCODE_SUBAGENT = saved;
	}
});

// U6: com o chat-margin e a compactação no mesmo contêiner, a ordem de instalação não pode perder nenhum dos dois.
class Cont {
	children: any[] = [];
	mouseLayout: any;
	render(w: number): string[] {
		return this.children.flatMap((c) => c.render(w));
	}
}
const widgetDe = (chat: Cont) => {
	const saved = process.env.NYCODE_SUBAGENT;
	delete process.env.NYCODE_SUBAGENT;
	try {
		let start: any, factory: any;
		compact({
			on: (_n: string, h: unknown) => {
				start = h;
			},
		} as any);
		start(
			{},
			{
				hasUI: true,
				ui: {
					setWidget: (_n: string, f: unknown) => {
						factory = f;
					},
				},
			},
		);
		return factory({ children: [chat] });
	} finally {
		if (saved === undefined) delete process.env.NYCODE_SUBAGENT;
		else process.env.NYCODE_SUBAGENT = saved;
	}
};

test("U6: chat-margin instalado antes: a compactação ainda instala e o filtro dos filhos continua rodando", () => {
	const chat = new Cont();
	const vistos: any[] = [];
	hookContainer(chat, (c) => vistos.push(c));
	chat.children = [tool(["a"]), tool(["b"])];
	const widget = widgetDe(chat);
	widget.render(80);
	assert.deepEqual(chat.render(80), ["", "a", "b"]);
	assert.equal(vistos.length, 2);
});

test("U6: attach recusado não encerra a busca: o widget tenta de novo no quadro seguinte", () => {
	const chat = new Cont();
	chat.children = [tool(["a"]), tool(["b"])];
	const alheio = () => ["alheio"];
	chat.render = alheio;
	const widget = widgetDe(chat);
	widget.render(80);
	assert.equal(chat.render, alheio);
	delete (chat as any).render;
	widget.render(80);
	assert.deepEqual(chat.render(80), ["", "a", "b"]);
});

test("U6: compactação instalada antes: o chat-margin encadeia e não a sobrescreve", () => {
	const chat = new Cont();
	chat.children = [tool(["a"]), tool(["b"])];
	assert.equal(attach(chat as any), true);
	const vistos: any[] = [];
	const undo = hookContainer(chat, (c) => vistos.push(c));
	assert.deepEqual(chat.render(80), ["", "a", "b"]);
	assert.equal(vistos.length, 2);
	undo();
	assert.deepEqual(chat.render(80), ["", "a", "b"]);
});

// U8: filhos que devolvem as mesmas referências não refazem lines e layout.
test("U8: mesmas referências e largura reaproveitam o layout; saída igual à recalculada", () => {
	const chat = new Cont();
	const rowsA = ["", "a"],
		rowsB = ["", "b", "x"];
	const a = { ...tool([]), render: () => rowsA },
		b = { ...tool([]), render: () => rowsB };
	chat.children = [a, b];
	attach(chat as any);
	const out1 = chat.render(80);
	const layout1 = chat.mouseLayout.children;
	const out2 = chat.render(80);
	assert.deepEqual(out2, out1);
	assert.equal(chat.mouseLayout.children, layout1);
	assert.deepEqual(out1, compactRender(chat.children, 80).lines);
	chat.render(60);
	assert.notEqual(chat.mouseLayout.children, layout1);
	assert.equal(chat.mouseLayout.width, 60);
	b.render = () => ["", "b2"];
	assert.deepEqual(chat.render(60), ["", "a", "b2"]);
});
