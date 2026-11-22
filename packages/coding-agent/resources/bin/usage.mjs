#!/usr/bin/env node
// Generated from src/extensions/claude-compat/runbooks/usage.ts by esbuild (test/harness/core/resource-bin/usage-drift.test.ts keeps it in sync).
import { closeSync, lstatSync, opendirSync, openSync, readSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const LIMITS = {
  days: 30,
  maxFiles: 500,
  maxFileBytes: 8 << 20,
  maxTotalBytes: 64 << 20,
  maxMs: 5e3,
  maxKeys: 50,
  maxEntries: 2e4,
  maxDirs: 1e3
};
const RANGE = {
  days: [1, 365],
  maxFiles: [1, 5e3],
  maxFileBytes: [1, 64 << 20],
  maxTotalBytes: [1, 512 << 20],
  maxMs: [1, 6e4],
  maxKeys: [1, 500],
  maxEntries: [1, 1e5],
  maxDirs: [1, 5e3]
};
const DAY = 864e5;
const SAFE_NAME = /^[A-Za-z0-9_.:-]{1,64}$/;
const COMMAND = /^\/([a-z0-9][a-z0-9:_-]{0,39})(?:\s|$)/i;
const PATH_ROOTS = /* @__PURE__ */ new Set([
  "home",
  "etc",
  "usr",
  "var",
  "tmp",
  "opt",
  "root",
  "bin",
  "sbin",
  "dev",
  "proc",
  "sys",
  "mnt",
  "srv",
  "lib",
  "run",
  "boot",
  "media"
]);
const MCP = /^mcp__([A-Za-z0-9_-]{1,40}?)__/;
const CREDENTIAL = /sk-[A-Za-z0-9_-]{8,}|gh[pousr]_[A-Za-z0-9]{8,}|github_pat_|xox[abprs]-|AKIA[0-9A-Z]{8,}|eyJ[A-Za-z0-9_-]{8,}|[A-Fa-f0-9]{32,}/;
function modelCategory(model) {
  const m = typeof model === "string" ? model.toLowerCase() : "";
  for (const k of ["opus", "sonnet", "haiku"]) if (m.includes(k)) return k;
  if (m.includes("claude")) return "claude-other";
  if (/gpt|(^|[/-])o\d|codex/.test(m)) return "gpt";
  if (m.includes("gemini")) return "gemini";
  return "other";
}
function bump(map, key, max) {
  const k = Object.hasOwn(map, key) || Object.keys(map).length < max ? key : "(other)";
  map[k] = (map[k] ?? 0) + 1;
}
function userText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const t = content.find((c) => c?.type === "text" && typeof c.text === "string");
  return t ? t.text : "";
}
function listJsonl(root, L, now, start) {
  const r = { files: [], dirs: 0, dirsUnreadable: 0, entries: 0, statFailed: 0, cut: [] };
  const cut = (why) => {
    if (!r.cut.includes(why)) r.cut.push(why);
  };
  const stop = () => r.cut.some((c) => c !== "maxFiles");
  const walk = (dir, depth) => {
    if (stop()) return;
    if (r.dirs >= L.maxDirs) {
      cut("maxDirs");
      return;
    }
    r.dirs++;
    const names = [];
    try {
      const d = opendirSync(dir);
      try {
        for (; ; ) {
          if (r.entries >= L.maxEntries) {
            cut("maxEntries");
            break;
          }
          if (now() - start > L.maxMs) {
            cut("maxMs");
            break;
          }
          const e = d.readSync();
          if (!e) break;
          r.entries++;
          names.push(e.name);
        }
      } finally {
        d.closeSync();
      }
    } catch {
      r.dirsUnreadable++;
    }
    for (const n of names.sort()) {
      if (r.files.length > L.maxFiles) {
        cut("maxFiles");
        return;
      }
      const p = join(dir, n);
      let st;
      try {
        st = lstatSync(p);
      } catch {
        r.statFailed++;
        continue;
      }
      if (st.isDirectory() && depth < 2) walk(p, depth + 1);
      else if (st.isFile() && n.endsWith(".jsonl")) r.files.push(p);
      if (stop()) return;
    }
  };
  walk(root, 0);
  if (r.files.length > L.maxFiles) {
    cut("maxFiles");
    r.files = r.files.slice(0, L.maxFiles);
  }
  return r;
}
function readCapped(path, size) {
  let fd;
  try {
    fd = openSync(path, "r");
    const buf = Buffer.alloc(size);
    let n = 0;
    while (n < size) {
      const k = readSync(fd, buf, n, size - n, n);
      if (k === 0) break;
      n += k;
    }
    return buf.subarray(0, n).toString("utf8");
  } catch {
    return void 0;
  } finally {
    if (fd !== void 0) closeSync(fd);
  }
}
function resolveLimits(over) {
  const L = { ...LIMITS };
  for (const [k, v] of Object.entries(over ?? {})) {
    if (v === void 0) continue;
    const range = RANGE[k];
    if (!range) throw new RangeError(`unknown limit: ${k}`);
    if (typeof v !== "number" || !Number.isInteger(v) || v < range[0] || v > range[1])
      throw new RangeError(`invalid limit: ${k}`);
    L[k] = v;
  }
  return L;
}
function safeKey(name) {
  return SAFE_NAME.test(name) && !CREDENTIAL.test(name) ? name : "(invalid)";
}
function collectUsage(d) {
  const L = resolveLimits(d.limits);
  const start = d.now();
  if (!Number.isFinite(start)) throw new RangeError("invalid clock");
  const from = start - L.days * DAY;
  const u = {
    schema: 1,
    complete: true,
    truncated: [],
    window: { days: L.days, from: new Date(from).toISOString(), to: new Date(start).toISOString() },
    files: { seen: 0, read: 0, outsideWindow: 0, unreadable: 0, oversize: 0, statFailed: 0 },
    dirs: { seen: 0, unreadable: 0, entries: 0 },
    lines: { read: 0, corrupt: 0, badTimestamp: 0, outsideWindow: 0 },
    sessions: 0,
    tools: {},
    commands: {},
    mcp: {},
    models: {},
    notes: [
      "commands: s\xF3 mensagens de usu\xE1rio gravadas que come\xE7am com /nome; comandos nativos consumidos pelo nycode n\xE3o s\xE3o registrados como turno, ent\xE3o isto N\xC3O \xE9 o hist\xF3rico completo de comandos"
    ]
  };
  const cut = (why) => {
    if (!u.truncated.includes(why)) u.truncated.push(why);
  };
  const listing = listJsonl(d.dir, L, d.now, start);
  const { files } = listing;
  for (const why of listing.cut) cut(why);
  u.dirs = { seen: listing.dirs, unreadable: listing.dirsUnreadable, entries: listing.entries };
  u.files.statFailed = listing.statFailed;
  let bytes = 0;
  for (const f of files) {
    u.files.seen++;
    if (d.now() - start > L.maxMs) {
      cut("maxMs");
      break;
    }
    let st;
    try {
      st = lstatSync(f);
    } catch {
      u.files.unreadable++;
      continue;
    }
    if (st.mtimeMs < from) {
      u.files.outsideWindow++;
      continue;
    }
    if (st.size > L.maxFileBytes) {
      u.files.oversize++;
      cut("oversizeFile");
      continue;
    }
    if (bytes + st.size > L.maxTotalBytes) {
      cut("maxTotalBytes");
      break;
    }
    const text = readCapped(f, st.size);
    if (text === void 0) {
      u.files.unreadable++;
      continue;
    }
    bytes += st.size;
    u.files.read++;
    let counted = false;
    let seenLines = 0;
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      if (++seenLines % 256 === 0 && d.now() - start > L.maxMs) {
        cut("maxMs");
        break;
      }
      u.lines.read++;
      let e;
      try {
        e = JSON.parse(line);
      } catch {
        u.lines.corrupt++;
        continue;
      }
      if (e?.type !== "message" || !e.message || typeof e.message !== "object") continue;
      const ts = typeof e.timestamp === "string" ? Date.parse(e.timestamp) : NaN;
      if (Number.isNaN(ts)) {
        u.lines.badTimestamp++;
        continue;
      }
      if (ts < from || ts > start + DAY) {
        u.lines.outsideWindow++;
        continue;
      }
      counted = true;
      const m = e.message;
      if (m.role === "user") {
        const c = COMMAND.exec(userText(m.content).trimStart());
        if (c) {
          if (!PATH_ROOTS.has(c[1].toLowerCase())) bump(u.commands, safeKey(c[1].toLowerCase()), L.maxKeys);
        }
      } else if (m.role === "assistant") {
        bump(u.models, modelCategory(m.model), L.maxKeys);
        for (const b of Array.isArray(m.content) ? m.content : []) {
          if (b?.type !== "toolCall" || typeof b.name !== "string") continue;
          const mcp = MCP.exec(b.name);
          if (mcp) bump(u.mcp, safeKey(mcp[1]), L.maxKeys);
          else bump(u.tools, safeKey(b.name), L.maxKeys);
        }
      }
    }
    if (counted) u.sessions++;
  }
  if (u.lines.corrupt) cut("corruptLines");
  if (u.lines.badTimestamp) cut("badTimestamp");
  if (u.files.unreadable) cut("unreadableFile");
  if (u.files.statFailed) cut("statFailed");
  if (u.dirs.unreadable) cut("unreadableDir");
  u.complete = u.truncated.length === 0;
  return u;
}
function main(env = process.env, now = Date.now, out = (s) => void process.stdout.write(s)) {
  const dir = join(env.NYCODE_CODING_AGENT_DIR || join(homedir(), ".nycode", "agent"), "sessions");
  out(`${JSON.stringify(collectUsage({ dir, now }), null, 2)}
`);
  return 0;
}
function isEntry(argv1, metaUrl) {
  if (!argv1) return false;
  try {
    return realpathSync(argv1) === realpathSync(fileURLToPath(metaUrl));
  } catch {
    return false;
  }
}
if (isEntry(process.argv[1], import.meta.url)) process.exitCode = main();
export {
  LIMITS,
  collectUsage,
  isEntry,
  main,
  modelCategory,
  resolveLimits
};
