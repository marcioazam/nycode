// node --experimental-strip-types --test extensions/claude-compat/services/test/*.test.ts
import assert from "node:assert/strict";
import { test } from "vitest";
import {
	MOBILE_ROWS,
	MOBILE_URL,
	QrPanel,
	qrLines,
	qrNotice,
	styledQrLines,
} from "../../../../../src/extensions/claude-compat/services/mobile-qr.ts";
import { decodeRows, decodeV2M, toGrid } from "./qr-decode.ts";

const flip = (rows: readonly string[], x: number, y: number) =>
	rows.map((r, i) => (i === y ? r.slice(0, x) + (r[x] === "1" ? "0" : "1") + r.slice(x + 1) : r));
const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

test("decodificador independente lê exatamente a URL do /mobile", () => {
	assert.equal(decodeRows(MOBILE_ROWS), "https://claude.ai/mobile");
	assert.equal(MOBILE_URL, "https://claude.ai/mobile");
});

test("o texto renderizado (meios-blocos) decodifica de volta para a URL", () => {
	const rows = qrLines().flatMap((l) => [
		[...l].map((c) => (c === "▀" || c === "█" ? "1" : "0")).join(""),
		[...l].map((c) => (c === "▄" || c === "█" ? "1" : "0")).join(""),
	]);
	assert.equal(qrLines().length, 17);
	assert.ok(qrLines().every((l) => [...l].length === 33));
	assert.equal(decodeRows(rows.slice(0, 33)), MOBILE_URL);
	assert.deepEqual(rows[33], "0".repeat(33));
});

test("mutações são rejeitadas: forma, quiet zone, formato, paridade, payload", () => {
	assert.throws(() => decodeRows(MOBILE_ROWS.slice(1)), /shape/);
	assert.throws(() => decodeRows(MOBILE_ROWS.map((r) => `${r}0`)), /shape/);
	assert.throws(() => decodeRows(flip(MOBILE_ROWS, 0, 0)), /quiet/);
	assert.throws(() => decodeV2M(toGrid(MOBILE_ROWS).slice(1)), /shape/);
	assert.throws(() => decodeRows(flip(MOBILE_ROWS, 4 + 8, 4 + 2)), /format/); // (8,2)
	assert.throws(() => decodeRows(flip(MOBILE_ROWS, 4 + 8, 4 + 17)), /módulo escuro|format/);
	assert.throws(() => decodeRows(flip(MOBILE_ROWS, 4 + 24, 4 + 24)), /Reed-Solomon|restantes/); // último módulo de dados (paridade)
	assert.throws(() => decodeRows(flip(MOBILE_ROWS, 4 + 24, 4 + 20)), /Reed-Solomon/); // dados
	assert.throws(() => decodeRows(flip(MOBILE_ROWS, 4 + 12, 4 + 12)), /Reed-Solomon/); // dados no miolo
	// formato com nível EC diferente: ambas as cópias trocadas por palavra BCH válida (L=01) sem a máscara certa
	const g = toGrid(MOBILE_ROWS);
	g[0]![0] = 1; // fora da região de dados/formato mas dentro do finder: não altera a decodificação
	assert.equal(decodeV2M(g), MOBILE_URL);
});

test("nível EC e BCH: palavras de formato inválidas falham", () => {
	const g = toGrid(MOBILE_ROWS);
	const put = (v: number) => {
		const set = (i: number, x: number, y: number) => {
			g[y]![x] = (v >> i) & 1;
		};
		for (let i = 0; i < 6; i++) set(i, 8, i);
		set(6, 8, 7);
		set(7, 8, 8);
		set(8, 7, 8);
		for (let i = 9; i < 15; i++) set(i, 14 - i, 8);
		for (let i = 0; i < 8; i++) set(i, 24 - i, 8);
		for (let i = 8; i < 15; i++) set(i, 8, 10 + i);
	};
	put(0x5412 ^ (0b01000 << 10)); // dado L+máscara 0 sem BCH
	assert.throws(() => decodeV2M(g), /BCH/);
	const bch = (d: number) => {
		let r = d << 10;
		for (let i = 14; i >= 10; i--) if ((r >> i) & 1) r ^= 0x537 << (i - 10);
		return r & 0x3ff;
	};
	put(((0b01000 << 10) | bch(0b01000)) ^ 0x5412);
	assert.throws(() => decodeV2M(g), /nível EC/);
});

test("QrPanel: largura suficiente mostra QR+link; Enter/Esc/q fecham; outras teclas não", () => {
	let closed = 0;
	const p = new QrPanel(() => closed++);
	const lines = p.render(40);
	assert.ok(lines.some((l) => strip(l).includes("█")) && lines.some((l) => l.includes(MOBILE_URL)));
	assert.ok(lines.every((l) => strip(l).length <= 40));
	assert.ok(styledQrLines().every((l) => l.startsWith("\x1b[30;47m") && l.endsWith("\x1b[0m")));
	for (const k of ["\r", "\n", "\x1b", "q"]) p.handleInput(k);
	p.handleInput("x");
	p.invalidate();
	assert.equal(closed, 4);
});

test("QrPanel: terminal estreito não corta o QR em silêncio e nada excede a largura", () => {
	const p = new QrPanel(() => {});
	for (const w of [1, 10, 32]) {
		const lines = p.render(w);
		assert.ok(
			lines.every((l) => l.length <= w),
			`w=${w}`,
		);
		assert.ok(!lines.some((l) => /[▀▄█]/.test(l)));
		assert.match(lines.join(""), /estreito|Terminal|Enter/);
	}
	assert.deepEqual(p.render(0), []);
	assert.equal(p.render(10).join("").includes("https://claude.ai/mobile"), true);
	assert.match(qrNotice(), /https:\/\/claude\.ai\/mobile$/);
});
