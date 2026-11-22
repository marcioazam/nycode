// Uso de 5h e semanal no HUD, do provedor que o nycode está usando de fato. O nycode só preenche rate_limits com os
// headers `anthropic-ratelimit-unified-*` (sempre da Anthropic) e só depois da primeira resposta; por isso aqui:
//  - o rate_limits do stdin só vale para anthropic; em qualquer outro provedor (ou desconhecido) é descartado;
//  - na anthropic o header do nycode e a API se juntam (mergeWindows): o header só muda com uma resposta nova, e a API
//    (cache de 60 s, comum a todas as sessões) segue o uso da conta inteira mesmo com a sessão parada;
//  - o provedor ativo (claude-hud-provider.mjs) escolhe a fonte de cota, com o token OAuth do próprio nycode.
// Provedores com fonte instalada/documentada: anthropic (/api/oauth/usage) e openai-codex (chatgpt.com/backend-api/wham/usage,
// o endpoint do cliente oficial codex, mesma base do provider de @nycode/ai). Os demais não mostram cota, nunca inventada.
// Só leitura: nunca renova nem grava o token; o cache guarda só percentuais e resets (e um hash curto da conta).
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TTL_MS = 60_000; // o status line roda a cada mensagem; um pedido por minuto basta
const TIMEOUT_MS = 3_000;
const FIVE_HOUR_S = 5 * 3600;
const WEEK_S = 7 * 24 * 3600;

const finite = (n) => typeof n === 'number' && Number.isFinite(n);

/** Resposta do /api/oauth/usage → rate_limits do stdin do Claude Code (resets_at em segundos epoch). */
export function toRateLimits(data) {
  const win = (w) => {
    if (!finite(w?.utilization)) return undefined;
    const reset = Date.parse(w.resets_at ?? '');
    return { used_percentage: w.utilization, ...(Number.isFinite(reset) ? { resets_at: Math.floor(reset / 1000) } : {}) };
  };
  const five_hour = win(data?.five_hour);
  const seven_day = win(data?.seven_day);
  if (!five_hour && !seven_day) return undefined;
  return { ...(five_hour ? { five_hour } : {}), ...(seven_day ? { seven_day } : {}) };
}

/** Resposta do wham/usage → rate_limits. A janela é classificada pelo tamanho real (limit_window_seconds), não pela
 * posição primary/secondary: conta só semanal tem a janela semanal em primary e não ganha um 5h inventado. */
export function toCodexRateLimits(data) {
  const out = {};
  for (const w of [data?.rate_limit?.primary_window, data?.rate_limit?.secondary_window]) {
    if (!finite(w?.used_percent) || w.used_percent < 0) continue;
    const key = w.limit_window_seconds === FIVE_HOUR_S ? 'five_hour' : w.limit_window_seconds === WEEK_S ? 'seven_day' : undefined;
    if (!key || out[key]) continue;
    out[key] = { used_percentage: w.used_percent, ...(finite(w.reset_at) && w.reset_at > 0 ? { resets_at: w.reset_at } : {}) };
  }
  return out.five_hour || out.seven_day ? out : undefined;
}

const SOURCES = {
  anthropic: {
    cacheName: 'usage-cache.json', // formato histórico {at, rate_limits}: lido também pelo extensions/auto-resume
    url: 'https://api.anthropic.com/api/oauth/usage',
    parse: toRateLimits,
    request: ({ access }) => ({ Authorization: `Bearer ${access}`, 'anthropic-beta': 'oauth-2025-04-20', 'User-Agent': 'claude-hud-nycode' }),
  },
  'openai-codex': {
    cacheName: 'usage-cache.openai-codex.json',
    url: 'https://chatgpt.com/backend-api/wham/usage',
    parse: toCodexRateLimits,
    needsAccount: true, // o cache é atado à conta (hash), nunca ao token
    request: ({ access, accountId }) => ({ Authorization: `Bearer ${access}`, 'ChatGPT-Account-Id': accountId, 'User-Agent': 'claude-hud-nycode' }),
  },
};

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return undefined;
  }
}

function writeCache(file, value) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(value));
    fs.renameSync(tmp, file);
  } catch {
    // Sem cache só custa um pedido a mais no próximo render.
  }
}

const accountTag = (id) => (id ? crypto.createHash('sha256').update(String(id)).digest('hex').slice(0, 16) : undefined);

const SAME_WINDOW_S = 3600; // janelas seguidas renovam a 5 h ou mais uma da outra; a API e o header divergem em segundos

/** Junta duas leituras da mesma conta: janela mais nova (resets_at depois) vence; na mesma janela, o maior uso (só cresce). */
export function mergeWindows(a, b) {
  if (!a) return b;
  if (!b) return a;
  const out = {};
  for (const key of ['five_hour', 'seven_day']) {
    const x = a[key];
    const y = b[key];
    if (!x || !y) {
      if (x || y) out[key] = x ?? y;
      continue;
    }
    const rx = finite(x.resets_at) ? x.resets_at : undefined;
    const ry = finite(y.resets_at) ? y.resets_at : undefined;
    if (rx !== undefined && ry !== undefined && Math.abs(rx - ry) >= SAME_WINDOW_S) out[key] = rx > ry ? x : y;
    else out[key] = y.used_percentage > x.used_percentage ? y : x;
  }
  return out;
}

const LOCK_STALE_MS = 30_000;

/** Trava `<cache>.lock` (O_EXCL): um só renovador por vez; trava velha (renovador morto) é retomada. */
function takeLock(lock) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.closeSync(fs.openSync(lock, 'wx'));
      return true;
    } catch (e) {
      if (e.code !== 'EEXIST') return false;
      try {
        if (Date.now() - fs.statSync(lock).mtimeMs < LOCK_STALE_MS) return false; // relógio real: o mtime é do disco
        fs.rmSync(lock, { force: true });
      } catch {
        return false;
      }
    }
  }
  return false;
}

/** Processo destacado que renova o cache (U22): o render não espera o fetch. */
function spawnRefresh(provider, cacheFile, authFile) {
  spawn(process.execPath, [fileURLToPath(import.meta.url), '--refresh', provider, cacheFile, authFile], { detached: true, stdio: 'ignore' }).unref();
}

/** Fonte, credencial e cache do provedor; undefined sem credencial OAuth válida (nada do cache é servido nem regravado). */
function resolveSource(provider, cacheFile, authFile, now) {
  const source = Object.hasOwn(SOURCES, provider ?? '') ? SOURCES[provider] : undefined;
  if (!source) return undefined;
  const file = path.join(path.dirname(cacheFile), source.cacheName);
  const cred = readJson(authFile)?.[provider];
  const usable = cred?.type === 'oauth' && cred.access && !(cred.expires && cred.expires <= now) && (!source.needsAccount || cred.accountId);
  if (!usable) return undefined;
  const tag = source.needsAccount ? accountTag(cred?.accountId) : undefined;
  const cached = readJson(file);
  const mine = cached && (!source.needsAccount || cached.account === tag) ? cached : undefined;
  return { source, file, cred, tag, mine };
}

/** Busca na API e grava o cache (também as falhas, para um endpoint fora do ar não custar TIMEOUT_MS a cada render). */
async function fetchAndCache({ source, file, cred, tag, mine }, now, fetchImpl) {
  let limits = mine?.rate_limits;
  let ok = mine?.ok; // última leitura bem-sucedida: `at` também avança nas falhas
  try {
    const res = await fetchImpl(source.url, { headers: source.request(cred), signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'error' });
    if (res.ok) {
      limits = source.parse(await res.json());
      ok = now;
    }
  } catch {
    // Rede ou token falhou: fica o último valor conhecido deste provedor.
  }
  writeCache(file, { at: now, ...(ok ? { ok } : {}), ...(tag ? { account: tag } : {}), rate_limits: limits });
  return { limits, ok };
}

/** Renovação em processo separado (`--refresh`): busca, grava e libera a trava. Nunca lança. */
export async function refreshUsage({ provider, cacheFile, authFile, now = Date.now(), fetchImpl = fetch }) {
  const ctx = resolveSource(provider, cacheFile, authFile, now);
  try {
    if (ctx) await fetchAndCache(ctx, now, fetchImpl);
  } finally {
    if (ctx) fs.rmSync(`${ctx.file}.lock`, { force: true });
  }
}

const DEFAULT_AUTH = () => path.join(process.env.NYCODE_CODING_AGENT_DIR || path.join(os.homedir(), '.nycode', 'agent'), 'auth.json');

/** Ajusta payload.rate_limits ao provedor ativo; nunca lança. `provider` vem de activeModelProvider.
 * `refresh: 'background'` (statusline): cache vencido é servido na hora e renovado por `spawnRefresh` (U22);
 * sem cache nenhum ainda busca na hora. Padrão 'inline': espera o fetch (até TIMEOUT_MS). */
export async function withUsage(payload, { provider, cacheFile, authFile = DEFAULT_AUTH(), now = Date.now(), fetchImpl = fetch, refresh = 'inline', spawnRefreshImpl = spawnRefresh } = {}) {
  if (!payload) return payload;
  // O que o nycode mandou é sempre Anthropic: só vale com a Anthropic confirmada como provedor, e junto com a API.
  const header = provider === 'anthropic' ? payload.rate_limits : undefined;
  delete payload.rate_limits;
  if (header) payload.rate_limits = header;
  const ctx = resolveSource(provider, cacheFile, authFile, now);
  if (!ctx) return payload; // sem credencial OAuth válida nada do cache é servido (pode ser de outra conta) nem regravado
  const { mine } = ctx;
  let limits = mine?.rate_limits;
  let ok = mine?.ok;
  if (!(mine && finite(mine.at) && now - mine.at < TTL_MS)) {
    if (refresh === 'background' && mine && finite(mine.at)) {
      const lock = `${ctx.file}.lock`;
      if (takeLock(lock)) {
        try {
          spawnRefreshImpl(provider, cacheFile, authFile);
        } catch {
          fs.rmSync(lock, { force: true }); // sem renovador ninguém libera a trava
        }
      }
    } else {
      ({ limits, ok } = await fetchAndCache(ctx, now, fetchImpl));
    }
  }
  if (limits) payload.rate_limits = mergeWindows(header, limits);
  if (limits && ok) payload.rate_limits_at = ok; // idade do dado, para o status line marcar limites velhos
  return payload;
}

if (process.argv[2] === '--refresh' && process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , , provider, cacheFile, authFile] = process.argv;
  await refreshUsage({ provider, cacheFile, authFile });
}
