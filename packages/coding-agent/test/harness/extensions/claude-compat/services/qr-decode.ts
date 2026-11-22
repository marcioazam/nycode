/** Decodificador SÓ de teste para o perfil fixo QR v2-M (25x25), independente do gerador. Lança em qualquer inconsistência. */
export type Grid = number[][];

const N = 25;
const fail = (m: string): never => {
	throw new Error(m);
};

export function toGrid(rows: readonly string[]): Grid {
	if (rows.length !== 33 || rows.some((r) => !/^[01]{33}$/.test(r))) fail("shape: esperado 33x33 binário");
	const g = rows.map((r) => [...r].map(Number));
	g.forEach((r, y) => {
		r.forEach((v, x) => {
			if ((x < 4 || x > 28 || y < 4 || y > 28) && v) fail("quiet zone suja");
		});
	});
	return g.slice(4, 29).map((r) => r.slice(4, 29));
}

function isFunction(x: number, y: number): boolean {
	if (x <= 8 && y <= 8) return true;
	if (x >= 17 && y <= 8) return true;
	if (x <= 8 && y >= 17) return true;
	if (x === 6 || y === 6) return true;
	return x >= 16 && x <= 20 && y >= 16 && y <= 20;
}

const bch = (data: number): number => {
	let r = data << 10;
	for (let i = 14; i >= 10; i--) if ((r >> i) & 1) r ^= 0x537 << (i - 10);
	return r & 0x3ff;
};

function formatBits(g: Grid, second: boolean): number {
	let v = 0;
	const set = (i: number, x: number, y: number) => {
		v |= g[y]![x]! << i;
	};
	if (!second) {
		for (let i = 0; i < 6; i++) set(i, 8, i);
		set(6, 8, 7);
		set(7, 8, 8);
		set(8, 7, 8);
		for (let i = 9; i < 15; i++) set(i, 14 - i, 8);
	} else {
		for (let i = 0; i < 8; i++) set(i, N - 1 - i, 8);
		for (let i = 8; i < 15; i++) set(i, 8, N - 15 + i);
	}
	return v;
}

const MASKS: ((x: number, y: number) => boolean)[] = [
	(x, y) => (x + y) % 2 === 0,
	(_x, y) => y % 2 === 0,
	(x) => x % 3 === 0,
	(x, y) => (x + y) % 3 === 0,
	(x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
	(x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
	(x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
	(x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

const EXP = new Array<number>(512);
const LOG = new Array<number>(256);
for (let i = 0, x = 1; i < 255; i++) {
	EXP[i] = x;
	LOG[x] = i;
	x <<= 1;
	if (x & 0x100) x ^= 0x11d;
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]!;
const mul = (a: number, b: number) => (a && b ? EXP[LOG[a]! + LOG[b]!]! : 0);

/** Decodifica o payload byte-mode de um grid 25x25 v2-M. */
export function decodeV2M(g: Grid): string {
	if (g.length !== N || g.some((r) => r.length !== N)) fail("shape: esperado 25x25");
	const f1 = formatBits(g, false);
	if (f1 !== formatBits(g, true)) fail("format: cópias divergem");
	const fmt = f1 ^ 0x5412;
	const data = fmt >> 10;
	if (bch(data) !== (fmt & 0x3ff)) fail("format: BCH inválido");
	if (data >> 3 !== 0) fail("format: nível EC diferente de M");
	if (!g[17]![8]) fail("format: módulo escuro ausente");
	const mask = MASKS[data & 7]!;
	const bits: number[] = [];
	for (let right = N - 1; right >= 1; right -= 2) {
		if (right === 6) right = 5;
		const up = ((right + 1) & 2) === 0;
		for (let v = 0; v < N; v++) {
			const y = up ? N - 1 - v : v;
			for (let j = 0; j < 2; j++) {
				const x = right - j;
				if (!isFunction(x, y)) bits.push(g[y]![x]! ^ (mask(x, y) ? 1 : 0));
			}
		}
	}
	if (bits.length !== 359) fail(`dados: ${bits.length} bits, esperado 359`);
	if (bits.slice(352).some(Boolean)) fail("dados: bits restantes não nulos");
	const cw = Array.from({ length: 44 }, (_, i) => bits.slice(i * 8, i * 8 + 8).reduce((a, b) => (a << 1) | b, 0));
	for (let k = 0; k < 16; k++) {
		let s = 0;
		for (const b of cw) s = mul(s, EXP[k]!) ^ b;
		if (s) fail(`Reed-Solomon: síndrome ${k} não nula`);
	}
	const pb = cw.slice(0, 28).flatMap((b) => Array.from({ length: 8 }, (_, i) => (b >> (7 - i)) & 1));
	const read = (o: number, n: number) => pb.slice(o, o + n).reduce((a, b) => (a << 1) | b, 0);
	if (read(0, 4) !== 0b0100) fail("payload: não é modo byte");
	const len = read(4, 8);
	if (12 + len * 8 > 224) fail("payload: comprimento inválido");
	const bytes = Uint8Array.from({ length: len }, (_, i) => read(12 + i * 8, 8));
	return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export const decodeRows = (rows: readonly string[]): string => decodeV2M(toGrid(rows));
