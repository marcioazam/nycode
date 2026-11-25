import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import { cacheRatio, cellWidth, ctxLabel, gitState, milhar, render, span, themePalette, turnStats, windowState } from '../../../resources/statusline/calm-statusline.mjs';

const H = 3_600_000;
const now = 1_800_000_000_000;
const plain = (lines) => lines.map((l) => l.replace(/\x1b\[[0-9;:]*m/g, ''));
const base = (over = {}) => ({
  model: { id: 'fable', display_name: 'Fable 5.2' }, effort: { level: 'medium' }, cwd: '/w/nycode', workspace: { current_dir: '/w/nycode' },
  cost: { total_cost_usd: 1.08, total_duration_ms: 12 * 60_000 },
  context_window: { context_window_size: 1_000_000, used_percentage: 9, total_input_tokens: 90_000, current_usage: null },
  rate_limits: { five_hour: { used_percentage: 8, resets_at: (now + 4 * H) / 1000 }, seven_day: { used_percentage: 22, resets_at: (now + 4 * 24 * H) / 1000 } },
  ...over,
});
// Paleta fixa: cada papel com um RGB distinto, para o teste ler o papel pela cor.
const ROLE = ['text', 'sec', 'track', 'ok', 'warn', 'crit', 'usage', 'high'];
const palette = Object.fromEntries(ROLE.map((r, i) => [r, `#0${i + 1}0${i + 1}0${i + 1}`]));
const rgb = (role) => [1, 1, 1].map(() => ROLE.indexOf(role) + 1).join(';');
const roleOf = (raw, pct) => ROLE.find((r) => raw.includes(`\x1b[38;2;${rgb(r)}m${pct}%`));
const opts = { now, columns: 96, git: { branch: 'main', dirty: true }, reserve: 16_384, palette };

test('span usa as duas maiores unidades', () => {
  assert.deepEqual([20_000, 12 * 60_000, 2 * H + 14 * 60_000, 30 * H].map(span), ['<1m', '12m', '2h 14m', '1d 6h']);
});

test('normal: duas linhas se couber, três no fallback; sem cor de alerta, com branch e sujo', () => {
  const raw = render(base(), { ...opts, columns: 68 });
  const [l1, l2, l3, ...rest] = plain(raw);
  const largo = render(base(), opts);
  assert.deepEqual(plain(largo), [l1, 'ctx ━━━━━━━━ 9%    5h ━━━━━━━━ 8% renova em 4h    semana ━━━━━━━━ 22% renova em 4d', '↓ 0 ↑ 0']);
  assert.equal(roleOf(largo[1], 9), 'ok');
  assert.equal(roleOf(largo[1], 22), 'usage');
  assert.deepEqual(rest, ['↓ 0 ↑ 0'], 'a 3ª linha zerada vem depois das faixas');
  // Git com ícone, à frente/atrás e +/− antes 'nycode ⎇ main*'; sujo sem linhas mudadas segue com *.
  // Effort entre parênteses colado ao modelo: antes 'Fable 5.2 · medium · nycode'.
  assert.equal(l1, 'Fable 5.2 (medium) · nycode · \ue725 main* │ 12m · $1.08');
  assert.equal(l2, 'ctx ━━━━━━━━ 9%');
  assert.equal(l3, '5h ━━━━━━━━ 8% renova em 4h · semana ━━━━━━━━ 22% renova em 4d');
  assert.doesNotMatch(raw.join(''), new RegExp([rgb('warn'), rgb('high'), rgb('crit')].join('|'))); // nem atenção, nem alto, nem crítico
  assert.equal(roleOf(raw[1], 9), 'ok'); // contexto baixo é verde, como no claude-hud
  assert.equal(roleOf(raw[2], 22), 'usage'); // uso baixo é azul (accent do tema), como no claude-hud
});

test('cores do claude-hud: contexto 70/85, uso 75/90', () => {
  const ctx = (pct) => roleOf(render(base({ context_window: { context_window_size: 1e6, used_percentage: pct, total_input_tokens: pct * 1e4, current_usage: null } }), { ...opts, reserve: 0 })[1], pct);
  assert.deepEqual([69, 70, 84, 85].map(ctx), ['ok', 'warn', 'warn', 'crit']);
  // Renova em 3d: 4d de 7d passados, projeção pct × 7/4 fica abaixo de 90% até 51%; aqui só o percentual decide.
  const week = (pct) => roleOf(render(base({ rate_limits: { seven_day: { used_percentage: pct, resets_at: (now + 3 * 24 * H) / 1000 } } }), opts)[1], pct);
  assert.deepEqual([30, 51].map(week), ['usage', 'usage']);
  const late = (pct) => roleOf(render(base({ rate_limits: { seven_day: { used_percentage: pct, resets_at: (now + 1 * H) / 1000 } } }), opts)[1], pct);
  assert.deepEqual([74, 75, 89, 90].map(late), ['usage', 'high', 'high', 'crit']);
});

test('ritmo: ▲ na cor do ritmo; ≥90% projetado é roxo, >100% é vermelho; a nota diz quando renova', () => {
  const p = base({ rate_limits: { seven_day: { used_percentage: 54, resets_at: (now + 133 * H) / 1000 } } });
  const raw = render(p, opts);
  assert.equal(plain(raw)[1], 'ctx ━━━━━━━━ 9%    semana ━━━━━━━━ 54% ▲ renova em 5d 13h');
  assert.equal(roleOf(raw[1], 54), 'crit'); // 54% em 35h projeta 259%
  assert.match(raw[1], new RegExp(`${rgb('crit')}m ▲`));
  const warn = render(base({ rate_limits: { five_hour: { used_percentage: 57, resets_at: (now + 2 * H) / 1000 } } }), opts); // projeta 95%
  assert.equal(roleOf(warn[1], 57), 'high');
  assert.match(warn[1], new RegExp(`${rgb('high')}m ▲`));
  assert.equal(windowState({ used_percentage: 54, resets_at: (now + 24 * H) / 1000 }, 7 * 24 * H, now).eta, undefined); // renova antes de acabar
});

test('crítico mostra a renovação; ctx perto do limite avisa a compactação', () => {
  const p = base({
    context_window: { context_window_size: 1_000_000, used_percentage: 22, total_input_tokens: 220_000, current_usage: null },
    rate_limits: { five_hour: { used_percentage: 93, resets_at: (now + 22 * 60_000) / 1000 } },
  });
  const raw = render(p, { ...opts, columns: 120, reserve: 750_000 });
  assert.equal(plain(raw)[1], 'ctx ━━━━━━━━ 22% compacta em breve    5h ━━━━━━━━ 93% ▲ renova em 22m');
  assert.equal(roleOf(raw[1], 93), 'crit'); // 93% em 4h38m projeta 100,4%
  assert.equal(roleOf(raw[1], 22), 'crit'); // compactação iminente é "quase chegando": vermelho
});

test('limites velhos: barras apagadas e a idade do dado', () => {
  const raw = render(base({ rate_limits_at: now - 40 * 60_000 }), opts);
  assert.equal(plain(raw)[1], 'ctx ━━━━━━━━ 9%    5h ━━━━━━━━ 8%    semana ━━━━━━━━ 22% limites de 40m atrás');
  assert.doesNotMatch(raw[1], new RegExp(`${rgb('text')}m|${rgb('usage')}m`)); // limites velhos ficam apagados
});

test('paleta vem do tema do nycode: par claro/escuro por COLORFGBG, tokens via vars; sem tema, a padrão', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'calm-theme-'));
  fs.mkdirSync(path.join(dir, 'themes'));
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ theme: 'c/e' }));
  const theme = (accent) => JSON.stringify({ vars: { a: accent }, colors: { accent: 'a', success: '#00ff00', text: 'nada' } });
  fs.writeFileSync(path.join(dir, 'themes', 'c.json'), theme('#111111'));
  fs.writeFileSync(path.join(dir, 'themes', 'e.json'), theme('#222222'));
  try {
    assert.equal(themePalette({ COLORFGBG: '0;15' }, dir).usage, '#111111');
    assert.equal(themePalette({}, dir).usage, '#222222');
    assert.equal(themePalette({}, dir).ok, '#00ff00');
    assert.equal(themePalette({}, dir).text, themePalette({}, path.join(dir, 'nada')).text); // token inválido cai na padrão
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('cache ruim vira aviso, salvo no começo da sessão; cache bom e entrada pequena não avisam', () => {
  const usage = (read, write) => ({ context_window: { context_window_size: 1e6, used_percentage: 9, total_input_tokens: 9e4, current_usage: { input_tokens: 0, output_tokens: 10, cache_read_input_tokens: read, cache_creation_input_tokens: write } } });
  // O aviso entrou na 3ª linha (tokens · cache · turno); antes era uma linha própria '▲ cache 31%'
  // e cache bom ou começo de sessão não geravam linha nenhuma (length 2).
  const raw = render(base(usage(31_000, 69_000)), { ...opts, turn: undefined })
  assert.equal(plain(raw)[2], '↓ 100 mil ↑ 10 · ▲ cache 31%');
  assert.match(raw[2], new RegExp(`\\x1b\\[38;2;${rgb('warn')}m▲ cache 31%`));
  assert.equal(plain(render(base(usage(92_000, 8_000)), { ...opts, turn: undefined }))[2], '↓ 100 mil ↑ 10 · cache 92%');
  assert.equal(plain(render(base({ ...usage(0, 50_000), cost: { total_duration_ms: 60_000 } }), { ...opts, turn: undefined }))[2], '↓ 50 mil ↑ 10 · cache 0%', 'começo de sessão: sem ▲');
  assert.equal(cacheRatio(base(usage(100, 900))), undefined);
});

test('estreito: a barra fica; a nota encurta e depois some; só no limite a barra cede', () => {
  const p = base({ rate_limits: { five_hour: { used_percentage: 8, resets_at: (now + 4 * H) / 1000 }, seven_day: { used_percentage: 54, resets_at: (now + 133 * H) / 1000 } } });
  const row = (columns) => plain(render(p, { ...opts, columns }))[2];
  assert.equal(row(80), '5h ━━━━━━━━ 8% renova em 4h · semana ━━━━━━━━ 54% ▲ renova em 5d 13h');
  assert.equal(row(60), '5h ━━━━━━━━ 8% ↻ 4h · semana ━━━━━━━━ 54% ▲ ↻ 5d 13h');
  assert.equal(row(40), '5h ━━━━━━━━ 8% · semana ━━━━━━━━ 54% ▲');
  assert.equal(row(20), '5h 8% · semana 54% ▲');
  assert.deepEqual(plain(render(base({ rate_limits: undefined }), { ...opts, git: undefined })).slice(1), ['ctx ━━━━━━━━ 9%', '↓ 0 ↑ 0']);
});

test('detalhe: painel alinhado com valores absolutos e renovação', () => {
  const out = plain(render(base({ session_name: 'status', cost: { total_cost_usd: 6, total_duration_ms: 2 * H, total_lines_added: 142, total_lines_removed: 38 } }), { ...opts, level: 'detalhe' }));
  assert.match(out[1], /^Contexto +━{12} +9% +90k de 1\.0M · compacta em 984k$/);
  assert.match(out[2], /^Sessão 5h +━{12} +8% +renova em 4h$/);
  assert.match(out.at(-2), /^Alterações +\+142 −38 linhas$/);
  assert.match(out.at(-1), /^Sessão +status · \$3\.00 por hora$/);
});

// Ponta a ponta pelo launcher: "renderer": "calm" na config troca o claude-hud pelo desenho próprio.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'calm-'));
after(() => fs.rmSync(tmp, { recursive: true, force: true }));
test('launcher com renderer calm imprime o desenho novo e respeita NO_COLOR', () => {
  fs.mkdirSync(path.join(tmp, 'plugins', 'claude-hud'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'plugins', 'claude-hud', 'config.json'), JSON.stringify({ renderer: 'calm' }));
  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'resources', 'statusline', 'claude-hud-statusline.mjs');
  const input = JSON.stringify({ ...base(), cwd: tmp, workspace: { current_dir: tmp }, rate_limits: undefined });
  const r = spawnSync(process.execPath, [script], { input, encoding: 'utf8', env: { ...process.env, COLUMNS: '100', NO_COLOR: '1', NYCODE_CODING_AGENT_DIR: tmp }, timeout: 20_000 });
  assert.equal(r.status, 0, r.stderr);
  const [l1, l2] = r.stdout.split('\n');
  assert.match(l1, /^Fable 5\.2 \(medium\) · calm-\S+ │ 12m · \$1\.08$/);
  assert.equal(l2, 'ctx ━━━━━━━━ 9%');
});

// Onda 10, P17: limiar escrito ao lado da cor, para não depender só dela.
test('P17 rótulo e linha do contexto', () => {
  assert.deepEqual([69, 70, 84, 85].map(ctxLabel), ['', 'acima de 70%', 'acima de 70%', 'acima de 85%']);
  const cw = { context_window_size: 1e6, used_percentage: 72, total_input_tokens: 72e4, current_usage: null };
  assert.match(plain(render(base({ context_window: cw }), { ...opts, reserve: 0 }))[1], /^ctx ━━━━━━━━ 72% acima de 70%    5h /);
  assert.equal(plain(render(base({ context_window: cw }), { ...opts, columns: 20, reserve: 0 }))[1], 'ctx ━━━━━━━━ 72%', 'sem espaço, a nota sai');
});

// O histórico em blocos ▁…█ ao lado da barra ━ parece uma barra quebrada; saiu da linha.
test('linha do contexto: só barra, número e nota, sem histórico em blocos', () => {
  const cw = { context_window_size: 1e6, used_percentage: 9, total_input_tokens: 9e4, current_usage: null };
  const l = plain(render(base({ context_window: cw }), { ...opts, reserve: 0, history: [5, 9, 30, 9] }))[1];
  assert.match(l, /^ctx ━━━━━━━━ 9%    5h /);
  assert.doesNotMatch(plain(render(base({ context_window: { ...cw, used_percentage: 72 } }), { ...opts, reserve: 0, history: [20, 45, 72] })).join('\n'), /[▁▂▃▄▅▆▇█]/);
});

// ---- U17: largura real e truncamento; U18: cache de git status; U21: tmp por pid ----
const cells = (l) => [...l].reduce((n, ch) => n + (/[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uff00-\uff60]/u.test(ch) || ch.codePointAt(0) > 0x1f000 ? 2 : 1), 0);

test('U17 cellWidth: CJK e emoji ocupam 2 colunas, combinante 0, ANSI não conta', () => {
  assert.equal(cellWidth('abc'), 3);
  assert.equal(cellWidth('日本語'), 6);
  assert.equal(cellWidth('a🙂'), 3);
  assert.equal(cellWidth('e\u0301'), 1);
  assert.equal(cellWidth('\x1b[1mab\x1b[0m'), 2);
});

test('U17: nenhuma linha passa de `columns`, com nomes longos e largos (cabeçalho e último fallback incluídos)', () => {
  const p = base({ model: { id: 'm', display_name: 'Modelo Com Nome Bastante Longo 5.2' }, cwd: '/w/日本語日本語日本語', workspace: { current_dir: '/w/日本語日本語日本語' } });
  for (const columns of [60, 40, 24, 12]) {
    for (const level of ['padrao', 'detalhe']) {
      const lines = plain(render(p, { ...opts, columns, level, git: { branch: 'feature/um-nome-de-branch-enorme-aqui', dirty: true } }));
      for (const l of lines) assert.ok(cells(l) <= columns, `${columns}/${level}: ${cells(l)} > ${columns}: ${l}`);
    }
  }
  const wide = plain(render(base(), { ...opts, columns: 96 }));
  assert.ok(wide[0].startsWith('Fable 5.2'), 'linha que cabe não é alterada');
});

test('U18 gitState: cache de 5-10 s por diretório; no timeout reusa o último valor', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'calmgit-'));
  after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'git-cache.json');
  let calls = 0;
  let out = '## main...origin/main\n M a\n';
  const run = () => { calls++; if (out === null) throw Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }); return out; };
  // O valor ganhou ahead/behind/added/removed; antes era só { branch, dirty }.
  const at = (now) => gitState('/w/repo', { file, now, run, diff: () => ' 1 file changed, 2 insertions(+)' });
  const v = (branch, dirty) => ({ branch, dirty, ahead: 0, behind: 0, added: dirty ? 2 : 0, removed: 0 });
  assert.deepEqual(at(1_000), v('main', true));
  out = '## dev\n';
  assert.deepEqual(at(5_000), v('main', true), 'dentro do prazo: cache, sem rodar o git');
  assert.equal(calls, 1);
  assert.deepEqual(at(12_000), v('dev', false), 'vencido: roda de novo');
  assert.equal(calls, 2);
  out = null;
  assert.deepEqual(at(30_000), v('dev', false), 'timeout: reusa o último valor');
  assert.deepEqual(gitState('/w/outro', { file, now: 30_000, run }), undefined, 'outro diretório não herda');
  // fora de repositório também é lembrado (o git não roda a cada render)
  out = '';
  assert.equal(gitState('/w/nao-repo', { file, now: 40_000, run }), undefined);
  const before = calls;
  assert.equal(gitState('/w/nao-repo', { file, now: 41_000, run }), undefined);
  assert.equal(calls, before);
});

// Ramo com ↑/↓ e +/− do diff na 1ª linha; uma 3ª linha com tokens, cache, turno e velocidade.
test('git: ramo com ícone, à frente/atrás e +/− nas cores; ASCII sem Nerd Font', () => {
  const git = { branch: 'main', dirty: true, ahead: 2, behind: 1, added: 34, removed: 8 };
  const raw = render(base(), { ...opts, git });
  assert.equal(plain(raw)[0], 'Fable 5.2 (medium) · nycode · \ue725 main ↑2 ↓1 +34 −8 │ 12m · $1.08');
  assert.match(raw[0], new RegExp(`\\x1b\\[38;2;${rgb('usage')}m\ue725 main`));
  assert.match(raw[0], new RegExp(`\\x1b\\[38;2;${rgb('ok')}m\\+34`));
  assert.match(raw[0], new RegExp(`\\x1b\\[38;2;${rgb('crit')}m−8`));
  const saved = process.env.NYCODE_ASCII_ICONS;
  process.env.NYCODE_ASCII_ICONS = '1';
  try { assert.equal(plain(render(base(), { ...opts, git: { branch: 'dev', dirty: false } }))[0], 'Fable 5.2 (medium) · nycode · ⎇ dev │ 12m · $1.08') } finally { saved === undefined ? delete process.env.NYCODE_ASCII_ICONS : (process.env.NYCODE_ASCII_ICONS = saved) }
});

test('gitState lê ↑/↓ do cabeçalho e +/− do diff; sem commits o diff falha e fica zero', () => {
  const run = () => '## main...origin/main [ahead 2, behind 1]\n M a\n';
  assert.deepEqual(gitState('/w/r', { run, diff: () => ' 3 files changed, 34 insertions(+), 8 deletions(-)\n' }), { branch: 'main', dirty: true, ahead: 2, behind: 1, added: 34, removed: 8 });
  assert.deepEqual(gitState('/w/r', { run: () => '## main\n', diff: () => { throw new Error('limpo: o diff não roda') } }), { branch: 'main', dirty: false, ahead: 0, behind: 0, added: 0, removed: 0 });
  assert.deepEqual(gitState('/w/r', { run: () => '## No commits yet on main\n?? a\n', diff: () => { throw new Error('bad HEAD') } }), { branch: 'main', dirty: true, ahead: 0, behind: 0, added: 0, removed: 0 });
});

test('milhar em pt-BR', () => {
  assert.deepEqual([0, 999, 1_000, 1_840, 12_400, 215_000, 1_250_000].map(milhar), ['0', '999', '1 mil', '1,8 mil', '12,4 mil', '215 mil', '1,3 mi']);
});

test('turnStats: do último pedido do usuário à última resposta; tok/s pela soma das respostas', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'calmturn-'));
  after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 't.jsonl');
  const ts = (s) => new Date(Date.UTC(2026, 10, 19, 12, 0, s)).toISOString();
  const rows = [
    { type: 'user', timestamp: ts(0), message: { role: 'user', content: 'antigo' } },
    { type: 'assistant', timestamp: ts(5), message: { usage: { output_tokens: 999 } } },
    { type: 'user', timestamp: ts(10), message: { role: 'user', content: 'roda os testes' } },
    { type: 'assistant', timestamp: ts(14), message: { usage: { output_tokens: 100 } } },
    { type: 'user', timestamp: ts(30), message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'x' }] } },
    { type: 'assistant', timestamp: ts(52), message: { usage: { output_tokens: 760 } } },
  ];
  fs.writeFileSync(file, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  // turno 10 s → 52 s = 42 s; respostas: 4 s (10→14) e 22 s (30→52), 860 tokens / 26 s ≈ 33 tok/s
  assert.deepEqual(turnStats(file), { ms: 42_000, tps: 33 });
  assert.equal(turnStats(path.join(dir, 'nada.jsonl')), undefined);
  fs.writeFileSync(file, JSON.stringify(rows[0]) + '\n');
  assert.equal(turnStats(file), undefined, 'sem resposta ainda: nada');
});

test('3ª linha: tokens, cache, turno e velocidade abaixo dos medidores; some sem dados', () => {
  const p = base({ context_window: { context_window_size: 1e6, used_percentage: 9, total_input_tokens: 90_000, current_usage: { input_tokens: 400, output_tokens: 1_800, cache_read_input_tokens: 102_000, cache_creation_input_tokens: 21_600 } } });
  const lines = plain(render(p, { ...opts, turn: { ms: 42_000, tps: 38 } }));
  assert.equal(lines[2], '↓ 124 mil ↑ 1,8 mil · cache 82% · turno 0:42 · 38 tok/s');
  // Contrato mudado em 2026-11-24 (antes: sem uso nem turno, sem 3ª linha): a linha surgia no 1º turno e empurrava o editor
  // uma linha para cima no meio da resposta (medido em pty, tmux e kitty). Agora ela existe desde a abertura, com o uso real: zero.
  assert.deepEqual(plain(render(base(), { ...opts, turn: undefined })).slice(2), ['↓ 0 ↑ 0'], 'sem uso nem turno: 3ª linha zerada');
  assert.equal(plain(render(base(), { ...opts, turn: { ms: 3_725_000, tps: 0 } }))[2], 'turno 1:02:05');
});

// O effort vai entre parênteses logo após o modelo, sem o ponto, e a cor sobe com o nível:
// cinza (off, minimal), verde (low), azul (medium), roxo (high), vermelho (xhigh, max). Antes `· medium` em cinza.
test('effort: (nível) colado ao modelo, cor pela intensidade', () => {
  const cor = { off: 'sec', minimal: 'sec', low: 'ok', medium: 'usage', high: 'high', xhigh: 'crit', max: 'crit' };
  for (const [level, role] of Object.entries(cor)) {
    const l1 = render(base({ effort: { level } }), opts)[0];
    assert.ok(plain([l1])[0].startsWith(`Fable 5.2 (${level}) · nycode`), plain([l1])[0]);
    assert.ok(l1.includes(`\x1b[38;2;${rgb(role)}m(${level})`), `${level} em ${role}`);
  }
  assert.ok(plain(render(base({ effort: undefined }), opts))[0].startsWith('Fable 5.2 · nycode'), 'sem effort: sem parênteses');
});

test('statusline.mjs usa renderer calm por padrão sem config.json', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'calm-default-'));
  const proj = path.join(dir, 'proj');
  fs.mkdirSync(proj);
  after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'resources', 'statusline', 'statusline.mjs');
  const input = JSON.stringify({ ...base(), cwd: proj, workspace: { current_dir: proj }, rate_limits: undefined });
  const r = spawnSync(process.execPath, [script], { input, encoding: 'utf8', env: { ...process.env, HOME: dir, COLUMNS: '100', NO_COLOR: '1', NYCODE_CODING_AGENT_DIR: dir }, timeout: 20_000 });
  assert.equal(r.status, 0, r.stderr);
  const [l1, l2] = r.stdout.split('\n');
  assert.equal(l1, 'Fable 5.2 (medium) · proj │ 12m · $1.08');
  assert.equal(l2, 'ctx ━━━━━━━━ 9%');
});
