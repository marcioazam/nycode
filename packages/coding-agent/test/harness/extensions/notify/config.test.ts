// vitest: test/harness/extensions/notify/config.test.ts
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test, vi } from "vitest";
import * as __typed_avisos_config from "../../../../src/extensions/notify/config.ts";

// The rendering reads TERM: pin it so the suite does not depend on the shell it runs in.
beforeEach(() => {
	vi.stubEnv("TERM", "xterm-256color");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

// The source tests drive the modules with partial fakes, without types.
const __a_avisos_config: any = __typed_avisos_config;

const c = __a_avisos_config;
const dir = mkdtempSync(join(tmpdir(), "avisos-cfg-"));

test("padrões do README", () => {
	assert.deepEqual(c.PADRAO, {
		avisar: ["terminou", "precisa", "erro"],
		som: ["precisa", "erro"],
		canal: "sistema",
		progresso: true,
	});
	assert.equal(c.caminhoAvisos("/x/agent"), "/x/agent/avisos.json");
});

test("arquivo ausente, ilegível ou não-JSON → padrões, sem lançar", () => {
	assert.deepEqual(c.carregar(join(dir, "nao-existe.json")), c.PADRAO);
	writeFileSync(join(dir, "lixo.json"), "{ não é json");
	assert.deepEqual(c.carregar(join(dir, "lixo.json")), c.PADRAO);
	assert.deepEqual(c.carregar(dir), c.PADRAO); // diretório: erro de leitura
	for (const v of ["null", "[]", "3", '"x"']) {
		writeFileSync(join(dir, "v.json"), v);
		assert.deepEqual(c.carregar(join(dir, "v.json")), c.PADRAO);
	}
});

test("valores inválidos caem no padrão campo a campo; válidos passam", () => {
	const r = c.normalizar({
		avisar: ["erro", "xis"],
		som: ["erro", "terminou", "erro"],
		canal: "fumaça",
		progresso: "sim",
	});
	assert.deepEqual(r, { avisar: c.PADRAO.avisar, som: ["terminou", "erro"], canal: "sistema", progresso: true });
	assert.deepEqual(c.normalizar({ avisar: [], canal: "ambos", progresso: false }), {
		avisar: [],
		som: c.PADRAO.som,
		canal: "ambos",
		progresso: false,
	});
});

test("gravar é atômico: arquivo final válido, sem temporário, cria o diretório", () => {
	const p = join(dir, "novo", "agent", "avisos.json");
	const cfg = { avisar: ["erro"], som: [], canal: "sino", progresso: false };
	c.gravar(p, cfg);
	assert.deepEqual(JSON.parse(readFileSync(p, "utf8")), cfg);
	assert.deepEqual(readdirSync(join(dir, "novo", "agent")), ["avisos.json"]);
	assert.deepEqual(c.carregar(p), cfg);
});

test("gravar que falha lança e não deixa temporário nem mexe no arquivo", () => {
	const pasta = join(dir, "ocupado");
	mkdirSync(join(pasta, "avisos.json"), { recursive: true }); // rename sobre diretório falha
	assert.throws(() => c.gravar(join(pasta, "avisos.json"), c.PADRAO));
	assert.deepEqual(readdirSync(pasta), ["avisos.json"]);
});

test("canalEfetivo: notify.desktop=false tira a notificação do sistema e deixa só o sino", () => {
	assert.equal(c.canalEfetivo("sistema", false), "desligado");
	assert.equal(c.canalEfetivo("ambos", false), "sino");
	assert.equal(c.canalEfetivo("sino", false), "sino");
	assert.equal(c.canalEfetivo("desligado", false), "desligado");
	assert.equal(c.canalEfetivo("sistema", true), "sistema");
});
