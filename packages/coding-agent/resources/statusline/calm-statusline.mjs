// Status line "Calmo" do nycode (docs/designs/statusline): desenho próprio, sem o claude-hud.
// Ligado por "renderer": "calm" em plugins/claude-hud/config.json; "level": "detalhe" abre o painel.
// Cores e limiares do claude-hud 0.10.0 (substitui as quatro cores 40/60/80 e 50/75/90):
// contexto verde <70, amarelo 70-85, vermelho ≥85; uso azul <75, roxo 75-90 ou ritmo de alerta, vermelho ≥90 ou ritmo
// crítico. Ritmo (usage-pace.ts): projeção linear até a renovação ≥90% é alerta, >100% é crítico; ▲ na cor do ritmo.
// Paleta: a do tema do nycode em uso (settings.json), não a do claude-hud.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Papéis do HUD → cores do tema do nycode; `high` (o magenta do claude-hud) usa mdCode, roxo nos temas nycode-claro/nycode-escuro.
const ROLES = { text: 'text', sec: 'dim', track: 'borderMuted', ok: 'success', warn: 'warning', crit: 'error', usage: 'accent', high: 'mdCode' };
const FALLBACK = { text: '#f5f5f7', sec: '#98989d', track: '#48484a', ok: '#30d158', warn: '#ffd60a', crit: '#ff6961', usage: '#409cff', high: '#da8fff' }; // nycode-escuro

/** Paleta do tema do nycode. Par "claro/escuro" resolvido como o nycode: COLORFGBG, senão escuro. */
// ponytail: o nycode também lê o fundo do terminal (OSC 11), que este processo filho não vê; terminal claro sem COLORFGBG pega o escuro.
export function themePalette(env = process.env, dir = path.join(os.homedir(), '.nycode', 'agent')) {
  try {
    const setting = String(JSON.parse(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8')).theme ?? '');
    const [light, dark = light] = setting.split('/').map((s) => s.trim());
    const bg = env.COLORFGBG?.split(';').at(-1)?.trim();
    const isLight = /^\d{1,2}$/.test(bg ?? '') && Number(bg) <= 15 && Number(bg) !== 8 && Number(bg) > 6;
    const t = JSON.parse(fs.readFileSync(path.join(dir, 'themes', `${isLight ? light : dark}.json`), 'utf8'));
    const hex = (v) => (/^#[0-9a-f]{6}$/i.test(v) ? v : /^#[0-9a-f]{6}$/i.test(t.vars?.[v]) ? t.vars[v] : undefined);
    return Object.fromEntries(Object.entries(ROLES).map(([role, token]) => [role, hex(t.colors?.[token]) ?? FALLBACK[role]]));
  } catch {
    return FALLBACK;
  }
}

let HEX = FALLBACK; // trocada por render() a cada chamada
const paint = (name, s) => {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(HEX[name].slice(i, i + 2), 16));
  return `\x1b[38;2;${r};${g};${b}m${s}\x1b[0m`;
};
const dot = () => paint('sec', ' · '); // separador dos medidores, o mesmo da linha 1
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const ANSI = /\x1b\[[0-9;:]*m/g;
// U17: largura em colunas do terminal. ponytail: aproximação da tabela do @nycode/tui (CJK/fullwidth e emoji = 2, combinante e
// ZWJ/seletor de variação = 0); sequências de grafemas compostas contam por code point.
const WIDE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6\u{1f300}-\u{1f64f}\u{1f900}-\u{1f9ff}\u{20000}-\u{3fffd}]/u;
const ZERO = /[\u0300-\u036f\u200b-\u200f\u20d0-\u20ff\ufe00-\ufe0f]/u;
const charCells = (ch) => (ZERO.test(ch) ? 0 : WIDE.test(ch) || (/\p{Extended_Pictographic}/u.test(ch) && ch.codePointAt(0) > 0x1f000) ? 2 : 1);
export const cellWidth = (s) => [...s.replace(ANSI, '')].reduce((n, ch) => n + charCells(ch), 0);
const width = cellWidth;
/** Corta a linha em `columns` colunas (com `…`), preservando as sequências ANSI e fechando a cor. */
function fit(line, columns) {
  if (!(columns > 0) || width(line) <= columns) return line;
  let out = '';
  let used = 0;
  for (const part of line.split(/(\x1b\[[0-9;:]*m)/)) {
    if (part.startsWith('\x1b[')) { out += part; continue; }
    for (const ch of part) {
      const w = charCells(ch);
      if (used + w > columns - 1) return `${out}…\x1b[0m`;
      out += ch;
      used += w;
    }
  }
  return out;
}

export const LIMITS = { ctx: [70, 85], usage: [75, 90] };
const CRIT = 85; // ctx: fração do limite de compactação que conta como "compacta em breve"
const STALE_MS = 10 * 60_000;
const WINDOW_MS = { five_hour: 5 * 3_600_000, seven_day: 7 * 86_400_000 };
const NYCODE_RESERVE = 16_384; // padrão do nycode para compaction.reserveTokens

/** `<1m`, `12m`, `2h 14m`, `1d 6h`: as duas maiores unidades. */
export function span(ms) {
  const m = Math.floor(ms / 60_000);
  if (m < 1) return '<1m';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
  return h % 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${Math.floor(h / 24)}d`;
}

const tokens = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));

const GIT_TTL_MS = 8_000; // U18: a statusline roda a cada mensagem; o estado do git não precisa ser mais fresco que isso
const GIT_CACHE_DIRS = 20;
const gitRun = (cwd) => execFileSync('git', ['--no-optional-locks', '-C', cwd, 'status', '--porcelain=v1', '-b'], { encoding: 'utf8', timeout: 400, stdio: ['ignore', 'pipe', 'ignore'] });

const diffRun = (cwd) => execFileSync('git', ['--no-optional-locks', '-C', cwd, 'diff', 'HEAD', '--shortstat'], { encoding: 'utf8', timeout: 400, stdio: ['ignore', 'pipe', 'ignore'] });

function parseGit(out) {
  const [head = '', ...rest] = out.split('\n').filter(Boolean);
  const branch = /^## (?:No commits yet on )?(.+?)(?:\.\.\.|$| \[)/.exec(head)?.[1];
  if (!branch) return undefined;
  const n = (re) => Number(re.exec(head)?.[1] ?? 0);
  return { branch: branch.startsWith('HEAD') ? 'HEAD' : branch, dirty: rest.length > 0, ahead: n(/ahead (\d+)/), behind: n(/behind (\d+)/) };
}
/** `git diff HEAD --shortstat` → linhas +/−; sem commits (HEAD inválido) fica zero. */
function parseDiff(diff, cwd) {
  try {
    const out = diff(cwd);
    return { added: Number(/(\d+) insertion/.exec(out)?.[1] ?? 0), removed: Number(/(\d+) deletion/.exec(out)?.[1] ?? 0) };
  } catch {
    return { added: 0, removed: 0 };
  }
}

/** Branch e sujo de `cwd`; undefined fora de repositório. Com `file`, cache por diretório por 8 s; se o git estourar o
 * prazo (repo grande, NFS) devolve o último valor conhecido em vez de fazer a branch sumir. */
export function gitState(cwd, { file, now = Date.now(), ttl = GIT_TTL_MS, run = gitRun, diff = diffRun } = {}) {
  let cache = {};
  if (file) {
    try {
      cache = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!cache || typeof cache !== 'object' || Array.isArray(cache)) cache = {};
    } catch {}
  }
  const hit = cache[cwd];
  if (hit && now - hit.at >= 0 && now - hit.at < ttl) return hit.value ?? undefined;
  let value;
  try {
    value = parseGit(run(cwd));
    if (value) value = { ...value, ...(value.dirty ? parseDiff(diff, cwd) : { added: 0, removed: 0 }) };
  } catch (e) {
    if (e?.code === 'ETIMEDOUT' || e?.killed) value = hit?.value ?? undefined; // lento: mantém o último; não repete o atraso a cada render
  }
  if (file) {
    delete cache[cwd];
    cache[cwd] = { at: now, value: value ?? null };
    for (const k of Object.keys(cache).slice(0, Math.max(0, Object.keys(cache).length - GIT_CACHE_DIRS))) delete cache[k];
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(`${file}.${process.pid}.tmp`, JSON.stringify(cache));
      fs.renameSync(`${file}.${process.pid}.tmp`, file);
    } catch {}
  }
  return value;
}

/** Tokens reservados antes da compactação automática para o modelo ativo (settings.json do nycode). */
export function reserveTokens(model, file = path.join(os.homedir(), '.nycode', 'agent', 'settings.json')) {
  try {
    const c = JSON.parse(fs.readFileSync(file, 'utf8')).compaction ?? {};
    if (c.enabled === false) return undefined;
    return c.modelOverrides?.[`${model?.provider}/${model?.id}`]?.reserveTokens ?? c.reserveTokens ?? NYCODE_RESERVE;
  } catch {
    return NYCODE_RESERVE;
  }
}

/** Limiar escrito ao lado da cor, para não depender só dela (WCAG 1.4.1). */
export const ctxLabel = (pct) => (pct >= LIMITS.ctx[1] ? `acima de ${LIMITS.ctx[1]}%` : pct >= LIMITS.ctx[0] ? `acima de ${LIMITS.ctx[0]}%` : '');

const ctxLevel = (pct) => (pct >= LIMITS.ctx[1] ? 'crit' : pct >= LIMITS.ctx[0] ? 'warn' : 'ok');

/** Janela de uso: nível e ritmo como no claude-hud, e em quanto tempo acaba se o ritmo levar a 100% antes da renovação. */
export function windowState(limit, windowMs, now) {
  const pct = Math.round(limit.used_percentage);
  const left = Number.isFinite(limit.resets_at) ? limit.resets_at * 1000 - now : undefined;
  const elapsed = left === undefined ? undefined : windowMs - left;
  // Abaixo de 10% a projeção é ruído: um turno no começo da janela já estoura o ritmo.
  const timed = elapsed > 0 && left > 0 && pct >= 10;
  const projected = timed ? (pct * windowMs) / elapsed : 0;
  const pace = projected > 100 ? 'crit' : projected >= 90 ? 'high' : undefined;
  const eta = timed && pct < 100 && (elapsed * (100 - pct)) / pct < left ? (elapsed * (100 - pct)) / pct : undefined;
  const level = pct >= LIMITS.usage[1] || pace === 'crit' ? 'crit' : pct >= LIMITS.usage[0] || pace ? 'high' : 'usage';
  return { pct, left: left > 0 ? left : undefined, eta, pace, level };
}

function bar(pct, cells, level, stale) {
  const on = stale ? 0 : Math.min(cells, Math.max(pct > 0 ? 1 : 0, Math.round((pct * cells) / 100)));
  return (on ? paint(level, '━'.repeat(on)) : '') + paint('track', '━'.repeat(cells - on));
}

/** Os três medidores como dados: rótulo curto e longo, percentual, nível, nota curta e detalhe do painel. */
function meters(p, { now, reserve }) {
  const out = [];
  const cw = p.context_window ?? {};
  if (Number.isFinite(cw.used_percentage)) {
    const used = cw.total_input_tokens ?? 0;
    const limit = reserve === undefined ? undefined : (cw.context_window_size ?? 0) - reserve;
    const soon = limit > 0 && used >= limit * (CRIT / 100);
    const pct = Math.round(cw.used_percentage);
    out.push({ short: 'ctx', long: 'Contexto', pct, level: soon ? 'crit' : ctxLevel(pct), note: soon ? 'compacta em breve' : ctxLabel(pct),
      detail: [`${tokens(used)} de ${tokens(cw.context_window_size ?? 0)}`, limit > 0 ? `compacta em ${tokens(limit)}` : ''].filter(Boolean).join(' · ') });
  }
  const stale = Number.isFinite(p.rate_limits_at) && now - p.rate_limits_at > STALE_MS;
  for (const [key, short, long] of [['five_hour', '5h', 'Sessão 5h'], ['seven_day', 'semana', 'Semana']]) {
    const limit = p.rate_limits?.[key];
    if (!Number.isFinite(limit?.used_percentage)) continue;
    const w = windowState(limit, WINDOW_MS[key], now);
    // A nota diz quando a janela renova; a projeção de ritmo vira só o ▲ e fica no painel.
    const pace = w.eta === undefined || w.level === 'crit' ? '' : `nesse ritmo acaba em ${span(w.eta)}`;
    const renews = w.left === undefined ? '' : `renova em ${span(w.left)}`;
    out.push({ short, long, pct: w.pct, level: w.level, stale, mark: w.pace ? paint(w.pace, ' ▲') : '', note: stale ? '' : renews, detail: [renews, pace].filter(Boolean).join(' · ') });
  }
  if (stale && out.some((m) => m.stale)) out.at(-1).note = `limites de ${span(now - p.rate_limits_at)} atrás`;
  return out;
}

function meterText(m, cells) {
  const color = m.stale ? 'sec' : m.level;
  return [paint('sec', m.short), cells ? bar(m.pct, cells, m.level, m.stale) : '', paint(color, `${m.pct}%${m.stale ? '' : (m.mark ?? '')}`), m.note ? paint('sec', m.note) : ''].filter(Boolean).join(' ');
}

/** Parcela da entrada do último turno lida do cache; undefined sem dado ou com entrada pequena demais para importar. */
export function cacheRatio(p) {
  const u = p.context_window?.current_usage;
  if (!u) return undefined;
  const read = u.cache_read_input_tokens ?? 0;
  const total = read + (u.cache_creation_input_tokens ?? 0) + (u.input_tokens ?? 0);
  return total >= 20_000 ? Math.round((read * 100) / total) : undefined;
}

// Ramo em Nerd Font (nf-dev-git_branch); sem ela (NYCODE_ASCII_ICONS=1, console linux/dumb) o ⎇ de antes.
const ramo = (env = process.env) => (env.NYCODE_ASCII_ICONS === '1' || /^(?:dumb|linux)$/.test(env.TERM ?? '') ? '⎇' : '\ue725');

/** Ramo, ↑/↓ e +/−; sujo sem linhas mudadas (só arquivos novos) mostra `*`. */
function gitText(git) {
  const extra = [git.ahead ? `↑${git.ahead}` : '', git.behind ? `↓${git.behind}` : ''].filter(Boolean).join(' ');
  const linhas = [git.added ? paint('ok', `+${git.added}`) : '', git.removed ? paint('crit', `−${git.removed}`) : ''].filter(Boolean).join(' ');
  const sujo = git.dirty && !git.added && !git.removed ? '*' : '';
  const branch = String(git.branch)
    .replace(/\u001b(?:\][\s\S]*?(?:\u0007|\u001b\\)|[P^_][\s\S]*?\u001b\\|\[[0-9:;<=>?]*[ -/]*[@-~])/g, (seq) => (seq.startsWith('\u001b[') && seq.endsWith('m') ? seq : ''))
    .replace(/\u001b(?!\[[0-9:;<=>?]*m)/g, '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001a\u001c-\u001f\u007f-\u009f]/g, '');
  return paint('usage', `${ramo()} ${branch}`) + paint('sec', sujo + (extra ? ` ${extra}` : '')) + (linhas ? ` ${linhas}` : '');
}

/** Cor do effort pela intensidade: cinza, verde, azul, roxo, vermelho. */
const EFFORT_COR = { off: 'sec', minimal: 'sec', low: 'ok', medium: 'usage', high: 'high', xhigh: 'crit', max: 'crit' };

function head(p, git) {
  const cwd = p.workspace?.project_dir || p.workspace?.current_dir || p.cwd || '';
  const dir = cwd === os.homedir() ? '~' : path.basename(cwd);
  // Effort entre parênteses colado ao modelo, na cor da intensidade (antes `· medium` em cinza).
  const lv = p.effort?.level;
  const effort = lv ? ' ' + paint(EFFORT_COR[lv] ?? 'sec', `(${lv})`) : '';
  const left = bold(paint('text', p.model?.display_name || p.model?.id || '?')) + effort + paint('sec', dir ? ` · ${dir}` : '') + (git ? dot() + gitText(git) : '');
  const cost = p.cost ?? {};
  const spent = [Number.isFinite(cost.total_duration_ms) ? span(cost.total_duration_ms) : '', Number.isFinite(cost.total_cost_usd) ? `$${cost.total_cost_usd.toFixed(2)}` : ''].filter(Boolean).join(' · ');
  // Tempo e custo logo depois da identidade, à esquerda, atrás de um traço vertical.
  return spent ? left + paint('track', ' │ ') + paint('sec', spent) : left;
}

/** 12 400 → `12,4 mil`, 1 250 000 → `1,3 mi` (pt-BR). */
export function milhar(n) {
  const f = (v, un) => `${(v >= 100 ? Math.round(v) : Math.round(v * 10) / 10).toString().replace('.', ',')} ${un}`;
  return n >= 1e6 ? f(n / 1e6, 'mi') : n >= 1e3 ? f(n / 1e3, 'mil') : String(n);
}
const relogio = (ms) => {
  const t = Math.round(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = String(t % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

const TAIL_BYTES = 256 * 1024;
/** Último turno no transcript (formato Claude): do último pedido do usuário (texto, não tool_result) à última resposta;
 * tok/s = saída das respostas / tempo de cada uma (do registro anterior até ela). Lê só o fim do arquivo. */
export function turnStats(file) {
  let rows;
  try {
    const fd = fs.openSync(file, 'r');
    try {
      const size = fs.fstatSync(fd).size, len = Math.min(size, TAIL_BYTES), buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, size - len);
      rows = buf.toString('utf8').split('\n').slice(size > len ? 1 : 0).flatMap((l) => { try { return l ? [JSON.parse(l)] : [] } catch { return [] } });
    } finally { fs.closeSync(fd) }
  } catch {
    return undefined;
  }
  const ts = (r) => Date.parse(r?.timestamp ?? '');
  const inicio = rows.findLastIndex((r) => r.type === 'user' && (typeof r.message?.content === 'string' || r.message?.content?.some?.((c) => c?.type === 'text')));
  if (inicio < 0) return undefined;
  let fim, out = 0, dur = 0;
  for (let i = inicio + 1; i < rows.length; i++) {
    if (rows[i].type !== 'assistant') continue;
    fim = ts(rows[i]);
    const d = fim - ts(rows[i - 1]);
    if (Number.isFinite(d) && d > 0) { dur += d; out += rows[i].message?.usage?.output_tokens ?? 0 }
  }
  const ms = fim - ts(rows[inicio]);
  return Number.isFinite(ms) && ms >= 0 ? { ms, tps: dur > 0 ? Math.round((out * 1000) / dur) : 0 } : undefined;
}

/** 3ª linha: tokens do último pedido, cache, turno e velocidade. */
function extraLine(p, turn) {
  const u = p.context_window?.current_usage;
  const partes = [];
  if (u) partes.push(`↓ ${milhar((u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0))} ↑ ${milhar(u.output_tokens ?? 0)}`);
  const cache = cacheRatio(p);
  // ponytail: o primeiro turno sempre grava o cache (0% lido); 5 min de carência evita o falso alerta de início de sessão.
  const fresh = (p.cost?.total_duration_ms ?? Infinity) < 5 * 60_000 && cache === 0;
  const ruim = cache !== undefined && cache < 50 && !fresh;
  if (cache !== undefined) partes.push(ruim ? { warn: `▲ cache ${cache}%` } : `cache ${cache}%`);
  if (turn) partes.push(`turno ${relogio(turn.ms)}`, ...(turn.tps > 0 ? [`${turn.tps} tok/s`] : []));
  // Sem uso ainda: a linha existe zerada, para o painel não crescer no 1º turno e empurrar o editor (2026-11-24).
  if (!partes.length) partes.push('↓ 0 ↑ 0');
  return partes.map((s) => (typeof s === 'string' ? paint('sec', s) : paint('warn', s.warn))).join(dot());
}

function panel(p, ms) {
  const row = (label, ...cells) => [paint('sec', label.padEnd(11)), ...cells].join(' ');
  const rows = ms.map((m) => row(m.long, bar(m.pct, 12, m.level, m.stale), paint(m.stale ? 'sec' : m.level, `${String(m.pct).padStart(4)}%${m.mark || '  '}`), paint('sec', m.detail)));
  const cache = cacheRatio(p);
  if (cache !== undefined) rows.push(row('Cache', bar(cache, 12, cache < 50 ? 'warn' : 'text'), paint(cache < 50 ? 'warn' : 'text', `${String(cache).padStart(4)}%  `), paint('sec', 'lido do cache no último turno')));
  const u = p.context_window?.current_usage;
  if (u) rows.push(row('Tokens', paint('sec', `entrada ${tokens((u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0))} · saída ${tokens(u.output_tokens ?? 0)} no último turno`)));
  const { total_lines_added: add = 0, total_lines_removed: del = 0, total_cost_usd: usd, total_duration_ms: dur } = p.cost ?? {};
  if (add || del) rows.push(row('Alterações', paint('ok', `+${add}`), paint('crit', `−${del}`), paint('sec', 'linhas')));
  const rate = usd > 0 && dur >= 10 * 60_000 ? `$${((usd * 3_600_000) / dur).toFixed(2)} por hora` : '';
  if (p.session_name || rate) rows.push(row('Sessão', paint('sec', [p.session_name, rate].filter(Boolean).join(' · '))));
  return rows;
}

/** As linhas da status line. `level`: 'padrao' (2 linhas + avisos) ou 'detalhe' (painel). */
export function render(p, { columns = 120, now = Date.now(), gitCacheFile, git = gitState(p?.workspace?.current_dir || p?.cwd || '.', { file: gitCacheFile }), reserve = reserveTokens(p?.model), level = 'padrao', palette = themePalette(), turn = typeof p?.transcript_path === 'string' ? turnStats(p.transcript_path) : undefined } = {}) {
  HEX = palette;
  const ms = meters(p, { now, reserve });
  const lines = [head(p, git)];
  if (level === 'detalhe') lines.push(...panel(p, ms));
  else if (ms.length) {
    const juntas = ms.map((m) => meterText(m, 8)).join('    ');
    // Se não couber tudo, preserva as faixas e o fallback original para terminais estreitos.
    if (width(juntas) <= columns) lines.push(juntas);
    else for (const row of [ms.filter((m) => m.short === 'ctx'), ms.filter((m) => m.short !== 'ctx')]) {
      if (!row.length) continue;
      const brief = row.map((m) => ({ ...m, note: m.note.replace('renova em ', '↻ ') }));
      const bare = row.map((m) => ({ ...m, note: '' }));
      const tries = [[row, 8], [brief, 8], [bare, 8], [bare, 0]].map(([list, cells]) => list.map((m) => meterText(m, cells)).join(dot()));
      lines.push(tries.find((l) => width(l) <= columns) ?? tries.at(-1));
    }
  }
  const extra = level !== 'detalhe' ? extraLine(p, turn) : undefined;
  if (extra) lines.push(extra);
  return lines.map((l) => fit(l, columns));
}
