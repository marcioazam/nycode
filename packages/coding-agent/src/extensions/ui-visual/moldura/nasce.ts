/** Entrada "Nasce do fundo": a linha sobe do fundo em NASCE_MS, uma vez; `idade` undefined = já assentada. */
import { esmaecer, safeAnsi } from "../motion/motion.ts";

export const NASCE_MS = 450;
type Cores = { getBgAnsi?: (c: string) => string; getFgAnsi?: (c: string) => string };
const ease = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;

export function nasce(rows: string[], t: Cores, idade: number | undefined): string[] {
	if (idade === undefined) return rows;
	const f = safeAnsi(() => t.getBgAnsi?.("customMessageBg")),
		x = safeAnsi(() => t.getFgAnsi?.("text"));
	return f && x ? rows.map((l) => esmaecer(l, ease(idade / NASCE_MS), f, x)) : rows;
}
