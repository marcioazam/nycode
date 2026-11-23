// Run: node --test packages/coding-agent/test/harness/statusline/claude-hud-nycode-transcript.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { isNycodeSession, syncTranscript } from '../../../resources/statusline/claude-hud-nycode-transcript.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
let n = 0;
const msg = (message) => ({ type: 'message', id: `e${n++}`, parentId: null, timestamp: '2026-11-11T10:00:00.000Z', message });
const call = (id, name, args) => msg({ role: 'assistant', content: [{ type: 'toolCall', id, name, arguments: args }], usage: { input: 1, output: 2, cacheRead: 3, cacheWrite: 4 }, model: 'claude-opus-5-5', responseId: `r-${id}` });
const result = (id, toolName, text, isError = false) => msg({ role: 'toolResult', toolCallId: id, toolName, content: [{ type: 'text', text }], isError });
const header = { type: 'session', version: 3, id: 's', timestamp: '2026-11-11T10:00:00.000Z', cwd: '/x' };

const tmpDirs = [];
after(() => tmpDirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

function setup(entries) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hudpi-'));
  tmpDirs.push(dir);
  const source = path.join(dir, 'session.jsonl');
  fs.writeFileSync(source, [header, ...entries].map((e) => JSON.stringify(e)).join('\n') + '\n');
  return { dir, source, out: path.join(dir, 'out', 'session.jsonl') };
}
const lines = (file) => fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const toolUses = (file) => lines(file).flatMap((l) => (Array.isArray(l.message?.content) ? l.message.content : [])).filter((b) => b.type === 'tool_use');

test('detects nycode sessions only', () => {
  const { source, dir } = setup([]);
  assert.equal(isNycodeSession(source), true);
  const claude = path.join(dir, 'claude.jsonl');
  fs.writeFileSync(claude, '{"type":"user","message":{"content":"x"}}\n');
  assert.equal(isNycodeSession(claude), false);
  assert.equal(isNycodeSession(path.join(dir, 'missing.jsonl')), false);
});

test('maps nycode tools to the Claude names the HUD knows', () => {
  const { source, out } = setup([
    call('t1', 'bash', { command: 'ls' }), result('t1', 'bash', 'ok'),
    call('t2', 'read', { path: '/a/b.py' }), result('t2', 'read', 'x'),
    call('t3', 'read', { path: '/h/.nycode/agent/skills/tdd/SKILL.md' }), result('t3', 'read', 'x'),
    call('t4', 'edit', { path: '/a/b.py', edits: [] }), result('t4', 'edit', 'x', true),
    call('t5', 'find', { pattern: '*.ts' }), call('t6', 'mcp__keenable__search_web_pages', { query: 'q' }),
  ]);
  syncTranscript(source, out);
  const uses = toolUses(out);
  assert.deepEqual(uses.map((u) => u.name), ['Bash', 'Read', 'Skill', 'Edit', 'Glob', 'mcp__keenable__search_web_pages']);
  assert.deepEqual(uses[1].input, { file_path: '/a/b.py' });
  assert.deepEqual(uses[2].input, { skill: 'tdd' });
  const results = lines(out).flatMap((l) => (Array.isArray(l.message?.content) ? l.message.content : [])).filter((b) => b.type === 'tool_result');
  assert.deepEqual(results.map((r) => [r.tool_use_id, r.is_error]), [['t1', false], ['t2', false], ['t3', false], ['t4', true]]);
  const usage = lines(out).find((l) => l.type === 'assistant').message.usage;
  assert.deepEqual(usage, { input_tokens: 1, output_tokens: 2, cache_read_input_tokens: 3, cache_creation_input_tokens: 4 });
});

test('subagent calls emit no Agent blocks nor agent queue ops; other tools and todos stay', () => {
  const { source, out } = setup([
    call('s1', 'subagent', { agent: 'code-reviewer', task: 'review the diff' }), result('s1', 'subagent', 'done'),
    call('s2', 'subagent', { tasks: [{ agent: 'Explore', task: 'a' }, { agent: 'swarm-worker', task: 'b' }] }), result('s2', 'subagent', 'done'),
    call('s3', 'subagent', { agent: 'gate-runner', task: 'gate', background: true }),
    result('s3', 'subagent', 'Started background run bg-abc123 (gate-runner). A notification will arrive...'),
    msg({ role: 'user', content: 'x' }),
    { type: 'custom_message', customType: 'subagent-background', content: 'Background subagent run bg-abc123 (gate-runner) done after 5 turns.\n\nok', timestamp: '2026-11-11T10:05:00.000Z' },
    call('t1', 'bash', { command: 'ls' }), result('t1', 'bash', 'ok'),
    call('d1', 'todo', { action: 'add', text: 'tarefa' }), result('d1', 'todo', 'Added #1'),
  ]);
  syncTranscript(source, out);
  const names = toolUses(out).map((u) => u.name);
  assert.equal(names.includes('Agent'), false);
  assert.equal(names.includes('subagent'), false);
  assert.equal(lines(out).some((l) => l.type === 'queue-operation'), false);
  assert.deepEqual(names.filter((n) => n === 'Bash' || n === 'TodoWrite'), ['Bash', 'TodoWrite']);
});

test('todo actions rebuild the list as TodoWrite', () => {
  const { source, out } = setup([
    call('a', 'todo', { action: 'add', text: 'um' }), result('a', 'todo', 'Added todo #1: um'),
    call('b', 'todo', { action: 'add', text: 'dois' }), result('b', 'todo', 'Added todo #2: dois'),
    call('c', 'todo', { action: 'start', id: 1 }), result('c', 'todo', 'Started #1'),
    call('d', 'todo', { action: 'start', id: 2 }), result('d', 'todo', 'Started #2'),
    call('e', 'todo', { action: 'complete', id: 2 }), result('e', 'todo', 'Completed #2'),
    call('f', 'todo', { action: 'complete', id: 9 }), result('f', 'todo', 'no such todo', true),
  ]);
  syncTranscript(source, out);
  const writes = toolUses(out).filter((u) => u.name === 'TodoWrite');
  assert.equal(writes.length, 5);
  assert.deepEqual(writes.at(-1).input.todos, [{ content: 'um', status: 'pending' }, { content: 'dois', status: 'completed' }]);
  assert.equal(toolUses(out).some((u) => u.name === 'todo'), false);
});

test('incremental: appends only new complete lines, rebuilds when the source shrinks', () => {
  const { source, out } = setup([call('t1', 'bash', { command: 'a' })]);
  syncTranscript(source, out);
  assert.equal(toolUses(out).length, 1);
  fs.appendFileSync(source, JSON.stringify(result('t1', 'bash', 'ok')) + '\n' + '{"type":"message","partial');
  syncTranscript(source, out);
  assert.equal(lines(out).length, 2);
  syncTranscript(source, out); // nada novo: idempotente
  assert.equal(lines(out).length, 2);
  fs.writeFileSync(source, JSON.stringify(header) + '\n');
  syncTranscript(source, out);
  assert.equal(fs.readFileSync(out, 'utf8'), '');
});

test('launcher feeds the translated transcript to the HUD (end to end)', async () => {
  const cache = path.join(os.homedir(), '.claude', 'plugins', 'cache');
  if (!fs.existsSync(cache) || !fs.readdirSync(cache).includes('claude-hud')) return; // sem claude-hud instalado: nada a testar
  const { source, dir } = setup([
    call('a', 'todo', { action: 'add', text: 'tarefa' }), result('a', 'todo', 'Added todo #1: tarefa'),
    call('b', 'todo', { action: 'start', id: 1 }), result('b', 'todo', 'Started #1'),
    call('t1', 'bash', { command: 'ls' }), result('t1', 'bash', 'ok'),
  ]);
  fs.mkdirSync(path.join(dir, 'plugins', 'claude-hud'), { recursive: true });
  fs.symlinkSync(cache, path.join(dir, 'plugins', 'cache')); // o launcher só procura o HUD no diretório do nycode (#404)
  fs.writeFileSync(path.join(dir, 'plugins', 'claude-hud', 'config.json'), JSON.stringify({ display: { showTools: true, showTodos: true } }));
  const { execFileSync } = await import('node:child_process');
  const payload = JSON.stringify({ model: { display_name: 'Opus' }, cwd: dir, context_window: { used_percentage: 1, context_window_size: 200000 }, transcript_path: source });
  const outText = execFileSync('node', [path.join(here, '..', '..', '..', 'resources', 'statusline', 'claude-hud-statusline.mjs')], { input: payload, env: { ...process.env, NYCODE_CODING_AGENT_DIR: dir, COLUMNS: '160' } }).toString().replace(/\x1b\[[0-9;]*m/g, '');
  assert.match(outText, /Bash/);
  assert.match(outText, /tarefa/);
});

// ---- S7 (poda) e U20 (trava O_EXCL, estado atômico, retomada após morte entre append e estado) ----
const old = (file, days) => {
  const t = new Date(Date.now() - days * 24 * 3600 * 1000);
  fs.utimesSync(file, t, t);
};

test('S7: a 1ª sincronização apaga cópias sem sessão-fonte ou com mais de 14 dias, e só elas', () => {
  const { dir, source, out } = setup([call('t1', 'bash', { command: 'ls' })]);
  const pdir = path.dirname(out);
  fs.mkdirSync(pdir, { recursive: true });
  const mk = (name, src, days) => {
    const f = path.join(pdir, name);
    fs.writeFileSync(f, '{}\n');
    fs.writeFileSync(`${f}.state.json`, JSON.stringify({ source: src, offset: 0 }));
    old(f, days);
    return f;
  };
  const alive = mk('alive.jsonl', source, 1);
  const aged = mk('aged.jsonl', source, 20);
  const orphan = mk('orphan.jsonl', path.join(dir, 'gone.jsonl'), 1);
  const noState = path.join(pdir, 'nostate.jsonl');
  fs.writeFileSync(noState, '{}\n');
  old(noState, 20);
  fs.writeFileSync(path.join(pdir, 'lonely.jsonl.state.json'), '{}');
  syncTranscript(source, out);
  const left = fs.readdirSync(pdir).sort();
  assert.deepEqual(left, ['.pruned', 'alive.jsonl', 'alive.jsonl.state.json', 'session.jsonl', 'session.jsonl.state.json']);
  assert.ok(fs.existsSync(alive) && !fs.existsSync(aged) && !fs.existsSync(orphan));
});

test('S7: a poda não repete dentro de uma hora (marcador .pruned)', () => {
  const { source, out } = setup([call('t1', 'bash', { command: 'ls' })]);
  const pdir = path.dirname(out);
  fs.mkdirSync(pdir, { recursive: true });
  fs.writeFileSync(path.join(pdir, '.pruned'), '');
  const aged = path.join(pdir, 'aged.jsonl');
  fs.writeFileSync(aged, '{}\n');
  old(aged, 20);
  syncTranscript(source, out);
  assert.ok(fs.existsSync(aged));
});

test('U20: trava fresca = outro processo sincronizando: não escreve nada; trava velha é retomada', () => {
  const { source, out } = setup([call('t1', 'bash', { command: 'ls' })]);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(`${out}.lock`, '');
  syncTranscript(source, out);
  assert.equal(fs.existsSync(out), false);
  old(`${out}.lock`, 1);
  syncTranscript(source, out);
  assert.equal(toolUses(out).length, 1);
  assert.equal(fs.existsSync(`${out}.lock`), false, 'trava liberada');
});

test('U20: morte entre o append e o estado não duplica linhas; estado por rename, sem .tmp sobrando', () => {
  const { source, out } = setup([call('t1', 'bash', { command: 'ls' })]);
  syncTranscript(source, out);
  const statePath = `${out}.state.json`;
  const before = fs.readFileSync(statePath, 'utf8');
  fs.appendFileSync(source, `${JSON.stringify(call('t2', 'bash', { command: 'pwd' }))}\n`);
  syncTranscript(source, out);
  const expected = fs.readFileSync(out, 'utf8');
  fs.writeFileSync(statePath, before); // como se o processo morresse antes de gravar o estado novo
  syncTranscript(source, out);
  assert.equal(fs.readFileSync(out, 'utf8'), expected);
  assert.deepEqual(fs.readdirSync(path.dirname(out)).filter((f) => /\.tmp$|\.lock$/.test(f)), []);
});
