import json
import os
import signal
import subprocess
import sys
import time
import unittest
from pathlib import Path
from typing import Any

import support
from support import CODE, st

BOOT = os.path.join(CODE, "bootstrap.py")
FAKE_TMUX = r"""#!/bin/sh
# tmux fictício: registra a ordem das chamadas; save-buffer devolve $FAKE_PAYLOAD (arquivo).
sub=""
for a in "$@"; do case "$a" in wait-for|save-buffer|delete-buffer) sub=$a ;; esac; done
echo "$sub" >> "$FAKE_LOG"
case "$sub" in
  wait-for) [ "${FAKE_FAIL:-}" = wait ] && exit 1; exit 0 ;;
  save-buffer) [ "${FAKE_FAIL:-}" = save ] && exit 1; cat "$FAKE_PAYLOAD" ;;
  delete-buffer) exit 0 ;;
esac
"""


class BootstrapTests(support.Env):
    def setUp(self) -> None:
        super().setUp()
        self.fake = os.path.join(self.tmp, "faketmux")
        support.write_exec(self.fake, FAKE_TMUX)
        self.log = os.path.join(self.tmp, "calls.log")
        self.payload = os.path.join(self.tmp, "payload.json")
        self.tid = st.new_id()
        self.rdir = st.run_dir(self.root(), self.tid, create=True)

    def spawn(self, payload: Any, **extra: Any) -> Any:
        data = payload if isinstance(payload, bytes) else json.dumps(payload).encode()
        with open(self.payload, "wb") as f:
            f.write(data)
        env = dict(
            self.env,
            NYCODE_SESSION_TMUX=self.fake,
            FAKE_LOG=self.log,
            FAKE_PAYLOAD=self.payload,
            TMUX_PANE="%7",
            **extra,
        )
        return subprocess.Popen(
            [sys.executable, BOOT, self.tid, self.rdir],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

    def run_boot(self, payload: Any, **extra: Any) -> Any:
        p = self.spawn(payload, **extra)
        out, err = p.communicate(timeout=20)
        return p.returncode, out, err, st.read_record(self.rdir, self.tid)

    def calls(self) -> Any:
        with open(self.log) as f:
            return f.read().split()

    def test_exit_code_table(self) -> None:
        for sh, want in (
            ("exit 0", 0),
            ("exit 7", 7),
            ("kill -9 $$", 137),
            ("kill -15 $$", 143),
        ):
            rc, out, err, rec = self.run_boot({"argv": ["sh", "-c", sh]})
            self.assertEqual(
                (rc, rec["state"], rec["exitCode"]), (want, "ended", want), sh
            )
            self.assertEqual((out, err, rec["paneId"]), (b"", b"", "%7"))
            self.assertEqual(rec["panePid"], rec["panePid"])

    def test_handoff_order_buffer_deleted_and_marker(self) -> None:
        out = os.path.join(self.tmp, "marker")
        rc, *_ = self.run_boot(
            {
                "argv": [
                    "sh",
                    "-c",
                    'printf %s "$NYCODE_SESSION_TRANSPORT_ID:$NYCODE_SESSION_TMUX" > "$1"',
                    "x",
                    out,
                ]
            }
        )
        self.assertEqual(rc, 0)
        self.assertEqual(self.calls(), ["wait-for", "save-buffer", "delete-buffer"])
        self.assertEqual(
            Path(out).read_text(), self.tid + ":"
        )  # marker só no filho; NYCODE_SESSION_TMUX removido

    def test_argv_literal_with_canaries(self) -> None:
        canary = "$(touch /tmp/pst-pwn); `x` ;|&\n'\"*"
        out = os.path.join(self.tmp, "args")
        _rc, *_ = self.run_boot(
            {"argv": ["sh", "-c", 'printf %s "$2" > "$1"', "x", out, canary]}
        )
        self.assertEqual(Path(out).read_text(), canary)
        self.assertFalse(os.path.exists("/tmp/pst-pwn"))
        raw = Path(self.rdir, "state.json").read_text()
        self.assertNotIn("touch", raw)

    def test_failures_by_stage(self) -> None:
        for fail in ("wait", "save"):
            rc, _, _, rec = self.run_boot({"argv": ["true"]}, FAKE_FAIL=fail)
            self.assertEqual(
                (rc, rec["state"], rec["exitCode"]), (70, "ended", 70), fail
            )
        bad = (
            b"not json",
            b'{"argv": []}',
            b'{"argv": [1]}',
            b"[1]",
            b'{"argv": ["a\\u0000b"]}',
            b"\xff",
            b'{"argv":["x"],"pad":"' + b"a" * (st.C["bootMaxBytes"] + 1) + b'"}',
        )
        for payload in bad:
            rc, _, _, rec = self.run_boot(payload)
            self.assertEqual((rc, rec["state"]), (70, "ended"), payload[:20])
        rc, _, _, rec = self.run_boot({"argv": ["/nonexistent/launcher"]})
        self.assertEqual((rc, rec["exitCode"]), (127, 127))

    def test_bad_arguments_and_dirs(self) -> None:
        self.assertEqual(
            subprocess.run([sys.executable, BOOT, "x"], check=False).returncode, 70
        )
        self.assertEqual(
            subprocess.run(
                [sys.executable, BOOT, self.tid, self.tmp + "/none/" + self.tid],
                check=False,
            ).returncode,
            70,
        )
        os.chmod(self.rdir, 0o500)
        try:
            self.assertEqual(
                subprocess.run(
                    [sys.executable, BOOT, self.tid, self.rdir],
                    env=self.env,
                    check=False,
                ).returncode,
                70,
            )
        finally:
            os.chmod(self.rdir, 0o700)

    def wait_running(self) -> Any:
        for _ in range(200):
            rec = st.read_record(self.rdir, self.tid)
            if rec and rec["state"] == "running":
                return rec
            time.sleep(0.05)
        self.fail("não ficou running")

    def test_term_forwarded_once_and_normalized(self) -> None:
        script = (
            'trap "echo t >> $1; sleep 0.3; exit 0" TERM; while :; do sleep 0.05; done'
        )
        mark = os.path.join(self.tmp, "terms")
        p = self.spawn({"argv": ["sh", "-c", script, "x", mark]})
        self.wait_running()
        time.sleep(0.3)
        p.send_signal(signal.SIGTERM)
        time.sleep(0.1)
        p.send_signal(signal.SIGTERM)  # segundo sinal não é reencaminhado
        p.communicate(timeout=20)
        self.assertEqual(p.returncode, 143)
        self.assertEqual(Path(mark).read_text().split(), ["t"])
        self.assertEqual(st.read_record(self.rdir, self.tid)["exitCode"], 143)

    def test_sigint_noop_child_keeps_running_and_default_after_exec(self) -> None:
        mark = os.path.join(self.tmp, "int")
        script = 'echo $$ > "$1"; sleep 1; exit 4'
        p = self.spawn({"argv": ["sh", "-c", script, "x", mark]})
        self.wait_running()
        time.sleep(0.4)
        p.send_signal(signal.SIGINT)  # só o bootstrap (não o grupo): handler no-op
        p.communicate(timeout=20)
        self.assertEqual(p.returncode, 4)

    def test_fresh_record_identity_preserved(self) -> None:
        script = "sleep 0.5"
        p = self.spawn({"argv": ["sh", "-c", script]})
        rec = self.wait_running()
        upd = dict(
            rec, rootPid=4242, rootStart=99, sessionId="sid", sessionFile="/tmp/s.jsonl"
        )
        st.write_record(self.rdir, self.tid, upd)
        p.communicate(timeout=20)
        end = st.read_record(self.rdir, self.tid)
        self.assertEqual(
            (end["rootPid"], end["sessionId"], end["state"]), (4242, "sid", "ended")
        )

    def test_unreadable_fresh_record_falls_back_to_base(self) -> None:
        p = self.spawn({"argv": ["sh", "-c", "sleep 0.5"]})
        self.wait_running()
        with open(os.path.join(self.rdir, "state.json"), "w") as f:
            f.write("garbage")
        p.communicate(timeout=20)
        self.assertEqual(st.read_record(self.rdir, self.tid)["state"], "ended")


if __name__ == "__main__":
    unittest.main()
