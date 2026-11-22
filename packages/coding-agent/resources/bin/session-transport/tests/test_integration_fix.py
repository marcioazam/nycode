"""Fix-round1: launcher do checkout, commit do start, cleanup seguro, alocador atômico, schema estrito, headless."""
import io
import json
import fcntl
import os
import socket
import threading
import unittest
from contextlib import redirect_stderr
from unittest import mock

import support
from support import st

import cli
import transport_tmux as tx


def start(env):
    err = io.StringIO()
    with redirect_stderr(err):
        rc = cli.cmd_start([], env)
    return rc, err.getvalue()


class StartCommitTests(support.Env):
    def test_failure_after_handoff_keeps_everything(self):
        with mock.patch.object(cli, "headless", return_value=False), mock.patch.object(cli, "find_tmux", return_value="tmux"), \
                mock.patch.object(tx, "start_server"), mock.patch.object(tx, "handoff"), \
                mock.patch.object(tx, "wait_running", side_effect=st.TransportError("tempo esgotado")), \
                mock.patch.object(tx, "kill_own") as kill:
            rc, err = start(self.env)
        self.assertEqual(rc, 1)
        kill.assert_not_called()
        left = st.entries(self.root())
        self.assertEqual(len(left), 1)
        self.assertIn(f"nycode-session attach {left[0]}", err)

    def test_guard_subagent_env_not_marker(self):
        with mock.patch.object(cli, "headless", return_value=False), \
                mock.patch.object(cli, "passthrough", side_effect=SystemExit(0)), \
                mock.patch.object(cli, "find_tmux", side_effect=AssertionError("tmux")):
            with self.assertRaises(SystemExit):
                cli.cmd_start([], dict(self.env, NYCODE_SUBAGENT="1"))
            with self.assertRaises(AssertionError):  # marker sozinho (chamador interativo) não é headless
                cli.cmd_start([], dict(self.env, NYCODE_SESSION_TRANSPORT_ID="a" * 32))


class CleanupTests(support.Env):
    def test_live_pane_untouched(self):
        _, rdir, _ = self.make_run(state="ended", exit_code=1)  # panePid = este processo, vivo
        self.assertEqual(st.cleanup_ended(self.root()), 0)
        self.assertTrue(os.path.isdir(rdir))

    def test_held_attach_lock_untouched_then_removed(self):
        _, rdir, _ = self.make_run(state="ended", exit_code=1, **support.DEAD)
        fd = os.open(os.path.join(rdir, "attach.lock"), os.O_RDWR | os.O_CREAT, 0o600)
        self.addCleanup(lambda: os.path.exists(rdir) and os.close(fd))
        fcntl.flock(fd, fcntl.LOCK_EX)
        self.assertEqual(st.cleanup_ended(self.root()), 0)
        self.assertTrue(os.path.exists(os.path.join(rdir, "state.json")))
        os.close(fd)
        self.addCleanup(lambda: None)
        self.assertEqual(st.cleanup_ended(self.root()), 1)

    def test_live_socket_untouched(self):
        _, rdir, _ = self.make_run(state="ended", exit_code=1, **support.DEAD)
        s = socket.socket(socket.AF_UNIX)
        self.addCleanup(s.close)
        s.bind(os.path.join(rdir, "tmux.sock"))
        s.listen(1)
        self.assertEqual(st.cleanup_ended(self.root()), 0)
        self.assertTrue(os.path.isdir(rdir))

    def test_dead_stale_socket_removed(self):
        _, rdir, _ = self.make_run(state="ended", exit_code=1, **support.DEAD)
        s = socket.socket(socket.AF_UNIX)
        s.bind(os.path.join(rdir, "tmux.sock"))
        s.close()  # arquivo de socket sem ouvinte
        self.assertEqual(st.cleanup_ended(self.root()), 1)

    def test_attach_holds_lock_while_reading_exit(self):
        tid, rdir, rec = self.make_run(state="ended", exit_code=7, **support.DEAD)
        seen = []

        def fake_attach(tmux_bin, rd, r, on_exit=None):
            return on_exit(0)
        with mock.patch.object(tx, "attach", side_effect=fake_attach), \
                mock.patch.object(cli, "finish", side_effect=lambda *a: seen.append(a) or 7):
            self.assertEqual(cli.attach_flow("tmux", rdir, tid, rec), 7)
        self.assertEqual(len(seen), 1)


class AllocatorTests(support.Env):
    def fill(self, n):
        for _ in range(n):
            st.run_dir(self.root(), st.new_id(), create=True)

    def test_concurrent_allocation_at_127_allows_one(self):
        self.fill(127)
        out, bar = [], threading.Barrier(2)

        def go():
            bar.wait()
            try:
                out.append(st.allocate(self.root()))
            except st.TransportError as e:
                out.append(e)
        ts = [threading.Thread(target=go) for _ in range(2)]
        [t.start() for t in ts]
        [t.join() for t in ts]
        self.assertEqual(len([o for o in out if isinstance(o, tuple)]), 1, out)
        self.assertEqual(len(st.entries(self.root())), 128)

    def test_scan_is_streamed(self):
        self.fill(3)
        with mock.patch.object(os, "listdir", side_effect=AssertionError("listdir")):
            tid, rdir = st.allocate(self.root())
        self.assertTrue(os.path.isdir(rdir) and rdir.endswith(tid))

    def test_full_id_match(self):
        for bad in ("a" * 32 + "\n", "a" * 33, "a" * 31):
            self.assertFalse(st.valid_id(bad), bad)
            with self.assertRaises(st.TransportError):
                st.run_dir(self.root(), bad)
        os.mkdir(os.path.join(self.root(), "a" * 32 + "\n"), 0o700)
        self.assertEqual(st.entries(self.root()), [])

    def test_root_lock_hazards(self):
        root = self.root()
        lock = os.path.join(root, st.ROOT_LOCK)
        os.symlink("/etc/passwd", lock)
        with self.assertRaises(st.TransportError):
            st.allocate(root)
        os.unlink(lock)
        open(lock, "w").close()
        os.chmod(lock, 0o644)
        with self.assertRaises(st.TransportError):
            st.allocate(root)


class StrictSchemaTests(support.Env):
    def test_strict_fields(self):
        tid, rdir, rec = self.make_run()
        bad = [dict(rec, v=True), dict(rec, paneId=None), dict(rec, panePid=0), dict(rec, paneStart=0),
               dict(rec, panePid="1"), dict(rec, paneStart=True), dict(rec, panePid=1.0), dict(rec, rootPid=0),
               dict(rec, rootStart=0), dict(rec, sessionFile="a\x00b"), dict(rec, state="ended", exitCode=True),
               dict(rec, state="ended", exitCode=-1), dict(rec, owner=float(os.getuid()))]
        for b in bad:
            self.assertFalse(st.validate(b, tid, rdir), b)
        self.assertTrue(st.validate(dict(rec, rootPid=None, rootStart=None), tid, rdir))
        self.assertTrue(st.validate(dict(rec, rootPid=5, rootStart=9), tid, rdir))

    def test_write_closes_fd_on_error_and_handles_partial(self):
        tid, rdir, rec = self.make_run()
        before = len(os.listdir("/proc/self/fd"))
        with mock.patch.object(os, "write", side_effect=OSError("boom")):
            with self.assertRaises(OSError):
                st.write_record(rdir, tid, rec)
        self.assertEqual(len(os.listdir("/proc/self/fd")), before)
        real = os.write
        with mock.patch.object(os, "write", side_effect=lambda fd, b: real(fd, bytes(b)[:3])):
            st.write_record(rdir, tid, dict(rec, sessionId="x"))
        self.assertEqual(st.read_record(rdir, tid)["sessionId"], "x")


if __name__ == "__main__":
    unittest.main()
