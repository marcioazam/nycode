// Run: node --test packages/coding-agent/test/harness/statusline/claude-hud-provider.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { activeModelProvider } from '../../../resources/statusline/claude-hud-provider.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hudprov-'));
after(() => fs.rmSync(dir, { recursive: true, force: true }));
const change = (provider, modelId) => JSON.stringify({ type: 'model_change', provider, modelId });
const session = (name, lines) => {
  const file = path.join(dir, name);
  fs.writeFileSync(file, lines.join('\n') + '\n');
  return file;
};
const payload = (file, id) => ({ transcript_path: file, model: { id } });

test('the last model_change names the provider, and only when it matches the payload model', () => {
  const file = session('a.jsonl', [change('anthropic', 'claude-opus-5-5'), '{"type":"message"}', change('openai-codex', 'gpt-5.5'), '{"type":"message","x":"model_change"}']);
  assert.equal(activeModelProvider(payload(file, 'gpt-5.5')), 'openai-codex');
  // payload already shows another model than the session recorded (switch in flight): unknown, never the old provider
  assert.equal(activeModelProvider(payload(file, 'claude-opus-5-5')), undefined);
});

test('missing file, no model_change, malformed or absent payload fields are unknown', () => {
  assert.equal(activeModelProvider(payload(path.join(dir, 'nope.jsonl'), 'x')), undefined);
  assert.equal(activeModelProvider(payload(session('b.jsonl', ['{"type":"message"}', 'not json']), 'x')), undefined);
  assert.equal(activeModelProvider({}), undefined);
  assert.equal(activeModelProvider(undefined), undefined);
  assert.equal(activeModelProvider(payload(session('c.jsonl', [change('', 'x')]), 'x')), undefined);
});

test('finds a model_change older than one read chunk, bounded by the cap', () => {
  const filler = '{"type":"message","text":"' + 'x'.repeat(2000) + '"}';
  const lines = [change('openai-codex', 'gpt-5.5'), ...Array(100).fill(filler)];
  const file = session('d.jsonl', lines);
  assert.equal(activeModelProvider(payload(file, 'gpt-5.5')), 'openai-codex');
  assert.equal(activeModelProvider(payload(file, 'gpt-5.5'), { maxBytes: 4096 }), undefined);
});

test('payload.model.provider wins without reading the session; invalid values fall back to the session scan', () => {
  const file = session('payload.jsonl', [change('anthropic', 'm1')]);
  assert.equal(activeModelProvider({ transcript_path: '/nonexistent', model: { id: 'm1', provider: 'openai-codex' } }), 'openai-codex');
  assert.equal(activeModelProvider({ transcript_path: file, model: { id: 'm1', provider: 'openai-codex' } }), 'openai-codex');
  for (const bad of ['', 'a b', 'x/../y', 'a'.repeat(65), 7, null, { a: 1 }]) {
    assert.equal(activeModelProvider({ transcript_path: file, model: { id: 'm1', provider: bad } }), 'anthropic', String(bad));
    assert.equal(activeModelProvider({ transcript_path: '/nonexistent', model: { id: 'm1', provider: bad } }), undefined, String(bad));
  }
});

test('U19: lê de trás para frente em blocos de 64 KB e para no 1º model_change (não lê o arquivo inteiro)', () => {
  const filler = '{"type":"message","text":"' + 'x'.repeat(1000) + '"}';
  const tail = Array(50).fill(filler);
  const head = Array(4000).fill(filler); // ~4 MB antes do model_change
  const file = session('e.jsonl', [change('anthropic', 'old'), ...head, change('openai-codex', 'gpt-5.5'), ...tail]);
  const real = fs.readSync;
  let bytes = 0;
  fs.readSync = (...a) => { const n = real(...a); bytes += n; return n; };
  try {
    assert.equal(activeModelProvider(payload(file, 'gpt-5.5')), 'openai-codex');
  } finally {
    fs.readSync = real;
  }
  assert.ok(bytes <= 256 * 1024, `leu ${bytes} bytes`);
  // linha que cruza a fronteira de dois blocos continua inteira
  const long = '{"type":"model_change","provider":"p-split","modelId":"m","pad":"' + 'y'.repeat(100_000) + '"}';
  assert.equal(activeModelProvider(payload(session('f.jsonl', [long, filler]), 'm')), 'p-split');
});
