/** avisos.json (agent dir, next to settings.json): tolerant read, atomic write. */

import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const EVENTOS = ["terminou", "precisa", "erro"] as const;
export type Evento = (typeof EVENTOS)[number];
export const CANAIS = ["sistema", "sino", "ambos", "desligado"] as const;
export type Canal = (typeof CANAIS)[number];

export interface Config {
	avisar: Evento[];
	som: Evento[];
	canal: Canal;
	progresso: boolean;
}

export const PADRAO: Readonly<Config> = {
	avisar: ["terminou", "precisa", "erro"],
	som: ["precisa", "erro"],
	canal: "sistema",
	progresso: true,
};

/** `notify.desktop=false` drops the system notification and keeps only what the channel says about the bell. */
export const canalEfetivo = (canal: Canal, desktop: boolean): Canal => {
	if (desktop) return canal;
	return canal === "sino" || canal === "ambos" ? "sino" : "desligado";
};

export const caminhoAvisos = (agentDir: string): string => join(agentDir, "avisos.json");

const eventos = (v: unknown, padrao: Evento[]): Evento[] =>
	Array.isArray(v) && v.every((x) => EVENTOS.includes(x)) ? EVENTOS.filter((e) => v.includes(e)) : [...padrao];

/** Cada campo inválido cai no padrão; nunca lança. */
export function normalizar(raw: unknown): Config {
	const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
	return {
		avisar: eventos(o.avisar, PADRAO.avisar),
		som: eventos(o.som, PADRAO.som),
		canal: CANAIS.includes(o.canal as Canal) ? (o.canal as Canal) : PADRAO.canal,
		progresso: typeof o.progresso === "boolean" ? o.progresso : PADRAO.progresso,
	};
}

export function carregar(path: string, ler: (p: string) => string = (p) => readFileSync(p, "utf8")): Config {
	try {
		return normalizar(JSON.parse(ler(path)));
	} catch {
		return normalizar(undefined);
	}
}

/** Arquivo temporário no mesmo diretório + rename: leitor concorrente nunca vê arquivo pela metade. */
export function gravar(path: string, config: Config): void {
	mkdirSync(dirname(path), { recursive: true });
	const tmp = `${path}.${process.pid}.tmp`;
	try {
		writeFileSync(tmp, `${JSON.stringify(config, null, 2)}\n`);
		renameSync(tmp, path);
	} catch (e) {
		try {
			unlinkSync(tmp);
		} catch {
			/* já não existe */
		}
		throw e;
	}
}
