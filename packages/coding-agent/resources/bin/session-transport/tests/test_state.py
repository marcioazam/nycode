import json
import os
import stat
import unittest

import support
from support import st


class StateTests(support.Env):
    def test_contract_constants(self):
        self.assertEqual(st.C["recordFields"][0], "v")
        self.assertEqual(len(st.new_id()), 32)

    def test_agent_dir_rules(self):
        self.assertEqual(st.agent_dir(self.env), os.path.realpath(self.agent))
        with self.assertRaises(st.TransportError):
            st.agent_dir({"NYCODE_CODING_AGENT_DIR": "rel"})
        with self.assertRaises(st.TransportError):
            st.agent_dir({"NYCODE_CODING_AGENT_DIR": self.tmp + "/nope"})
        self.assertTrue(st.agent_dir({"HOME": self.home}).endswith(".nycode/agent"))

    def test_root_dir_modes_and_symlink(self):
        root = self.root()
        self.assertEqual(stat.S_IMODE(os.stat(root).st_mode), 0o700)
        os.chmod(root, 0o755)
        with self.assertRaises(st.TransportError):
            st.root_dir(self.agent)
        os.chmod(root, 0o700)
        os.rmdir(root)
        os.symlink(self.tmp, root)
        with self.assertRaises(st.TransportError):
            st.root_dir(self.agent)
        with self.assertRaises(st.TransportError):
            st.root_dir(os.path.join(self.agent, "x"), create=False)

    def test_run_dir_id_validation_and_socket_len(self):
        for bad in ("", "../x", "A" * 32, "a" * 31, None):
            with self.assertRaises(st.TransportError):
                st.run_dir(self.root(), bad)
        with self.assertRaises(st.TransportError):
            st.socket_path("/" + "a" * 120)

    def test_record_roundtrip_and_mode(self):
        tid, rdir, rec = self.make_run()
        self.assertEqual(st.read_record(rdir, tid), rec)
        self.assertEqual(stat.S_IMODE(os.stat(os.path.join(rdir, "state.json")).st_mode), 0o600)

    def test_record_rejections(self):
        tid, rdir, rec = self.make_run()
        path = os.path.join(rdir, "state.json")
        cases = [dict(rec, v=2), dict(rec, extra=1), dict(rec, id="b" * 32), dict(rec, owner=os.getuid() + 1),
                 dict(rec, tmuxSocket="/x"), dict(rec, state="zzz"), dict(rec, paneId="x"), dict(rec, rootPid=-1),
                 dict(rec, sessionFile="rel"), dict(rec, state="ended", exitCode=None), dict(rec, exitCode=3),
                 dict(rec, state="ended", exitCode=256), dict(rec, rootPid=True), dict(rec, sessionId="a" * 300),
                 [1]]
        for bad in cases:
            with open(path, "w") as f:
                json.dump(bad, f)
            os.chmod(path, 0o600)
            self.assertIsNone(st.read_record(rdir, tid), bad)
            with self.assertRaises(st.TransportError):
                st.write_record(rdir, tid, bad)

    def test_record_file_hazards(self):
        tid, rdir, rec = self.make_run()
        path = os.path.join(rdir, "state.json")
        os.chmod(path, 0o644)
        self.assertIsNone(st.read_record(rdir, tid))
        os.chmod(path, 0o600)
        with open(path, "w") as f:
            f.write("{" + " " * 17000 + "}")
        self.assertIsNone(st.read_record(rdir, tid))
        for junk in ("not json", "\xff"):
            with open(path, "w", encoding="latin-1") as f:
                f.write(junk)
            self.assertIsNone(st.read_record(rdir, tid))
        os.unlink(path)
        self.assertIsNone(st.read_record(rdir, tid))
        os.symlink("/etc/passwd", path)
        self.assertIsNone(st.read_record(rdir, tid))
        os.unlink(path)
        os.mkfifo(path, 0o600)
        self.assertIsNone(st.read_record(rdir, tid))

    def test_write_over_limit_and_cleanup_tmp(self):
        tid, rdir, rec = self.make_run()
        orig = st.C["recordMaxBytes"]
        st.C["recordMaxBytes"] = 10
        try:
            with self.assertRaises(st.TransportError):
                st.write_record(rdir, tid, rec)
        finally:
            st.C["recordMaxBytes"] = orig
        os.chmod(rdir, 0o500)
        try:
            with self.assertRaises(OSError):
                st.write_record(rdir, tid, rec)
        finally:
            os.chmod(rdir, 0o700)
        self.assertEqual([n for n in os.listdir(rdir) if n.startswith(".state-")], [])

    def test_proc_birth(self):
        self.assertIsInstance(st.proc_birth(os.getpid()), int)
        self.assertIsNone(st.proc_birth(2 ** 22 + 12345))
        self.assertIsNone(st.proc_birth("x"))

    def test_entries_limit_and_ignores_foreign(self):
        root = self.root()
        os.mkdir(os.path.join(root, "notes"))
        for i in range(st.C["runLimit"] + 1):
            os.mkdir(os.path.join(root, f"{i:032x}"), 0o700)
        with self.assertRaises(st.TransportError):
            st.entries(root)

    def test_remove_own_refuses_unknown_and_symlink(self):
        tid, rdir, _ = self.make_run(state="ended", exit_code=0)
        victim = os.path.join(self.tmp, "victim")
        open(victim, "w").close()
        os.symlink(victim, os.path.join(rdir, "attach.lock"))
        with self.assertRaises(st.TransportError):
            st.remove_own(rdir)
        self.assertTrue(os.path.exists(victim))
        os.unlink(os.path.join(rdir, "attach.lock"))
        open(os.path.join(rdir, "foreign.txt"), "w").close()
        with self.assertRaises(st.TransportError):
            st.remove_own(rdir)
        self.assertTrue(os.path.exists(os.path.join(rdir, "state.json")))
        os.unlink(os.path.join(rdir, "foreign.txt"))
        os.mkdir(os.path.join(rdir, "attach.lock"))
        with self.assertRaises(st.TransportError):
            st.remove_own(rdir)
        os.rmdir(os.path.join(rdir, "attach.lock"))
        open(os.path.join(rdir, "attach.lock"), "w").close()
        st.remove_own(rdir)
        self.assertFalse(os.path.exists(rdir))

    def test_cleanup_only_ended_and_reserve_limit(self):
        root = self.root()
        _, live, _ = self.make_run(state="running")
        _, dead, _ = self.make_run(state="ended", exit_code=1, **support.DEAD)
        bad = os.path.join(root, "c" * 32)
        os.mkdir(bad, 0o700)
        open(os.path.join(bad, "state.json"), "w").close()
        self.assertEqual(st.cleanup_ended(root), 1)
        self.assertTrue(os.path.isdir(live) and os.path.isdir(bad))
        self.assertFalse(os.path.exists(dead))
        os.rmdir(st.allocate(root)[1])

        orig = st.C["runLimit"]
        st.C["runLimit"] = 3
        try:
            self.make_run(state="ended", exit_code=0, **support.DEAD)
            os.rmdir(st.allocate(root)[1])  # limpa o encerrado
            self.make_run(state="running")
            with self.assertRaises(st.TransportError):
                st.allocate(root)
        finally:
            st.C["runLimit"] = orig


if __name__ == "__main__":
    unittest.main()
