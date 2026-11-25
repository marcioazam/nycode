"""Transcript parsing and per-run process/speed metrics, from minimal synthetic pi and Claude Code events."""

import json
import re
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

from bench.metrics import trace


def pi_text(*events: dict[str, Any]) -> str:
    return "\n".join(json.dumps(e) for e in events)


def p_asst(
    blocks: list[dict[str, Any]], ts: int = 0, dur: int | None = None
) -> dict[str, Any]:
    m: dict[str, Any] = {"role": "assistant", "content": blocks, "timestamp": ts}
    if dur is not None:
        m["durationMs"] = dur
    return {"type": "message_end", "message": m}


def p_call(i: str, name: str, **args: Any) -> dict[str, Any]:
    return {"type": "toolCall", "id": i, "name": name, "arguments": args}


def p_res(i: str, err: bool = False) -> dict[str, Any]:
    return {
        "type": "message_end",
        "message": {"role": "toolResult", "toolCallId": i, "isError": err},
    }


def text(s: str) -> dict[str, Any]:
    return {"type": "text", "text": s}


def cc_asst(mid: str, block: dict[str, Any]) -> dict[str, Any]:
    return {"type": "assistant", "message": {"id": mid, "content": [block]}}


def cc_res(i: str, err: bool = False) -> dict[str, Any]:
    return {
        "type": "user",
        "message": {
            "content": [{"type": "tool_result", "tool_use_id": i, "is_error": err}]
        },
    }


def test_parse_pi_calls_errors_final() -> None:
    t = trace.parse(
        pi_text(
            p_asst([p_call("a", "bash", command="ls")]),
            p_res("a", True),
            p_asst([p_call("b", "bash", command="ls")]),
            p_res("b"),
            p_asst([text("Done.")]),
        )
    )
    assert [c.name for c in t.calls] == ["bash", "bash"]
    assert [c.error for c in t.calls] == [True, False]
    assert t.final == "Done." and t.events == 5 and len(t.turns) == 3


def test_parse_cc_merges_blocks_of_one_message() -> None:
    use = {"type": "tool_use", "id": "x", "name": "Read", "input": {"file_path": "/a"}}
    t = trace.parse(
        pi_text(
            cc_asst("m1", {"type": "thinking"}),
            cc_asst("m1", use),
            cc_res("x", True),
            cc_asst("m2", {"type": "text", "text": "All done"}),
            {"type": "result", "result": "All done"},
        )
    )
    assert (
        len(t.turns) == 2
        and t.calls[0].args == {"file_path": "/a"}
        and t.calls[0].error is True
    )
    assert t.final == "All done"


def test_parse_ignores_garbage_and_empty() -> None:
    t = trace.parse("not json\n\n[1]\n")
    assert t.events == 0 and t.final == "" and t.calls == []


def test_process_counts() -> None:
    t = trace.parse(
        pi_text(
            p_asst([text("thinking out loud")]),
            p_asst([p_call("1", "read", path="a.py")]),
            p_res("1"),
            p_asst([p_call("2", "read", path="a.py")]),
            p_res("2"),
            p_asst([p_call("3", "edit", path="a.py")]),
            p_res("3"),
            p_asst([p_call("4", "read", path="a.py")]),
            p_res("4"),
            p_asst([p_call("5", "bash", command="sleep 90 && make")]),
            p_res("5", True),
            p_asst([p_call("6", "bash", command="sleep 5")]),
            p_res("6"),
            p_asst([p_call("7", "bash", command="make")]),
            p_res("7"),
            p_asst([text("ok")]),
        )
    )
    p = trace.process(t)
    assert p["tool_calls"] == 7 and p["tool_errors"] == 1
    assert p["recovered"] == 1  # the failed bash is followed by a good bash
    assert p["idle_turns"] == 1  # the first text-only turn; the last one ends the run
    assert (
        p["repeat_reads"] == 1
    )  # read 2 repeats read 1; the edit resets, so read 4 does not
    assert p["long_sleeps"] == 1


def test_process_bash_write_resets_reads_and_minutes_sleep() -> None:
    t = trace.parse(
        pi_text(
            p_asst([p_call("1", "Read", file_path="a")]),
            p_res("1"),
            p_asst([p_call("2", "Bash", command="echo x > a")]),
            p_res("2"),
            p_asst([p_call("3", "Read", file_path="a")]),
            p_res("3"),
            p_asst([p_call("4", "Bash", command="sleep 2m")]),
            p_res("4"),
        )
    )
    p = trace.process(t)
    assert p["repeat_reads"] == 0 and p["long_sleeps"] == 1


def test_process_no_calls_has_none_rates() -> None:
    assert trace.process(trace.parse("")) == {}


def test_union_merges_overlaps() -> None:
    assert trace.union([(0, 2), (1, 3), (5, 6), (7, 7)]) == 4


def test_pi_timing() -> None:
    t = trace.parse(
        pi_text(
            {"type": "session", "timestamp": "1970-01-01T00:00:00Z"},
            p_asst([p_call("1", "bash", command="x")], ts=2000, dur=1000),
            {"type": "tool_execution_end", "durationMs": 1500},
            p_asst([text("end")], ts=4000, dur=1000),
        )
    )
    s = trace.speed(t, t0=None, total=6.0)
    assert s == {
        "boot": 2.0,
        "model_s": 2.0,
        "tool_s": 1.0,
    }  # gap 3→4 s caps the tool sum at 1 s


def test_speed_none_without_timestamps() -> None:
    assert (
        trace.speed(trace.parse(pi_text(p_asst([text("x")]))), t0=None, total=1.0) == {}
    )


def test_cc_session_timing(tmp_path: Any) -> None:
    ev: list[dict[str, Any]] = [
        {"type": "api-request", "timestamp": "1970-01-01T00:00:02Z"},
        {
            "type": "assistant",
            "timestamp": "1970-01-01T00:00:04Z",
            "message": {"id": "m", "content": [{"type": "tool_use", "id": "t"}]},
        },
        {
            "type": "user",
            "timestamp": "1970-01-01T00:00:05Z",
            "message": {"content": [{"type": "tool_result", "tool_use_id": "t"}]},
        },
    ]
    f = tmp_path / "s.jsonl"
    f.write_text(pi_text(*ev))
    assert trace.cc_session_speed(f, t0=1.0) == {
        "boot": 1.0,
        "model_s": 2.0,
        "tool_s": 1.0,
    }
    assert trace.cc_session_speed(tmp_path / "none.jsonl", t0=1.0) == {}


# --- todo counters ------------------------------------------------------------
def res(
    i: str,
    name: str,
    body: str = "ok",
    todos: Sequence[Mapping[str, object]] | None = None,
) -> dict[str, Any]:
    m: dict[str, Any] = {
        "role": "toolResult",
        "toolCallId": i,
        "toolName": name,
        "content": [{"type": "text", "text": body}],
    }
    if todos is not None:
        m["details"] = {"todos": todos}
    return {"type": "message_end", "message": m}


REMINDER = "x\n" + trace.REMINDER + " 1 open item(s)</system-reminder>"


def run(last_status: str) -> str:
    return pi_text(
        p_asst([p_call("1", "todo", action="add", text="a")]),  # todo-only turn
        res("1", "todo", todos=[{"id": 1, "status": "pending"}]),
        p_asst([p_call("2", "bash", command="ls")]),
        res("2", "bash", REMINDER),  # reminder 1
        p_asst([p_call("3", "todo", action="list")]),  # list does not follow
        res("3", "todo"),
        p_asst(
            [p_call("4", "todo", action="start", id=1)]
        ),  # changing call: follows reminder 1
        res("4", "todo", todos=[{"id": 1, "status": "in_progress"}]),
        p_asst([p_call("5", "bash", command="ls")]),
        res("5", "bash", REMINDER),  # reminder 2, never followed
        p_asst([p_call("6", "bash", command="a")]),
        p_asst([p_call("7", "bash", command="b")]),
        p_asst([p_call("8", "bash", command="c")]),
        p_asst([p_call("9", "todo", action="complete", id=1)]),  # fourth call: too late
        res(
            "9",
            "todo",
            todos=[{"id": 1, "status": last_status}, {"id": 2, "status": "pending"}],
        ),
        p_asst([text("Done.")]),
    )


def test_counters_and_coherent_end() -> None:
    m = trace.todo_metrics(run("completed"))
    assert m["todo_only_turn_share"] == 4 / 10
    assert m["reminders"] == 2 and m["reminders_followed"] == 1
    assert m["final_open_items"] == 1 and m["final_in_progress"] == 0
    assert m["coherent_end"] == 1.0


def test_in_progress_left_open_is_incoherent() -> None:
    m = trace.todo_metrics(run("in_progress"))
    assert m["final_in_progress"] == 1 and m["coherent_end"] == 0.0


def test_no_todo_use_has_no_coherence() -> None:
    m = trace.todo_metrics(
        pi_text(p_asst([p_call("1", "bash", command="ls")]), p_asst([text("x")]))
    )
    assert (
        m["coherent_end"] is None
        and m["todo_only_turn_share"] == 0.0
        and m["reminders"] == 0
    )
    assert trace.todo_metrics("")["todo_only_turn_share"] is None


def test_blocked_failed_cancelled_are_not_open() -> None:
    todos = [
        {"id": i, "status": s}
        for i, s in enumerate(
            ("blocked", "failed", "cancelled", "completed", "pending")
        )
    ]
    m = trace.todo_metrics(pi_text(res("1", "todo", todos=todos)))
    assert m["final_open_items"] == 1 and m["coherent_end"] == 1.0


# --- matchers pinned to the real extension strings ---------------------------------
TODO_SRC = Path(__file__).parents[2] / "packages/coding-agent/src/extensions/todo"


def _src(name: str) -> str:
    return (TODO_SRC / name).read_text()


def test_reminder_matcher_matches_both_stale_reminder_texts() -> None:
    src = _src("stale-reminder.ts")
    # strictReminder and reminder: a wording change there must fail here, not zero `reminders` silently
    assert src.count(f"`{trace.REMINDER} ") == 2
    samples = re.findall(r"`(<system-reminder>The todo list has[^`]*)`", src)
    assert len(samples) == 2
    for sample in samples:
        body = re.sub(r"\$\{[^}]*\}", "1", sample)
        tr = pi_text(res("1", "bash", body))
        assert trace.todo_metrics(tr)["reminders"] == 1


def test_turn_check_matcher_matches_the_source_type() -> None:
    src = _src("turn-check.ts")
    m = re.search(r'TURN_CHECK_TYPE = "([^"]+)"', src)
    assert m and m.group(1) == trace.TURN_CHECK_TYPE
    assert 'type: "custom_message", customType: TURN_CHECK_TYPE' in src


def test_external_matcher_matches_the_source_text() -> None:
    src = _src("status.ts")
    assert trace.EXTERNAL_REMINDER in src
    line = next(
        ln
        for ln in src.splitlines()
        if ln.lstrip().startswith("return `<system-reminder>Todo #")
    )
    body = re.sub(r"\$\{[^}]*\}", "x", line)
    assert trace.todo_metrics(pi_text(res("1", "run", body)))["external_reminders"] == 1


def entry(custom_type: str, content: str = "x") -> dict[str, Any]:
    return {
        "type": "entry_appended",
        "entry": {
            "type": "custom_message",
            "customType": custom_type,
            "content": content,
        },
    }


def test_flag_on_interventions_are_counted_separately() -> None:
    ext = f'<system-reminder>Todo #1 "a" {trace.EXTERNAL_REMINDER} finished. x</system-reminder>'
    m = trace.todo_metrics(
        pi_text(
            entry(trace.TURN_CHECK_TYPE),
            {
                "type": "entry_appended",
                "entry": {"type": "custom", "customType": trace.TURN_CHECK_TYPE},
            },
            entry("other"),
            res("1", "run", ext),
            {"type": "message_end", "message": {"role": "custom", "content": ext}},
            entry(trace.TURN_CHECK_TYPE),
        )
    )
    assert m["turn_checks"] == 2 and m["external_reminders"] == 2
    assert m["reminders"] == 0


def test_interventions_are_zero_without_todo_sync() -> None:
    m = trace.todo_metrics(run("completed"))
    assert m["turn_checks"] == 0 and m["external_reminders"] == 0
