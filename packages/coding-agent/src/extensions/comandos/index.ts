// comandos: paleta do “/” em pt-BR, painel “?” e /atalhos. Desligue com NYCODE_COMANDOS=0.
import { join } from "node:path";
import { matchesKey } from "@nycode/tui";
import { getAgentDir } from "../../config.ts";
import type { ExtensionAPI } from "../../core/extensions/types.ts";
import { registrarAtalhos } from "./atalhos.ts";
import { abrirPainel } from "./painel.ts";
import { criarProvider, gravarRecente, lerRecentes } from "./paleta.ts";
import { teclaEfetiva, teclasDoArquivo } from "./teclas.ts";

// Ponte com extensions/ui/editor.ts (carregado à parte): quem lê é o editor, ao digitar `?` num editor vazio.
const PONTE = "__nycodeHarnessComandos";

/** Bridge read by ui/editor.ts when `?` is typed in an empty editor. */
type Ponte = { openShortcuts: (inserir: (s: string) => void) => void };

export default function (nycode: ExtensionAPI): void {
	if (process.env.NYCODE_COMANDOS === "0") return;
	registrarAtalhos(nycode);
	const teclas = teclasDoArquivo(join(getAgentDir(), "keybindings.json"));
	nycode.on("session_start", (_event, ctx) => {
		if (!ctx.hasUI) return;
		ctx.ui.addAutocompleteProvider((current) =>
			criarProvider(current, { keyFor: (id) => teclaEfetiva(teclas, id), recentes: () => lerRecentes() }),
		);
		// `input` não dispara para comandos de extensão nem nativos: Enter com texto “/cmd” no editor registra o recente.
		ctx.ui.onTerminalInput((data: string) => {
			try {
				if (matchesKey(data, "enter")) gravarRecente(ctx.ui.getEditorText?.() ?? "");
			} catch {
				/* recentes são opcionais */
			}
			return undefined;
		});
		(globalThis as unknown as Record<string, Ponte | undefined>)[PONTE] = {
			openShortcuts: (inserir: (s: string) => void) =>
				void abrirPainel(ctx, inserir).catch((e) => {
					try {
						ctx.ui.notify(`Painel indisponível: ${e instanceof Error ? e.message : e}`, "warning");
					} catch {
						/* ctx obsoleto */
					}
				}),
		};
	});
	nycode.on("session_shutdown", () => {
		delete (globalThis as unknown as Record<string, Ponte | undefined>)[PONTE];
	});
}
