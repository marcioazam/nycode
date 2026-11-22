"""Fluxo real: tmux 3.6 privado + cliente num PTY externo + launcher fixture com supervisor REAL e CLI nativo fictício."""
import os
from pathlib import Path
import pty
import subprocess
import sys
import threading
import time
import unittest

import support
from support import st, CODE

CLI = os.path.join(CODE, "cli.py")
CANARY = "CANARY-ARG-9f3a"


class Client:
    """cli.py rodando num PTY (o tmux exige terminal); drena o master para não bloquear."""

    def __init__(self, argv, env):
        self.master, slave = pty.openpty()
        self.p = subprocess.Popen([sys.executable, CLI, *argv], env=env, stdin=slave, stdout=slave,
                                  stderr=subprocess.PIPE, start_new_session=True)
        os.close(slave)
        self.buf = b""
        threading.Thread(target=self._drain, daemon=True).start()

    def _drain(self):
        while True:
            try:
                d = os.read(self.master, 4096)
            except OSError:
                return
            if not d:
                return
            self.buf += d

    def wait(self, t=30):
        rc = self.p.wait(t)
        err = self.p.stderr.read().decode()
        self.p.stderr.close()
        os.close(self.master)
        return rc, err


class FlowTests(support.Env):
    def setUp(self):
        super().setUp()
        self.live = []
        self.addCleanup(self.cleanup_servers)

    def cleanup_servers(self):
        for sock in self.live:
            subprocess.run(["tmux", "-S", sock, "-f", "/dev/null", "kill-server"], capture_output=True)

    def tmux(self, sock, *a):
        return subprocess.run(["tmux", "-S", sock, "-f", "/dev/null", *a], capture_output=True, text=True, timeout=5)

    def only_run(self):
        ids = st.entries(self.root())
        self.assertEqual(len(ids), 1)
        rdir = os.path.join(self.root(), ids[0])
        self.live.append(os.path.join(rdir, "tmux.sock"))
        return ids[0], rdir

    def wait_for(self, pred, what):
        for _ in range(300):
            if pred():
                return
            time.sleep(0.1)
        self.fail(what)

    def test_exit_code_propagates(self):
        c = Client(["start", "--", "--exit", "7"], self.env)
        rc, err = c.wait()
        self.assertEqual(rc, 7, err)
        tid, rdir = self.only_run()
        self.assertEqual(st.read_record(rdir, tid)["exitCode"], 7)
        self.assertEqual(st.cleanup_ended(self.root()), 1)

    def test_detach_attach_cycle(self):
        report, release = os.path.join(self.tmp, "report"), os.path.join(self.tmp, "release")
        c = Client(["start", "--", "--report", report, "--wait", release, CANARY], self.env)
        self.wait_for(lambda: os.path.exists(report) and os.listdir(self.root()), "native não subiu")
        tid, rdir = self.only_run()
        sock = os.path.join(rdir, "tmux.sock")
        rec = st.read_record(rdir, tid)
        self.assertEqual((rec["state"], rec["tmuxSocket"]), ("running", sock))
        pid_marker = Path(report).read_text().split()
        self.assertEqual(pid_marker[1], tid)  # marker só no filho
        # argumentos privados fora de pane_start_command e de arquivos
        pane = self.tmux(sock, "list-panes", "-s", "-t", "nycode", "-F", "#{pane_start_command}").stdout
        self.assertNotIn(CANARY, pane)
        self.assertNotIn(CANARY, Path(rdir, "state.json").read_text())
        self.assertEqual(self.tmux(sock, "list-buffers").stdout.strip(), "")
        opts = self.tmux(sock, "show-options", "-gv", "history-limit").stdout.strip()
        self.assertEqual(opts, "2000")
        # um cliente: segundo attach é recusado sem mexer no primeiro
        self.wait_for(lambda: self.tmux(sock, "list-clients", "-F", "#{client_pid}").stdout.strip(), "sem cliente")
        c2 = Client(["attach", tid], self.env)
        rc2, err2 = c2.wait()
        self.assertEqual(rc2, 1)
        self.assertIn("segue viva", err2)
        self.assertEqual(len(self.tmux(sock, "list-clients", "-F", "#{client_pid}").stdout.split()), 1)
        # detach: cliente sai 0, Pi segue
        self.tmux(sock, "detach-client", "-s", "nycode")
        self.assertEqual(c.wait()[0], 0)
        self.assertEqual(st.read_record(rdir, tid)["state"], "running")
        # reattach: mesmo PID/ID; libera o native -> exit code 5 propagado
        c3 = Client(["attach", tid], self.env)
        self.wait_for(lambda: self.tmux(sock, "list-clients", "-F", "#{client_pid}").stdout.strip(), "sem reattach")
        self.assertEqual(Path(report).read_text().split(), pid_marker)
        open(release, "w").close()
        rc3, err3 = c3.wait()
        self.assertEqual(rc3, 5, err3)
        self.assertEqual(st.read_record(rdir, tid)["exitCode"], 5)
        listing = subprocess.run([sys.executable, CLI, "list"], env=self.env, capture_output=True, text=True)
        self.assertIn(f"{tid} ended exit=5", listing.stdout)
        self.assertEqual(self.tmux(sock, "list-sessions").returncode != 0, True)

    def test_headless_passthrough_creates_nothing(self):
        r = subprocess.run([sys.executable, CLI, "start", "--", "-p", "--exit", "3"], env=self.env,
                           stdin=subprocess.DEVNULL, capture_output=True)
        self.assertEqual(r.returncode, 3)  # launcher real, sem tmux, sem registro
        self.assertEqual(os.listdir(self.agent), [])


if __name__ == "__main__":
    unittest.main()
