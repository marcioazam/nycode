// node --experimental-strip-types --test extensions/claude-compat/commands/test/session.test.ts
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import { registerBranch } from "../../../../../src/extensions/claude-compat/commands/session/branch.ts";
import { blocksOf, copyCommand } from "../../../../../src/extensions/claude-compat/commands/session/copy.ts";
import { heapdumpCommand } from "../../../../../src/extensions/claude-compat/commands/session/heapdump.ts";
import { insightsText, recapText } from "../../../../../src/extensions/claude-compat/commands/session/insights.ts";
import { mkCtx, msg, tmp } from "./helpers.ts";

function reg() {
	const commands: Record<string, any> = {};
	const handlers: Record<string, any> = {};
	const entries: any[] = [];
	const nycode: any = {
		registerCommand: (n: string, o: any) => {
			commands[n] = o;
		},
		on: (e: string, h: any) => {
			handlers[e] = h;
		},
		appendEntry: (t: string, d: unknown) => entries.push({ type: "custom", customType: t, data: d }),
		setSessionName: (n: string) => {
			nycode.name = n;
		},
	};
	return { nycode, commands, handlers, entries };
}

test("branch: fork na folha, nome aplicado só no session_start fork; ocupado/cancelado/sem folha", async () => {
	const r = reg();
	registerBranch(r.nycode);
	const h = r.commands["clone-as"].handler;
	const busy = mkCtx({ idle: false });
	await h("x", busy.ctx);
	assert.deepEqual(busy.calls, []);
	const none = mkCtx({ leaf: null });
	await h("x", none.ctx);
	assert.match(none.last(), /mensagens/);
	const bad = mkCtx();
	await h("   ", bad.ctx);
	await h("a\nb", bad.ctx);
	assert.deepEqual(bad.calls, []);
	const ok = mkCtx();
	await h("minha-copia", ok.ctx);
	assert.match(ok.calls[0]!, /^fork:leaf1:.*"at"/);
	await r.handlers.session_start({ reason: "fork" });
	assert.equal(r.nycode.name, "minha-copia");
	r.nycode.name = undefined;
	await r.handlers.session_start({ reason: "fork" }); // pendente já consumido
	assert.equal(r.nycode.name, undefined);
	const cancel = mkCtx();
	cancel.ctx.fork = async () => ({ cancelled: true });
	await h("outra", cancel.ctx);
	await r.handlers.session_start({ reason: "fork" });
	assert.equal(r.nycode.name, undefined);
});

test("copy: N-ésima resposta, text, seletor de blocos, limites e falha do clipboard", async () => {
	const branch = [
		msg("user", "q"),
		msg("assistant", [{ type: "text", text: "um" }]),
		msg("assistant", "dois\n```js\na()\n```\n```\nb()\n```"),
	];
	let copied = "";
	const copy = async (t: string) => {
		copied = t;
	};
	const c = mkCtx({ branch });
	await copyCommand("2", c.ctx, copy);
	assert.equal(copied, "um");
	await copyCommand("text", c.ctx, copy);
	assert.match(copied, /^dois/);
	for (const bad of ["0", "3", "x", "1.5", "-1"]) {
		copied = "";
		await copyCommand(bad, c.ctx, copy);
		assert.equal(copied, "", bad);
		assert.equal(c.notes.at(-1)!.t, "error");
	}
	const pick = mkCtx({ branch, pick: "2" });
	await copyCommand("blocks", pick.ctx, copy);
	assert.equal(copied, "b()");
	const cancel = mkCtx({ branch });
	copied = "";
	await copyCommand("blocks", cancel.ctx, copy);
	assert.equal(copied, "");
	const headless = mkCtx({ branch, hasUI: false });
	await copyCommand("blocks", headless.ctx, copy);
	assert.match(headless.last(), /Vários blocos/);
	await copyCommand("blocks 2", c.ctx, copy);
	assert.match(c.last(), /não tem blocos/);
	await copyCommand("", mkCtx({ branch }).ctx, async () => {
		throw new Error("sem clipboard");
	});
	assert.deepEqual(blocksOf("~~~py\nx\n~~~"), [{ lang: "py", code: "x" }]);
	assert.equal(blocksOf("```\nabre sem fechar").length, 1);
	const empty = mkCtx();
	await copyCommand("", empty.ctx, copy);
	assert.match(empty.last(), /Nenhuma resposta/);
});

test("heapdump: sem UI/sem confirmação nada é gravado; confirmado grava 0600 em dir 0700 com aviso", async () => {
	const dir = join(tmp(), "hd");
	const write = (f: string) => {
		writeFileSync(f, "SNAP");
		return f;
	};
	const noUi = mkCtx({ hasUI: false });
	assert.equal(await heapdumpCommand(noUi.ctx, { dir, write }), undefined);
	const deny = mkCtx({ confirm: false });
	assert.equal(await heapdumpCommand(deny.ctx, { dir, write }), undefined);
	assert.equal(existsSync(dir), false);
	const ok = mkCtx({ confirm: true });
	const f = await heapdumpCommand(ok.ctx, { dir, write, now: () => new Date(0) });
	assert.ok(f);
	assert.equal(readFileSync(f!, "utf8"), "SNAP");
	assert.equal(statSync(f!).mode & 0o777, 0o600);
	assert.equal(statSync(dir).mode & 0o777, 0o700);
	const fail = mkCtx({ confirm: true });
	assert.equal(
		await heapdumpCommand(fail.ctx, {
			dir,
			write: () => {
				throw new Error("boom");
			},
		}),
		undefined,
	);
	assert.match(fail.last(), /boom/);
});

test("insights e recap: determinísticos; sessão vazia tratada", () => {
	assert.match(insightsText(mkCtx().ctx), /vazia/);
	assert.match(recapText(mkCtx().ctx), /Nada a resumir/);
	const branch = [
		msg("user", "primeiro pedido"),
		msg(
			"assistant",
			[
				{ type: "toolCall", name: "read" },
				{ type: "toolCall", name: "read" },
				{ type: "text", text: "feito" },
			],
			{ usage: { input: 10, output: 5, cost: { total: 0.5 } } },
		),
		msg("user", [{ type: "text", text: "segundo" }]),
	];
	const t = insightsText(mkCtx({ branch }).ctx);
	assert.match(t, /read×2/);
	assert.match(t, /entrada 10, saída 5/);
	assert.match(t, /\$0\.5000/);
	const r = recapText(mkCtx({ branch }).ctx);
	assert.match(r, /1\. primeiro pedido[\s\S]*2\. segundo[\s\S]*Última resposta: feito/);
});
