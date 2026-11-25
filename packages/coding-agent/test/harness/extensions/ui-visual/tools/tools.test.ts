// node --experimental-strip-types --test ~/.nycode/agent/extensions/ui-visual/test/tools/tools.test.ts
import assert from "node:assert/strict";
import { test } from "vitest";
import * as __m1 from "../../../../../src/extensions/ui-visual/icons.ts";
import {
	ansiPlain,
	ansiTags,
	BGC,
	base,
	bgTheme,
	body,
	ctx,
	ficha,
	header,
	icon,
	mod,
	OPEN,
	plain,
	reguaRun,
	resolverOf,
	result,
	row,
	semRespiro,
	tg,
	theme,
	toolIcon,
	visibleWidth,
	wrapped,
} from "./base.ts";

const { iconGap } = __m1;
// Régua Run: antes `$ comando` e hora à direita; agora `<ícone> Run ─ comando ───── hora` e corpo/rodapé recuados até o `Run`.
// Prefixos de icon('bash') e iconGap() da cópia tmp (base.ts fixa o terminal): independem de TERM.
const G = iconGap();
const P = `▎ ${" ".repeat(1 + G.length)}`; // corpo e rodapé: trilho + recuo até o `Run`
const regua = (cmd: string, hora = "", w = 80, estado = "OK") => reguaRun(icon("bash"), G, cmd, hora, w, estado);

test("resolver: só registerToolRenderer, undefined sem base; demais ferramentas ganham ícone no renderCall", () => {
	const { calls, resolver } = resolverOf();
	assert.deepEqual(calls, ["registerToolRenderer"]);
	const other = resolver("mcp__x", () => ({
		keep: "y",
		renderCall: base().renderCall,
		renderResult: base().renderResult,
	}));
	assert.equal(other.keep, "y");
	assert.equal(typeof other.renderResult, "function");
	assert.notEqual(other.renderCall, base().renderCall);
	// 2026-11-14: tool sem renderCall próprio (ex.: run) também ganha estado, ícone e hora, em vez de voltar intacta.
	assert.equal(typeof resolver("mcp__x", () => ({ keep: 1 })).renderCall, "function");
	assert.equal(
		resolver("mcp__x", () => undefined),
		undefined,
	);
	assert.equal(
		resolver("bash", () => undefined),
		undefined,
	);
	const out = resolver("read", base);
	assert.equal(out.keep, "x");
	assert.notEqual(out.renderCall, base().renderCall);
});

test("subagente não registra nada", () => {
	assert.deepEqual(resolverOf({ NYCODE_SUBAGENT: "1" }).calls, []);
});

test("formatDuration: fronteiras", () => {
	const f = mod.formatDuration;
	assert.equal(f(0), "0.0s");
	assert.equal(f(400), "0.4s");
	assert.equal(f(999), "0.9s");
	assert.equal(f(1234), "1.2s");
	assert.equal(f(9999), "9.9s");
	assert.equal(f(10_000), "10s");
	assert.equal(f(59_999), "59s");
	assert.equal(f(60_000), "1m 00s");
	assert.equal(f(65_000), "1m 05s");
	assert.equal(f(-5), "0.0s");
	assert.equal(f(Number.NaN), "0.0s");
});

// Título e tarefa separados por bolinha (`bash · cd /tmp`); antes dois espaços e verbo em coluna fixa.
// Antigo: `✓ ícone read · alvo`. Novo: sem ícone de estado; o nome do estado na cor dele vem após o nome da tool.
test("cabeçalho por ferramenta: ícone, nome, estado por nome, alvo; ícone por tool em muted", () => {
	assert.equal(header("read", { path: "/work/proj/src/a.ts" }), `  ${icon("read")} read · src/a.ts`);
	assert.ok(header("write", { path: "/outro/b.ts" }).includes("/outro/b.ts"));
	// Variante 2 do edit: nome do arquivo em destaque + pasta à esquerda, estado à direita.
	// Edit no estilo do Read: antes `  ● y.ts  x/ … concluído`; agora `ícone Edit · arquivo · pasta ───`, na coluna 0 e sem `concluído`.
	assert.match(header("edit", { file_path: "/work/proj/x/y.ts" }), /^● Edit · y\.ts · x\/ ─+$/);
	assert.ok(header("ls", {}).endsWith("ls · ."));
	assert.ok(header("ls", { path: "/work/proj" }).endsWith("ls · ."));
	assert.ok(header("grep", { pattern: "foo", path: "/work/proj/src" }).endsWith("grep · foo em src"));
	assert.ok(header("find", { pattern: "x.ts" }).endsWith("find · x.ts"));
	// Variante 04: antes o bash era uma linha `ícone $ cmd` (com `(timeout 30s)`); agora é o cartão do shell:
	// trilho `▎` + título régua e rodapé de estado. O timeout deixou de aparecer no título.
	// antes `Bash ─ cmd ───` e rodapé `OK`; agora `Bash · OK · cmd` e sem rodapé vazio. (2026-11-18: antes `▎ $ cmd` e rodapé `▎ OK`; agora `▎ <ícone> Run ─ cmd ─────` e rodapé recuado até o `Run`.
	// Largura inteira e respiro: antes o cartão parava em 72 colunas em w = 200 e começava no título; agora
	// tem w = 200 e uma linha de respiro em cima e embaixo (semRespiro as exige e tira).
	const bashRows = (args: Record<string, unknown>) =>
		semRespiro(wrapped("bash").renderCall(args, ansiPlain, ctx({ args })).render(200), 200).map((l: string) =>
			plain(l).trimEnd(),
		);
	assert.deepEqual(bashRows({ command: "ls -la" }), [regua("ls -la", "", 200)]);
	assert.deepEqual(bashRows({ command: "echo a\necho b" }), [regua("echo a…", "", 200)]);
	assert.equal(bashRows({ command: "sleep 9", timeout: 30 })[0], regua("sleep 9", "", 200));
	// Fundo de volta (2026-11-15): shell padrão do nycode (Box com fundo e outputPad), nunca 'self'.
	// Antigo: edit também no shell padrão. Novo: edit é 'self' e pinta a própria caixa neutra.
	// Cartão 08: read/bash/grep/find/ls pintam o próprio cartão ('self'); só o write segue no shell padrão.
	// Write no estilo do Read: antes o write seguia no shell padrão (fundo verde); agora também 'self'.
	for (const name of ["read", "write", "bash", "grep", "find", "ls"])
		assert.equal(wrapped(name).renderShell, "self", name);
	assert.equal(wrapped("edit").renderShell, "self");
	// Variante 04: antes o ícone do bash abria o cartão (coluna 3, em muted); agora é o trilho `▎` na cor do estado.
	const trilho = wrapped("bash")
		.renderCall({ command: "x" }, theme, ctx({ args: { command: "x" } }))
		.render(80)[0];
	assert.equal(plain(trilho).slice(0, 2), "▎ ", "trilho na coluna 0, alinhado ao texto");
	assert.ok(trilho.includes("<success>▎</c>"));
});

test("read: offset e limit", () => {
	assert.ok(header("read", { path: "a", offset: 10, limit: 20 }).includes("a :10-30"));
	assert.ok(header("read", { path: "a", limit: 5 }).includes("a :1-6"));
	assert.ok(header("read", { path: "a", offset: 7 }).includes("a :7"));
});

// Antigo: bolinha, ✓ e ✕ antes do ícone. Novo: só o nome do estado, na cor dele, após o nome da tool.
test("status: executando e erro por nome e cor, sucesso sem rótulo; duração a partir de 1 s", () => {
	const c = wrapped("bash");
	const args = { command: "x" };
	// Variante 04: antes o estado ia no título do bash (`· executando`, `· erro`) e a duração no fim da
	// linha; agora o estado e a duração ficam no rodapé do cartão (`OK · 1.2s`, `Erro`). Tema `tg`: marcas de largura zero.
	// Respiro: antes o rodapé era a última linha; agora vem antes da linha de respiro (semRespiro a exige e tira).
	const rows = (o: Record<string, unknown>) =>
		semRespiro(c.renderCall(args, ansiTags, ctx({ args, ...o })).render(200), 200);
	// antes o estado abria o rodapé (`OK · 1.2s`); agora está no título e o rodapé final só tem a duração; sem nada, some.
	const foot = (o: Record<string, unknown>) => (rows(o).length === 1 ? "" : plain(rows(o).at(-1) ?? "").trimEnd());
	assert.ok(rows({ isPartial: true })[0].includes(tg("accent", "executando")));
	assert.equal(foot({ isPartial: true }), `${P}executando`);
	assert.equal(foot({ isPartial: false }), "");
	assert.ok(rows({ isPartial: false })[0].includes(tg("success", "OK")));
	assert.ok(rows({ isPartial: false, isError: true })[0].includes(tg("error", "Erro")));
	for (const [o, e] of [
		[{ isPartial: true }, "executando"],
		[{}, "OK"],
		[{ isError: true }, "Erro"],
	] as const)
		assert.ok(
			plain(rows(o)[0]).startsWith(`▎ ${icon("bash")}${G}Bash · ${e} · x`),
			"trilho, ícone, Bash e o estado logo depois",
		); // antes `Bash ─ x`
	assert.equal(foot({ durationMs: 1234 }), `${P}1.2s`);
	assert.equal(foot({ durationMs: 1000 }), `${P}1.0s`);
	assert.equal(foot({ durationMs: 999 }), "");
	assert.equal(foot({ durationMs: 0 }), "");
	assert.ok(!/\d+\.\ds$/.test(foot({ isPartial: true })));
});

test("args incompletos ou ausentes mostram …", () => {
	// Antigo: argsComplete=false sempre dava …. O nycode 1.5.2 só chama setArgsComplete no fim do streaming; ao reconstruir o
	// histórico (resume/reload) e em tool_execution_start sem stream nunca chama, e o write mostrava `write · …` com o resultado
	// já pronto. Novo: … só enquanto não há resultado (isPartial true).
	assert.ok(
		header("read", { path: "/a" }, { argsComplete: false, isPartial: true }).endsWith("read · executando · …"),
	);
	assert.ok(
		header("write", { path: "/work/proj/a.ts", content: "x" }, { argsComplete: false, isPartial: false }).includes(
			"write · a.ts",
		),
	);
	assert.ok(header("read", {}).endsWith("read · …"));
	// Variante 04: antes o bash sem comando mostrava `ícone …`; agora `Run ─ …` dentro do cartão.
	// Régua Run: antes `▎ $ …`; agora `▎ <ícone> Run ─ … ─────`.
	// Respiro: antes título e rodapé; agora com uma linha de respiro em cima e embaixo (semRespiro).
	assert.deepEqual(
		semRespiro(
			wrapped("bash")
				.renderCall({}, ansiPlain, ctx({ args: {} }))
				.render(80),
		).map((l: string) => plain(l).trimEnd()),
		[regua("…")],
	);
	assert.ok(header("grep", {}).endsWith("grep · …"));
	// Bug do nycode: argsComplete só vira true ao fim do streaming; quando a chamada nasce em tool_execution_start (executionStarted)
	// os args já estão prontos e o cabeçalho não pode ficar `· executando · …` para sempre.
	const iniciada = { argsComplete: false, isPartial: true, executionStarted: true };
	assert.ok(
		header("read", { path: "/a" }, iniciada).endsWith("read · executando · /a"),
		header("read", { path: "/a" }, iniciada),
	);
	assert.ok(
		header("read", { path: "/a" }, { ...iniciada, executionStarted: false }).endsWith("read · executando · …"),
	);
	// Régua Run: antes `▎ $ ls` e, preparando, `▎ $ …`; agora `Run ─ ls` e, preparando, o comando parcial (muted) + cursor (a célula final do esperado).
	const bashPartial = (args: Record<string, unknown>, c: Record<string, unknown>) =>
		plain(
			semRespiro(
				wrapped("bash")
					.renderCall(args, ansiPlain, ctx({ args, ...c }))
					.render(80),
			)[0],
		).trimEnd();
	assert.equal(bashPartial({ command: "ls" }, iniciada), regua("ls", "", 80, "executando")); // antes `Bash ─ ls`
	// Barra que respira: antes o cursor do comando chegando era `▌`; agora `▏`.
	assert.equal(
		bashPartial({ command: "ls" }, { ...iniciada, executionStarted: false })
			.replace("▏", " ")
			.trimEnd(),
		regua("ls", "", 80, "recebendo"),
	);
});

// antes a linha da chamada parava em 100 colunas e o cartão em 58; agora o cartão (read, grep) tem
// exatamente w e as demais linhas (edit) só não passam de w.
test("largura: nenhuma linha passa de w; o cartão da chamada ocupa a largura inteira", () => {
	const long = `/work/proj/${"dir/".repeat(40)}arquivo.ts`;
	const cmd = `echo ${"x".repeat(300)}`;
	for (const w of [40, 60, 100, 200]) {
		for (const [name, args] of [
			["read", { path: long, offset: 1, limit: 9 }],
			["grep", { pattern: cmd, path: long }],
			["edit", { path: long }],
		] as const) {
			const line = wrapped(name)
				.renderCall(args, ansiPlain, ctx({ args, durationMs: 65_000 }))
				.render(w);
			assert.equal(line.length, 1);
			if (name !== "edit") assert.equal(visibleWidth(plain(line[0])), w, `${name} w=${w}`);
			assert.ok(
				line.every((l: string) => visibleWidth(plain(l)) <= w),
				`${name} w=${w}`,
			);
			assert.ok(plain(line[0]).includes("1m 05s"), `${name} w=${w}: ${plain(line[0])}`);
		}
		// Variante 04: antes o bash entrava neste laço (1 linha, 1m 05s no título) e o resultado era medido aqui;
		// agora a largura do cartão do shell é testada em shell.test.ts.
	}
	// Antigo (até 2026-11-14): resumo alinhado à direita, linha com exatamente min(w, 100). Novo:
	// resumo colado ao alvo, à esquerda, separado por ` · `; a linha não é preenchida até a borda.
	const aligned = (name: string, args: Record<string, unknown>, text: string, w: number) => {
		const shared = ctx({ args });
		const call = wrapped(name).renderCall(args, ansi, shared);
		wrapped(name).renderResult(result(text), { expanded: false, isPartial: false }, ansi, shared);
		return ficha(call.render(w)[0]);
	};
	assert.equal(aligned("read", { path: "a" }, "x\ny", 200), `  ${icon("read")} read · a · 2 linhas`);
	assert.equal(aligned("read", { path: "a" }, "x\ny", 60), `  ${icon("read")} read · a · 2 linhas`);
	assert.ok(aligned("read", { path: "a" }, "x\ny", 60).endsWith(" · 2 linhas"));
	// Sem espaço para o resumo (mais da metade da largura), ele sai e o título fica (cortado na largura).
	const estreito = aligned("grep", { pattern: "abc" }, "a\nb", 20);
	assert.ok(
		estreito.startsWith(`  ${icon("grep")} grep · `) &&
			!estreito.includes("resultado") &&
			visibleWidth(estreito) <= 20,
		estreito,
	);
});

test("expandido e bash parcial delegam ao nativo, recuados sob o verbo; demais parciais ficam vazios", () => {
	assert.deepEqual(body("read", result("a"), {}, { expanded: true }), ["    native-result"]);
	// Variante 04: antes o bash parcial/expandido delegava ao nativo; agora o resultado do bash nunca desenha
	// (o cartão da chamada mostra tudo, inclusive expandido).
	assert.deepEqual(body("bash", result("a"), {}, { isPartial: true }), []);
	assert.deepEqual(body("bash", result("a"), {}, { expanded: true }), []);
	assert.deepEqual(body("grep", result("a"), {}, { isPartial: true }), []);
	// Antigo (até 2026-11): edit com diff delegava ao nativo (['    native-result']). Novo: renderer inline próprio (diff.ts).
	assert.equal(body("edit", result("a", { diff: "+1 a" }))[0].trimEnd(), "  1 +  a");
	// O nativo recebe a largura já descontada do recuo esquerdo (indent) e do recuo direito (RECUO = 2).
	const seen: number[] = [];
	const b = {
		renderCall: base().renderCall,
		renderResult: () => ({
			render: (w: number) => {
				seen.push(w);
				return ["x"];
			},
			invalidate() {},
		}),
	};
	resolverOf()
		.resolver("read", () => b)
		.renderResult(result("a"), { expanded: true }, theme, ctx())
		.render(80);
	assert.deepEqual(seen, [74]);
});

// Regressão 2026-11-14 (captura real-tools-expandidas): os renderers nativos reaproveitam context.lastComponent
// (`lastComponent ?? new Text()` + setText). O nycode passa ali o NOSSO componente anterior; o nativo quebrava, o nycode caía
// no texto cru, sem recuo e sem cor de erro (achado C04 da auditoria).
test("nativo recebe o próprio componente anterior como lastComponent, nunca o nosso", () => {
	const made: unknown[] = [];
	const seen: unknown[] = [];
	const nativeLike = (_r: unknown, o: { expanded?: boolean }, _t: unknown, c: { lastComponent?: any }) => {
		seen.push(c.lastComponent);
		const text = c.lastComponent ?? {
			rows: [] as string[],
			setText(t: string) {
				this.rows = t.split("\n");
			},
			render() {
				return this.rows;
			},
			invalidate() {},
		};
		if (!c.lastComponent) made.push(text);
		text.setText(o.expanded ? "\n\nsaída inteira" : "resumo nativo");
		return text;
	};
	const w0 = resolverOf().resolver("read", () => ({ renderCall: base().renderCall, renderResult: nativeLike }));
	const shared = ctx({ args: { path: "a" } });
	// 1º desenho colapsado: devolvemos um componente nosso; o nycode o entrega de volta como lastComponent.
	const ours = w0.renderResult(result("a"), { expanded: false, isPartial: false }, theme, shared);
	const first = w0.renderResult(result("a"), { expanded: true, isPartial: false }, theme, {
		...shared,
		lastComponent: ours,
	});
	// Linhas em branco iniciais do nativo saem: o detalhe começa colado na linha da chamada.
	assert.deepEqual(first.render(80), ["    saída inteira"]);
	const second = w0.renderResult(result("a"), { expanded: true, isPartial: false }, theme, {
		...shared,
		lastComponent: first,
	});
	assert.deepEqual(second.render(80), ["    saída inteira"]);
	assert.equal(made.length, 1, "o nativo reaproveita o próprio componente");
	assert.deepEqual(seen, [undefined, made[0]]);
});

test("erro: estado após · em error; indentação da saída sem │ no bash", () => {
	// Antigo: `✕ ícone read · a · erro`. Novo: o estado vai por nome no título, logo após a tool.
	const read = row("read", { path: "a" }, result("\nENOENT: no such file\nmais"), { isError: true });
	assert.equal(read[0], `  ${icon("read")} read · erro · a`);
	assert.deepEqual(read.slice(1), ["    │ ENOENT: no such file"]);
	assert.deepEqual(body("write", result(""), { isError: true }), []);
	const raw = wrapped("read")
		.renderResult(result("falhou"), { expanded: false }, theme, ctx({ isError: true }))
		.render(80);
	assert.equal(raw[0], "    <dim>│</c> <error>falhou</c>");
	// Variante 04: antes o estado do bash ia a `state.uiStatus` (`código 2`) e a saída era recuada sob o título;
	// agora o resultado grava a saída separada em `state.uiShell` (`Erro 2`); o desenho do cartão está em shell.test.ts.
	const shared = ctx({ isError: true });
	const vazio = wrapped("bash").renderResult(
		result("x\n\nCommand exited with code 2"),
		{ expanded: false },
		theme,
		shared,
	);
	assert.deepEqual(vazio.render(80), []);
	assert.equal((shared.state as { uiShell: { estado: unknown } }).uiShell.estado, "Erro 2");
	assert.deepEqual((shared.state as { uiShell: { linhas: unknown } }).uiShell.linhas, ["x"]);
});

test("resumos: uma linha por chamada, resumo colado ao alvo após ·", () => {
	const one = (name: string, args: Record<string, unknown>, r: unknown) => {
		const lines = row(name, args, r);
		assert.equal(lines.length, 1, name);
		return lines[0];
	};
	assert.ok(one("read", { path: "a" }, result("a\nb\nc\n")).endsWith(" · 3 linhas"));
	assert.ok(one("read", { path: "a" }, result("a")).endsWith(" · 1 linha"));
	// Margem acima da imagem: antes o Read de imagem era só a linha do resumo; agora vem uma linha vazia
	// de margem depois dela (o resultado devolve ['']), e a imagem do nycode entra abaixo.
	{
		const l = row("read", { path: "a" }, { content: [{ type: "image" }] });
		assert.equal(l.length, 2);
		assert.doesNotMatch(l[0]!, /imagem/); /* sem o tipo: antes terminava em ` · imagem` */
		assert.equal(l[1]!.trim(), "");
	}
	assert.ok(
		one("read", { path: "a" }, result("a\nb", { truncation: { truncated: true } })).endsWith(
			" · 2 linhas · truncado",
		),
	);
	assert.ok(one("write", { path: "a", content: "x\ny\n" }, result("ok")).endsWith(" · 2 linhas"));
	assert.ok(one("write", { path: "a" }, result("ok")).endsWith(" · 0 linhas"));
	assert.ok(
		one("grep", { pattern: "x" }, result("a:1:x\nb:2:y\n\n[100 matches limit reached]")).endsWith(" · 2 resultados"),
	);
	assert.ok(one("find", { pattern: "x" }, result("a.ts")).endsWith(" · 1 resultado"));
	assert.ok(one("grep", { pattern: "x" }, result("No matches found")).endsWith(" · nenhum resultado"));
	assert.ok(one("ls", {}, result("(empty directory)")).endsWith(" · nenhum resultado"));
	// Variante 04: antes o bash sem saída era 1 linha `ícone $ x`; agora o cartão tem título e rodapé `OK`.
	// Largura inteira e respiro: antes 72 colunas em w = 200, sem respiro; agora w = 200 com respiro.
	assert.deepEqual(
		(() => {
			const w0 = wrapped("bash"),
				c0 = ctx({ args: { command: "x" } });
			w0.renderResult(result(""), { expanded: false, isPartial: false }, ansiPlain, c0);
			return semRespiro(w0.renderCall({ command: "x" }, ansiPlain, c0).render(200), 200).map(plain);
		})().map((l: string) => l.trimEnd()),
		[regua("x", "", 200)],
	);
	// Sem context.state (nycode antigo): não quebra, só não há resumo.
	assert.deepEqual(
		wrapped("read")
			.renderResult(result("a"), { expanded: false }, theme, ctx({ state: undefined }))
			.render(80),
		[],
	);
});

// Variante 04: o teste 'bash: comando e atalho no cabeçalho, saída recuada sem │' (cartão 08: prévia recuada,
// `⋯ N linhas acima`, `ctrl+o abre/fecha`, bash-clamp) foi para shell.test.ts, que cobre o cartão novo.

test("edit (Variante 2): arquivo protagonista + placar + barra proporcional à esquerda, estado à direita e sinais +/−", () => {
	const r = resolverOf().resolver("edit", () => ({ renderCall: base().renderCall }));
	const shared = ctx({ args: { path: "a" } });
	const call = r.renderCall({ path: "a" }, ansiPlain, shared);
	const res = r.renderResult(result("ok", { diff: " 1 a\n-2 b\n+2 c\n+3 d" }), { expanded: false }, ansiPlain, shared);
	assert.deepEqual(
		res.render(80).map((l: string) => plain(l).trimEnd()),
		["  1    a", "  2 −  b", "  2 +  c", "  3 +  d"],
	);
	// Edit no estilo do Read: antes `  ● a  ·  +2 −1  ━━━ … concluído`; agora `· ` entre as partes, régua e sem `concluído`.
	assert.match(plain(call.render(200)[0]), /^● Edit · a · \+2 −1 {2}━━━ ─+$/);
	const native = row("edit", { path: "a" }, result("ok", { diff: "-1 a\n+1 b" }));
	assert.match(native[0], /^● Edit · a · \+1 −1 {2}━━ ─+$/);
	assert.deepEqual(
		native.slice(1).map((l: string) => l.trimEnd()),
		["  1 −  a", "  1 +  b"],
	);
	assert.deepEqual(
		body("edit", result("ok", { diff: "+1 z" }), {}, { expanded: true }, 80).map((l: string) => l.trimEnd()),
		["  1 +  z"],
	);
	assert.deepEqual(body("edit", result("ok", { diff: "" }), {}, { expanded: true }), ["    native-result"]);
	assert.deepEqual(body("edit", result("ok")), ["    native-result"]);
	assert.deepEqual(body("edit", result("boom", { diff: "+1 z" }), { isError: true }), ["    │ boom"]);
});

test("edit: falha ao desenhar o diff cai no nativo", () => {
	const bad = {
		...theme,
		bg: () => {
			throw new Error("x");
		},
		getBgAnsi: () => "",
	};
	const r = wrapped("edit").renderResult(result("ok", { diff: "+1 z" }), { expanded: false }, bad, ctx());
	assert.deepEqual(r.render(40), ["    native-result"]);
});

test("exceção cai no nativo", () => {
	const boom = {
		get content(): never {
			throw new Error("x");
		},
	};
	assert.deepEqual(wrapped("read").renderResult(boom, { expanded: false }, theme, ctx()).render(80), [
		"    native-result",
	]);
	const badCtx = {
		get args(): never {
			throw new Error("x");
		},
	};
	assert.deepEqual(wrapped("read").renderCall({}, theme, badCtx).render(80), ["native-call"]);
	const noBase = resolverOf().resolver("read", () => ({}));
	assert.deepEqual(noBase.renderResult(boom, { expanded: false }, theme, ctx()).render(80), []);
	assert.deepEqual(noBase.renderCall({}, theme, badCtx).render(80), []);
});

// Regressão 2026-11-13: o corte inseria ESC[0m e um fundo ativo sumia antes de `…` e da duração.
// Desde a Onda 3 a tool não tem mais Box; o contrato de `fitLine` segue valendo para quem pinta fundo por fora.
// Modelo de terminal: percorre os SGR e exige fundo ligado em cada caractere visível.
const BG_ON = "\x1b[48;5;236m";
const BG_OFF = "\x1b[49m";
const ansi = {
	fg: (c: string, t: string) => `\x1b[38;5;${c === "dim" ? 244 : 111}m${t}\x1b[39m`,
	bold: (t: string) => `\x1b[1m${t}\x1b[22m`,
};
const box = (row: string) => `${BG_ON}${row}${BG_OFF}`;
const unpainted = (line: string): string => {
	let bg = false;
	let out = "";
	for (const part of line.split(/(\x1b\[[0-9;]*m)/)) {
		const m = /^\x1b\[([0-9;]*)m$/.exec(part);
		if (!m) {
			if (!bg) out += part;
			continue;
		}
		const codes = m[1] === "" ? ["0"] : m[1].split(";");
		for (let i = 0; i < codes.length; i++) {
			const c = Number(codes[i]);
			if (c === 0 || c === 49) bg = false;
			else if (c === 48) {
				bg = true;
				i += codes[i + 1] === "5" ? 2 : 4;
			} else if (c === 38) i += codes[i + 1] === "5" ? 2 : 4;
		}
	}
	return out;
};
const realWidth = (s: string) => [...plain(s)].length; // ASCII e `…` (1 coluna)

test("fundo do Box sobrevive ao corte do cabeçalho (…, duração)", () => {
	// O comando do bash saiu do título (2026-11-15): o corte do título é exercitado com o padrão longo do grep.
	const args = { pattern: "x".repeat(120) };
	const head = (w: number) =>
		wrapped("grep")
			.renderCall(args, ansi, ctx({ args, durationMs: 65_000 }))
			.render(w)[0];
	for (const w of [30, 60, 100]) {
		const row = head(w);
		assert.ok(plain(row).includes("…"), `corta w=${w}`);
		assert.ok(ficha(row).endsWith(" 1m 05s"));
		assert.ok(realWidth(row) <= w, `largura w=${w}`);
		assert.equal(unpainted(box(row)), "", `fundo w=${w}`);
		assert.ok(!row.includes("\x1b[0m"), "sem reset total");
	}
	// Variante 04: o trecho do bash (cartão 08 de 60 colunas, `justo`) saiu daqui; o fundo do cartão do shell
	// e seu corte estão em shell.test.ts.
	const short = wrapped("read")
		.renderCall({ path: "a" }, ansi, ctx({ args: { path: "a" }, durationMs: 400 }))
		.render(200)[0];
	assert.equal(unpainted(box(short)), "");
	assert.ok(!short.includes("\x1b[0m") && short.includes("\x1b[38;5;111m") && short.includes("\x1b[1m"));
});

test("fundo sobrevive ao corte das linhas de resultado; corte não vaza negrito/cor", () => {
	// Variante 04: o corte da linha de resultado do bash (renderResult com 1 linha `…`) virou o corte do corpo do
	// cartão, testado em shell.test.ts; aqui fica o contrato de `fitLine`.
	// Corte dentro do negrito: o reset parcial fecha negrito e cor.
	const cut = mod.fitLine(`\x1b[1m\x1b[38;5;111m${"z".repeat(50)}\x1b[39m\x1b[22m`, 10);
	assert.ok(/\x1b\[22;23;24;27;29;39m…\x1b\[22;23;24;27;29;39m$/.test(cut));
	assert.equal(mod.fitLine("abc", 10), "abc");
});

// Contrato D (2026-11-15): ícone também nas demais ferramentas, só na 1ª linha do renderCall.
// 2026-11-14: o estado (✓ ✕ ▲ ou bolinha) vinha antes do ícone. 2026-11-15: sem ícone de estado; o nome do estado
// entra após o nome da tool ou, se a linha nativa não começa por ele, abre a linha.
test("outras ferramentas: ícone muted na 1ª linha; lastComponent da base guardado em state.uiCall", () => {
	const seen: unknown[] = [];
	const nativeCall = (_a: unknown, _t: unknown, c: { lastComponent?: any }) => {
		seen.push(c.lastComponent);
		const t = c.lastComponent ?? {
			rows: [] as string[],
			setText(x: string) {
				this.rows = x.split("\n");
			},
			render() {
				return this.rows;
			},
			invalidate() {},
		};
		t.setText("subagent foo\nsegunda");
		return t;
	};
	const w0 = resolverOf().resolver("mcp__x", () => ({ renderCall: nativeCall, renderResult: base().renderResult }));
	const shared = ctx();
	const first = w0.renderCall({}, theme, shared);
	const esperado = [`  <muted>${icon(toolIcon("mcp__x"))}</c> subagent foo`, "  segunda"];
	assert.deepEqual(first.render(80), esperado);
	// O nycode devolve o nosso componente como lastComponent; a base recebe o dela.
	const second = w0.renderCall({}, theme, { ...shared, lastComponent: first });
	assert.deepEqual(second.render(80), esperado);
	assert.deepEqual(seen, [undefined, (shared.state as { uiCall?: unknown }).uiCall]);
	assert.ok((shared.state as { uiCall?: unknown }).uiCall);
	// Sem state: base intacta; base sem renderCall: intacta; erro: cai na base.
	const raw = resolverOf().resolver("mcp__x", () => ({ renderCall: base().renderCall }));
	assert.deepEqual(raw.renderCall({}, theme, { ...ctx(), state: undefined }).render(80), ["native-call"]);
	const boom = resolverOf().resolver("mcp__x", () => ({
		renderCall: () => {
			throw new Error("x");
		},
	}));
	assert.throws(() => boom.renderCall({}, theme, ctx()));
	const wrapOnly = resolverOf().resolver("mcp__x", () => ({ renderCall: base().renderCall }));
	assert.deepEqual(wrapOnly.renderCall({}, theme, ctx()).render(80), [
		`  <muted>${icon(toolIcon("mcp__x"))}</c> native-call`,
	]);
});

test("toolIcon: regras em ordem", () => {
	const t = (n: string) => toolIcon(n);
	for (const n of ["read", "bash", "edit", "write", "grep", "find", "ls", "question", "memory", "run"])
		assert.equal(t(n), n);
	for (const n of ["todo", "todos", "plan_todos", "my_todo_x"]) assert.equal(t(n), "todo");
	for (const n of ["subagent", "agent_x", "agents"]) assert.equal(t(n), "agent");
	for (const n of [
		"web_fetch",
		"fetch",
		"brave_news_search",
		"perplexity_search",
		"exa_search",
		"firecrawl_scrape",
		"search_web_pages",
		"mcp__x__crawl",
	])
		assert.equal(t(n), "web");
	// Generic words only: a provider name alone says nothing about the tool.
	for (const n of ["perplexity_ask", "mcp__keenable", "tool_search"]) assert.equal(t(n), "tool");
	assert.equal(t("lsp_hover"), "lsp");
	for (const n of ["plan_mode_complete", "planner"]) assert.equal(t(n), "plan");
	assert.equal(t("mcp__linear"), "tool");
	assert.equal(t("xyz"), "tool");
	// Ordem: todo vence plan (plan_todos), agent vence web, lsp_ vence web/plan.
	assert.equal(t("plan_todos"), "todo");
	assert.equal(t("web_agent"), "agent");
	assert.equal(t("lsp_plan"), "lsp");
});

// ── caixa neutra do edit (renderShell 'self') ───────────────────────────────

// Fundo ativo (código 48;5;N) em cada caractere visível; null quando sem fundo.
const bgPerChar = (line: string): (number | null)[] => {
	let bg: number | null = null;
	const out: (number | null)[] = [];
	for (const part of line.split(/(\x1b\[[0-9;]*m)/)) {
		const m = /^\x1b\[([0-9;]*)m$/.exec(part);
		if (!m) {
			for (const _ of part) out.push(bg);
			continue;
		}
		const c = m[1] === "" ? ["0"] : m[1].split(";");
		if (c[0] === "0" || c[0] === "49") bg = null;
		else if (c[0] === "48") bg = Number(c[2]);
	}
	return out;
};
const editBox = (
	diff: string | undefined,
	c: Record<string, unknown> = {},
	o: Record<string, unknown> = {},
	w = 20,
) => {
	const w0 = wrapped("edit");
	const shared = ctx({ args: { path: "a.ts" }, outputPad: 1, ...c });
	const call = w0.renderCall({ path: "a.ts" }, bgTheme, shared).render(w);
	const res = w0
		.renderResult(
			result("ok", diff === undefined ? undefined : { diff }),
			{ expanded: false, isPartial: false, ...o },
			bgTheme,
			shared,
		)
		.render(w);
	return { call, res };
};

// Cabeçalho do edit fora da caixa: antes a chamada vinha na caixa (linha em branco + cabeçalho com o fundo
// do estado, recuo outputPad e rodapé enquanto executava); agora é uma linha sem fundo na coluna 0 e só o resultado tem caixa.
// antes o cabeçalho ficava sem fundo na coluna 0; agora tem o MESMO fundo, recuo
// (outputPad) e largura das linhas da caixa do diff. Reconstruído depois da perda de tools.test.ts (lane bashtit).
test("edit: cabeçalho com o fundo e o recuo da caixa, em execução e terminado; o resultado segue na caixa neutra, nunca toolSuccessBg", () => {
	for (const isPartial of [true, false]) {
		const { call } = editBox(undefined, { isPartial });
		assert.equal(call.length, 1, "só o cabeçalho");
		assert.equal(visibleWidth(plain(call[0])), 20);
		assert.equal(plain(call[0])[0], " ", "recuo outputPad 1");
		assert.notEqual(plain(call[0])[1], " ", "texto logo depois do recuo");
		const fundo = isPartial ? BGC.toolPendingBg : BGC.customMessageBg; // o da caixa (boxName): pendente enquanto executa
		assert.ok(fundo && bgPerChar(call[0]).every((b) => b === fundo), "fundo da caixa de ponta a ponta");
	}
	const { call: wide, res } = editBox(undefined, { outputPad: 3 });
	assert.equal(plain(wide[0]).slice(0, 3), "   ", "outputPad recua o cabeçalho como a caixa");
	assert.ok(
		res.every((l: string) => bgPerChar(l).every((b) => b === BGC.customMessageBg)),
		"resultado na caixa neutra",
	);
	assert.ok(![...wide, ...res].some((l: string) => l.includes(OPEN("toolSuccessBg"))));
});

test("edit: com resultado o rodapé em branco é do resultado; erro também", () => {
	assert.equal(editBox(undefined, { isPartial: true }).call.length, 1);
	const { call: done, res } = editBox(undefined, { isPartial: false });
	assert.equal(done.length, 1);
	assert.equal(plain(res[res.length - 1]).trim(), "");
	assert.equal(editBox(undefined, { isPartial: true, isError: true }).call.length, 1);
});

// antes o cabeçalho do erro ficava sem fundo; agora leva o mesmo toolErrorBg da caixa.
test("edit: erro usa toolErrorBg na mensagem e no cabeçalho, dentro da caixa", () => {
	const { call, res } = editBox(undefined, { isError: true }, {});
	assert.ok(
		bgPerChar(call[0]).every((b) => b === BGC.toolErrorBg),
		"cabeçalho com o fundo do erro",
	);
	for (const l of res)
		assert.ok(
			bgPerChar(l).every((b) => b === BGC.toolErrorBg),
			JSON.stringify(l),
		);
	assert.ok(res.some((l: string) => plain(l).includes("│ ok")));
	assert.equal(plain(res[res.length - 1]).trim(), "", "rodapé em branco");
});

test("edit (Variante 2): diff dentro da caixa com régua divisória ─, mudadas tintas, contexto/número/⋯ neutros e rodapé em branco", () => {
	const { res } = editBox(" 1 a\n+2 b\n     ...\n-9 c", {}, {}, 20);
	assert.equal(res.length, 6, "régua ─ + 4 linhas do diff + rodapé");
	const p = res.map(plain);
	assert.ok(p.every((l: string) => visibleWidth(l) === 20));
	assert.match(p[0], /^ {3}─+ {3}$/);
	assert.equal(p[5].trim(), "");
	const k = (i: number) => new Set(bgPerChar(res[i]));
	assert.deepEqual([...k(0)], [BGC.customMessageBg]);
	assert.deepEqual([...k(1)], [BGC.customMessageBg]);
	assert.deepEqual([...k(3)], [BGC.customMessageBg]);
	assert.deepEqual([...k(5)], [BGC.customMessageBg]);
	// Linhas mudadas: tinta no miolo, neutra só nos recuos laterais.
	assert.equal(bgPerChar(res[2])[0], BGC.customMessageBg);
	assert.equal(bgPerChar(res[2])[19], BGC.customMessageBg);
	assert.equal(bgPerChar(res[2])[5], BGC.toolSuccessBg);
	assert.equal(bgPerChar(res[4])[5], BGC.toolErrorBg);
});

test("edit: sem cor no tema, sem fundos nem linhas extras (layout anterior)", () => {
	const { call, res } = editBox(" 1 a", {}, {});
	assert.equal(call.length, 1); // cabeçalho fora da caixa: antes 2, com a linha em branco da caixa
	const w0 = wrapped("edit");
	const sh = ctx({ args: { path: "a" } });
	assert.equal(w0.renderCall({ path: "a" }, theme, sh).render(40).length, 1);
	assert.deepEqual(
		w0
			.renderResult(result("ok", { diff: " 1 a" }), { expanded: false, isPartial: false }, theme, sh)
			.render(40)
			.map((l: string) => plain(l).trimEnd()),
		["  1    a"],
	);
	assert.ok(res.length > 0);
});

// Toda tool mostra no chat, à direita, a hora em que foi executada (como a linha "recarregado").
