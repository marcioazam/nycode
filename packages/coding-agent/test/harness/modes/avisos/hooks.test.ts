// K17: the pt-BR notices at the upstream hook points; with NYCODE_AVISOS=0 the upstream texts come back unchanged.
import assert from "node:assert/strict";
import type { AssistantMessage } from "@nycode/ai";
import { Container, type TUI } from "@nycode/tui";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as avisos from "../../../../src/modes/interactive/avisos/index.ts";
import { AssistantMessageComponent } from "../../../../src/modes/interactive/components/assistant-message.ts";
import { CompactionSummaryMessageComponent } from "../../../../src/modes/interactive/components/compaction-summary-message.ts";
import { RetryStatusIndicator } from "../../../../src/modes/interactive/components/status-indicator.ts";
import { initTheme } from "../../../../src/modes/interactive/theme/theme.ts";

const ANSI = /\x1b\[[0-9;:]*m/g;
const plain = (ls: readonly string[]) => ls.map((l) => l.replace(ANSI, "")).join("\n");

beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
	vi.stubEnv("NYCODE_ASCII_ICONS", "");
	initTheme("dark");
	avisos.ligarAvisos(true);
});
afterEach(() => {
	avisos.ligarAvisos(false);
	vi.unstubAllEnvs();
});

const mensagem = (extra: Partial<AssistantMessage>): AssistantMessage =>
	({ role: "assistant", content: [], stopReason: "error", timestamp: 0, ...extra }) as AssistantMessage;
const LIMITE = '429 {"type":"error","error":{"type":"rate_limit_error","message":"slow down"}}';
const ui = { requestRender() {} } as unknown as TUI;

test("erro do provedor: texto pt-BR com a causa; desligado, o `Error:` do upstream", () => {
	const m = mensagem({ errorMessage: LIMITE });
	const ligado = plain(new AssistantMessageComponent(m).render(100));
	assert.match(ligado, /O provedor está limitando o uso/);
	assert.ok(!ligado.includes("Error:"));
	vi.stubEnv("NYCODE_AVISOS", "0");
	const desligado = plain(new AssistantMessageComponent(m).render(100));
	assert.match(desligado, /Error: 429/);
	assert.ok(!desligado.includes("O provedor"));
});

test("interrupção: `interrompido por você`; desligado, `Operation aborted`", () => {
	const m = mensagem({ stopReason: "aborted" });
	assert.match(plain(new AssistantMessageComponent(m).render(100)), /interrompido por você/);
	vi.stubEnv("NYCODE_AVISOS", "0");
	assert.match(plain(new AssistantMessageComponent(m).render(100)), /Operation aborted/);
});

test("linha de nova tentativa: causa e tecla de cancelar; desligado, o `Retrying` do upstream", () => {
	const ligado = new RetryStatusIndicator(ui, 1, 3, 5000, LIMITE);
	assert.match(plain(ligado.render(120)), /limite de uso do provedor · nova tentativa em 5s · 1 de 3/);
	ligado.dispose();
	vi.stubEnv("NYCODE_AVISOS", "0");
	const desligado = new RetryStatusIndicator(ui, 1, 3, 5000, LIMITE);
	assert.match(plain(desligado.render(120)), /Retrying \(1\/3\) in 5s/);
	desligado.dispose();
});

test("compactação: barra `compactado` ligada; desligado, o rótulo `[compaction]`", () => {
	const msg = { role: "compactionSummary", summary: "resumo", tokensBefore: 252284, timestamp: Date.now() - 60_000 };
	const ligado = plain(new CompactionSummaryMessageComponent(msg as never).render(100));
	assert.match(ligado, /compactado/);
	assert.ok(!ligado.includes("[compaction]"));
	vi.stubEnv("NYCODE_AVISOS", "0");
	const desligado = plain(new CompactionSummaryMessageComponent(msg as never).render(100));
	assert.match(desligado, /\[compaction\]/);
});

function anfitriao() {
	const chatContainer = new Container();
	return { chatContainer, editorContainer: new Container(), ui, outputPad: 1 };
}

test("caixa neutra, sessão compactada, recarregado e confiança: ligados desenham; desligados cedem ao upstream", () => {
	const h = anfitriao();
	assert.equal(avisos.caixaNeutra(h, "\u2063aviso informativo", "info"), true);
	assert.equal(avisos.caixaNeutra(h, "texto comum", "info"), false);
	assert.equal(avisos.compactada(h, 3), true);
	assert.equal(avisos.recarregado(h, false), true);
	assert.ok(avisos.confianca(h));
	assert.ok(h.chatContainer.children.length >= 6);
	vi.stubEnv("NYCODE_AVISOS", "0");
	const f = anfitriao();
	assert.equal(avisos.caixaNeutra(f, "\u2063aviso informativo", "info"), false);
	assert.equal(avisos.compactada(f, 3), false);
	assert.equal(avisos.recarregado(f, false), false);
	assert.equal(avisos.confianca(f), undefined);
	assert.equal(avisos.recarregando(f), undefined);
	assert.equal(f.chatContainer.children.length, 0);
});

test("sem a extensão carregada os ganchos cedem ao upstream", () => {
	avisos.ligarAvisos(false);
	assert.equal(avisos.semPrefixo("x"), undefined);
	assert.equal(avisos.semSugestaoDeBug(), false);
});

test("prefixos e sugestão de bug: sem `Error:`/`Warning:` e sem a dica ligados; os do upstream desligados", () => {
	assert.equal(avisos.semPrefixo("falhou"), "falhou");
	assert.equal(avisos.semSugestaoDeBug(), true);
	assert.equal(avisos.corRetry(), "warning");
	assert.deepEqual(avisos.indicadorRetry(), { frames: [""] });
	vi.stubEnv("NYCODE_AVISOS", "0");
	assert.equal(avisos.semPrefixo("falhou"), undefined);
	assert.equal(avisos.semSugestaoDeBug(), false);
	assert.equal(avisos.corRetry(), "muted");
	assert.equal(avisos.indicadorRetry(), undefined);
});

test("retry: início e fim ligados tratam o evento; desligados não tocam na conversa", () => {
	const h = anfitriao();
	assert.equal(avisos.retryInicio({ attempt: 1, maxAttempts: 3, errorMessage: LIMITE }), true);
	assert.equal(avisos.retryFim(h, { attempt: 3, finalError: LIMITE }), true);
	assert.match(plain(h.chatContainer.render(100)), /Tentei 3 vezes/);
	vi.stubEnv("NYCODE_AVISOS", "0");
	const f = anfitriao();
	assert.equal(avisos.retryInicio({ attempt: 1, maxAttempts: 3 }), false);
	assert.equal(avisos.retryFim(f, { attempt: 3, finalError: "x" }), false);
	assert.equal(f.chatContainer.children.length, 0);
});
