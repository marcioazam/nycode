"""One transcript (pi --mode json or Claude Code stream-json) as calls and turns, plus the per-run process and
speed metrics read from it. Both formats parse into the same Trace; fields a format lacks stay empty."""

import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from bench import evidence

READS = {"read"}
MUTATING_TOOLS = (evidence.MUTATING - {"bash"}) | {
    "edit",
    "write",
    "multiedit",
    "notebookedit",
}
# A bash command that may change files: redirect, in-place edit, tee, mv/cp/rm, patch, git state changes.
BASH_WRITE = re.compile(
    r"(?<![<\-\d&>])>(?!&)|\bsed\s+-i|\btee\b|\b(?:mv|cp|rm|patch|touch|mkdir)\b|\bgit\s+(?:apply|checkout|restore|stash|reset)\b"
)
SLEEP = re.compile(r"\bsleep\s+(\d+(?:\.\d+)?)\s*([smh]?)\b")
LONG_SLEEP_S = 60.0
_NOISE = ('{"type":"message_update"', '{"type":"tool_execution_update"')


@dataclass
class Call:
    id: str
    name: str
    args: dict[str, Any]
    error: bool | None = None  # None: no result seen


@dataclass
class Turn:
    text: str = ""
    calls: list[Call] = field(default_factory=list)


@dataclass
class Trace:
    turns: list[Turn] = field(default_factory=list)
    final: str = ""
    session_ts: float | None = None
    model_iv: list[tuple[float, float]] = field(default_factory=list)
    tool_s: list[float] = field(default_factory=list)
    events: int = 0

    @property
    def calls(self) -> list[Call]:
        return [c for t in self.turns for c in t.calls]


def _iso(s: str) -> float:
    return datetime.fromisoformat(s).timestamp()


def _blocks(content: Any) -> list[dict[str, Any]]:
    return (
        [b for b in content if isinstance(b, dict)] if isinstance(content, list) else []
    )


def _fill(turn: Turn, blocks: list[dict[str, Any]], by_id: dict[str, Call]) -> None:
    for b in blocks:
        if b.get("type") in ("toolCall", "tool_use") and str(b.get("id")) not in by_id:
            args = b.get("arguments") if b.get("type") == "toolCall" else b.get("input")
            c = Call(
                str(b.get("id")),
                str(b.get("name")),
                args if isinstance(args, dict) else {},
            )
            by_id[c.id] = c
            turn.calls.append(c)
        elif (
            b.get("type") == "text"
            and (s := str(b.get("text") or ""))
            and s not in turn.text
        ):
            turn.text = (turn.text + "\n" + s).strip()


def parse(text: str) -> Trace:
    tr = Trace()
    by_id: dict[str, Call] = {}
    cc_turns: dict[str, Turn] = {}  # Claude Code repeats one message per content block
    for line in text.splitlines():
        if line.startswith(_NOISE):
            tr.events += 1
            continue
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if not isinstance(e, dict):
            continue
        tr.events += 1
        kind, m = e.get("type"), e.get("message") or {}
        if kind == "session" and e.get("timestamp"):
            tr.session_ts = _iso(e["timestamp"])
        elif kind == "tool_execution_end" and e.get("durationMs") is not None:
            tr.tool_s.append(e["durationMs"] / 1e3)
        elif kind == "message_end" and m.get("role") == "assistant":
            ts, d = m.get("timestamp"), m.get("durationMs")
            if ts is not None and d is not None:
                tr.model_iv.append((int(ts) / 1e3, int(ts) / 1e3 + d / 1e3))
            t = Turn()
            _fill(t, _blocks(m.get("content")), by_id)
            if t.text or t.calls:
                tr.turns.append(t)
        elif (
            kind == "message_end"
            and m.get("role") == "toolResult"
            and (c := by_id.get(str(m.get("toolCallId"))))
        ):
            c.error = bool(m.get("isError"))
        elif kind == "assistant":
            mid = str(m.get("id") or len(cc_turns))
            if mid not in cc_turns:
                cc_turns[mid] = Turn()
                tr.turns.append(cc_turns[mid])
            _fill(cc_turns[mid], _blocks(m.get("content")), by_id)
        elif kind == "user":
            for b in _blocks(m.get("content")):
                if b.get("type") == "tool_result" and (
                    c := by_id.get(str(b.get("tool_use_id")))
                ):
                    c.error = bool(b.get("is_error"))
        elif kind == "result":
            tr.final = str(e.get("result") or "")
    tr.turns = [t for t in tr.turns if t.text or t.calls]
    if not tr.final:
        tr.final = next((t.text for t in reversed(tr.turns) if t.text), "")
    return tr


def _sleep_s(cmd: str) -> float:
    unit = {"": 1, "s": 1, "m": 60, "h": 3600}
    return max((float(n) * unit[u] for n, u in SLEEP.findall(cmd)), default=0.0)


def _path(c: Call) -> str:
    return str(c.args.get("path") or c.args.get("file_path") or "")


def process(tr: Trace) -> dict[str, int]:
    """Tool and turn counts of one run; {} when the transcript has no assistant turn."""
    if not tr.turns:
        return {}
    calls = tr.calls
    errors = [i for i, c in enumerate(calls) if c.error]
    recovered = sum(_next_same_ok(calls, i) for i in errors)
    seen: set[str] = set()
    repeats = long_sleeps = 0
    for c in calls:
        n = c.name.lower()
        if n in READS and _path(c):
            repeats += _path(c) in seen
            seen.add(_path(c))
        elif n in MUTATING_TOOLS or (
            n == "bash" and BASH_WRITE.search(str(c.args.get("command") or ""))
        ):
            seen.clear()
        if n == "bash" and _sleep_s(str(c.args.get("command") or "")) >= LONG_SLEEP_S:
            long_sleeps += 1
    return {
        "tool_calls": len(calls),
        "tool_errors": len(errors),
        "recovered": recovered,
        "idle_turns": sum(not t.calls for t in tr.turns[:-1]),
        "repeat_reads": repeats,
        "long_sleeps": long_sleeps,
    }


def _next_same_ok(calls: list[Call], i: int) -> bool:
    """The first later call of the same tool that has a result succeeded."""
    nxt = next(
        (d for d in calls[i + 1 :] if d.name == calls[i].name and d.error is not None),
        None,
    )
    return nxt is not None and nxt.error is False


def union(iv: list[tuple[float, float]]) -> float:
    """Length covered by intervals, overlaps counted once."""
    tot, cur = 0.0, None
    for a, b in sorted(iv):
        if b <= a:
            continue
        if cur is None or a > cur[1]:
            tot += cur[1] - cur[0] if cur else 0.0
            cur = [a, b]
        else:
            cur[1] = max(cur[1], b)
    return tot + (cur[1] - cur[0] if cur else 0.0)


def speed(tr: Trace, t0: float | None, total: float | None) -> dict[str, float]:
    """Boot (agent start to first model reply), model time and tool time of a pi run, seconds.

    Tool time is the sum of tool durations capped by the gaps between model replies, so parallel tools do not
    double count (same method as the Terminal-Bench time split). {} when the transcript has no timestamps."""
    if not tr.model_iv:
        return {}
    t0 = t0 if t0 is not None else tr.session_ts
    ends = [b for _, b in tr.model_iv]
    gaps = [max(0.0, s - e) for e, (s, _) in zip(ends, tr.model_iv[1:], strict=False)]
    out = {
        "model_s": union(tr.model_iv),
        "tool_s": min(sum(tr.tool_s), sum(gaps)) if gaps else sum(tr.tool_s),
    }
    out["boot"] = max(tr.model_iv[0][0] - t0, 0.0) if t0 is not None else 0.0
    return {"boot": out["boot"], "model_s": out["model_s"], "tool_s": out["tool_s"]}


def cc_session_speed(path: Path, t0: float) -> dict[str, float]:
    """Same split from a Claude Code session jsonl (api-request, assistant and tool_result timestamps)."""
    if not path.is_file():
        return {}
    req: list[float] = []
    ass: dict[str, float] = {}
    started: dict[str, float] = {}
    tools: list[tuple[float, float]] = []
    for line in path.read_text(errors="replace").splitlines():
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if not isinstance(e, dict) or not e.get("timestamp"):
            continue
        ts, m = _iso(e["timestamp"]), e.get("message") or {}
        if e.get("type") == "api-request":
            req.append(ts)
        elif e.get("type") == "assistant":
            ass[str(m.get("id"))] = ts
            started |= {
                str(b["id"]): ts
                for b in _blocks(m.get("content"))
                if b.get("type") == "tool_use"
            }
        elif e.get("type") == "user":
            tools += [
                (started[str(b.get("tool_use_id"))], ts)
                for b in _blocks(m.get("content"))
                if b.get("type") == "tool_result"
                and str(b.get("tool_use_id")) in started
            ]
    if not req or not ass:
        return {}
    return {
        "boot": max(req[0] - t0, 0.0),
        "model_s": union(list(zip(req, ass.values(), strict=False))),
        "tool_s": union(tools),
    }


# --- Todo-list behaviour -------------------------------------------------------------------------
# Todo-list behaviour of one pi run, read from its transcript (events as `trace.parse` reads them).
#
# Counters (per run):
# - todo_only_turn_share: assistant turns that have tool calls, all of them `todo`, over all assistant turns.
# - reminders: tool results containing `<system-reminder>The todo list has` (the stale-list reminder).
# - reminders_followed: for each reminder, 1 if a changing `todo` call (action not `list`) is among the next 3
#   assistant tool calls after it (any tool), else 0.
# - final_open_items / final_in_progress: items `pending`/`in_progress` and items `in_progress` in the last todo
#   snapshot (`details.todos` of the last `todo` tool result). `blocked`, `failed`, `cancelled` and `completed` are
#   not open: `blocked` is deferred by the owner's choice, the others are settled.
# - coherent_end: 1.0 when a snapshot exists and no item is `in_progress` at the end, 0.0 when one is left open,
#   None when the run never produced a snapshot (no todo use: nothing to judge).
#
# - turn_checks: end-of-turn blocks of todo.sync, one per `entry_appended` event whose entry is a `custom_message`
#   of type `todo-turn-check` (turn-check.ts appends it with the block; the `custom` marker entry is not counted).
# - external_reminders: todo.sync reminders for a finished background run/subagent (`externalFinishReminder` in
#   status.ts), counted in toolResult/custom/user messages and `custom_message` entries that carry its text.
# Both are 0 with todo.sync off. They are interventions, kept apart from `reminders` (stale-list cadence).
# tests/test_trace.py pins every matcher below to the strings in packages/coding-agent/src/extensions/todo/.
#
# Only the pi/nycode format has the `todo` tool; a Claude Code transcript gives zeros and None.
# Reference: the offline analysis of stored sessions that sized this cost (2026-11-25).

REMINDER = "<system-reminder>The todo list has"
TURN_CHECK_TYPE = "todo-turn-check"
EXTERNAL_REMINDER = "waited on a background event that"
FOLLOW_WINDOW = 3
OPEN = ("pending", "in_progress")  # blocked is deferred, not open


def _result_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    return "".join(
        str(b.get("text") or "")
        for b in (content if isinstance(content, list) else [])
        if isinstance(b, dict)
    )


def todo_metrics(text: str) -> dict[str, float | int | None]:
    turns = todo_only = reminders = followed = turn_checks = external = 0
    pending: list[int] = []  # tool calls left in the window, one per reminder
    snapshot: list[dict[str, Any]] | None = None
    for line in text.splitlines():
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if not isinstance(e, dict):
            continue
        if e.get("type") == "entry_appended":
            entry = e.get("entry")
            if isinstance(entry, dict) and entry.get("type") == "custom_message":
                turn_checks += entry.get("customType") == TURN_CHECK_TYPE
                external += EXTERNAL_REMINDER in _result_text(entry.get("content"))
            continue
        m = e.get("message")
        if not isinstance(m, dict) or e.get("type") != "message_end":
            continue
        if m.get("role") == "assistant":
            calls = [
                b
                for b in m.get("content") or []
                if isinstance(b, dict) and b.get("type") == "toolCall"
            ]
            turns += 1
            todo_only += bool(calls) and all(c.get("name") == "todo" for c in calls)
            for c in calls:
                args = c.get("arguments") or {}
                if c.get("name") == "todo" and args.get("action") != "list" and pending:
                    followed += len(pending)
                    pending = []
                pending = [n - 1 for n in pending if n > 1]
        elif m.get("role") in ("custom", "user"):
            external += EXTERNAL_REMINDER in _result_text(m.get("content"))
        elif m.get("role") == "toolResult":
            external += EXTERNAL_REMINDER in _result_text(m.get("content"))
            if REMINDER in _result_text(m.get("content")):
                reminders += 1
                pending.append(FOLLOW_WINDOW)
            todos = (m.get("details") or {}).get("todos")
            if m.get("toolName") == "todo" and isinstance(todos, list):
                snapshot = todos
    items = snapshot or []
    in_progress = sum(t.get("status") == "in_progress" for t in items)
    return {
        "todo_only_turn_share": todo_only / turns if turns else None,
        "reminders": reminders,
        "reminders_followed": followed,
        "turn_checks": turn_checks,
        "external_reminders": external,
        "final_open_items": sum(t.get("status") in OPEN for t in items),
        "final_in_progress": in_progress,
        "coherent_end": None if snapshot is None else float(in_progress == 0),
    }
