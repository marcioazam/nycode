import io
import os
import re
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from typing import Any
from unittest import mock

import cli  # type: ignore[import-not-found]
import support
import transport_tmux as tx  # type: ignore[import-not-found]
from support import CODE, st


def run(argv: Any, env: Any) -> Any:
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        rc = cli.main(argv, env)
    return rc, out.getvalue(), err.getvalue()


class LauncherTests(support.Env):
    def test_override_ok_and_validation(self) -> None:
        self.assertEqual(
            cli.resolve_launcher(self.env), os.path.realpath(self.launcher)
        )
        noexec = os.path.join(self.tmp, "noexec")
        Path(noexec).write_text("#!/bin/sh\n")
        for bad in ("rel/nycode", self.tmp + "/missing", noexec):
            with self.assertRaises(st.TransportError):
                cli.resolve_launcher(dict(self.env, NYCODE_SESSION_LAUNCHER=bad))

    def test_default_is_the_first_nycode_of_the_path(self) -> None:
        env = {k: v for k, v in self.env.items() if k != "NYCODE_SESSION_LAUNCHER"}
        with self.assertRaises(st.TransportError):
            cli.resolve_launcher(env)
        pathdir = os.path.join(self.tmp, "pathbin")
        os.mkdir(pathdir)
        support.write_exec(os.path.join(pathdir, "nycode"), "#!/bin/sh\nexit 0\n")
        env["PATH"] = pathdir + ":" + env["PATH"]
        self.assertEqual(
            cli.resolve_launcher(env), os.path.realpath(os.path.join(pathdir, "nycode"))
        )


SUPERVISOR_TS = Path(CODE).parents[2] / "src" / "core" / "lifecycle" / "supervisor.ts"


class HeadlessTests(unittest.TestCase):
    def test_classification(self) -> None:
        for args in (
            ["-p", "x"],
            ["--mode", "rpc"],
            ["--mode=json"],
            ["--version"],
            ["--print"],
            ["--export", "f"],
            ["-h"],
        ):
            self.assertTrue(cli.headless(args, True), args)
        for args in ([], ["hello"], ["--", "-p"], ["--model", "m"]):
            self.assertFalse(cli.headless(args, True), args)
        self.assertTrue(cli.headless([], False))

    def test_flag_lists_match_the_native_supervisor(self) -> None:
        text = SUPERVISOR_TS.read_text(encoding="utf-8")
        flags = re.search(r"HEADLESS_FLAGS = new Set\(\[(.*?)\]\)", text, re.DOTALL)
        prefixes = re.search(r"HEADLESS_PREFIXES = \[(.*?)\]", text, re.DOTALL)
        assert flags is not None and prefixes is not None
        self.assertEqual(
            tuple(re.findall(r'"([^"]+)"', flags.group(1))), cli.HEADLESS_FLAGS
        )
        self.assertEqual(
            tuple(re.findall(r'"([^"]+)"', prefixes.group(1))), cli.HEADLESS_PREFIXES
        )

    def test_default_tty_detection(self) -> None:
        with mock.patch("os.isatty", return_value=False):
            self.assertTrue(cli.headless([]))


class StartErrorTests(support.Env):
    def test_usage(self) -> None:
        for argv in ([], ["bogus"], ["start", "x"], ["attach"], ["list", "x"]):
            self.assertEqual(run(argv, self.env)[0], 1, argv)

    def test_headless_and_marker_passthrough_without_tmux(self) -> None:
        with (
            mock.patch.object(cli, "passthrough", side_effect=SystemExit(0)) as p,
            mock.patch.object(cli, "find_tmux", side_effect=AssertionError("tmux")),
        ):
            with self.assertRaises(SystemExit):
                cli.cmd_start(["--", "-p", "x"], self.env)
            p.assert_called_with(os.path.realpath(self.launcher), ["-p", "x"])
            with self.assertRaises(SystemExit):
                cli.cmd_start(["--", "hello"], dict(self.env, NYCODE_SUBAGENT="1"))
        with mock.patch("os.execv") as ex:
            cli.passthrough("/l", ["a"])
            ex.assert_called_with("/l", ["/l", "a"])
        self.assertEqual(os.listdir(self.agent), [])  # nenhum registro/servidor

    def test_failures_before_tmux(self) -> None:
        with mock.patch.object(cli, "headless", return_value=False):
            with mock.patch.dict(os.environ, {"PATH": self.tmp}):  # sem tmux
                rc, _, err = run(["start", "--"], self.env)
            self.assertEqual(rc, 1)
            self.assertIn("tmux", err)
            rc, _, err = run(
                ["start", "--", "x" * (st.C["bootMaxBytes"] + 1)], self.env
            )
            self.assertIn("1 MiB", err)
            rc, _, err = run(
                ["start"], dict(self.env, NYCODE_SESSION_LAUNCHER=self.tmp + "/none")
            )
            self.assertEqual(rc, 1)
            with mock.patch.object(
                st, "allocate", side_effect=st.TransportError("limite")
            ):
                self.assertIn("limite", run(["start"], self.env)[2])
        self.assertFalse(
            os.path.exists(os.path.join(self.agent, "session-transport"))
            and os.listdir(os.path.join(self.agent, "session-transport"))
        )

    def test_pre_ready_failure_cleans_own_artifacts_only(self) -> None:
        with (
            mock.patch.object(cli, "headless", return_value=False),
            mock.patch.object(
                tx, "start_server", side_effect=st.TransportError("boom")
            ),
            mock.patch.object(tx, "kill_own") as kill,
        ):
            rc, _, err = run(["start"], self.env)
        self.assertEqual(rc, 1)
        self.assertIn("antes do handoff", err)
        kill.assert_called_once()
        self.assertEqual(st.entries(self.root()), [])

    def test_pre_ready_cleanup_refuses_foreign_content(self) -> None:
        def boom(*a: Any) -> None:
            open(os.path.join(os.path.dirname(a[0][2]), "foreign"), "w").close()
            raise st.TransportError("boom")

        with (
            mock.patch.object(cli, "headless", return_value=False),
            mock.patch.object(tx, "start_server", side_effect=boom),
            mock.patch.object(tx, "kill_own"),
        ):
            rc, *_ = run(["start"], self.env)
        self.assertEqual(rc, 1)
        left = st.entries(self.root())
        self.assertEqual(len(left), 1)
        self.assertEqual(os.listdir(os.path.join(self.root(), left[0])), ["foreign"])

    def test_server_args_have_no_user_args(self) -> None:
        argv = tx.server_args("/usr/bin/tmux", "/s/tmux.sock", "a" * 32, "/s", CODE)
        self.assertEqual(
            argv[:5], ["/usr/bin/tmux", "-S", "/s/tmux.sock", "-f", "/dev/null"]
        )
        self.assertEqual(argv[-2:], ["a" * 32, "/s"])
        for need in (
            "prefix",
            "prefix2",
            "status",
            "history-limit",
            "exit-unattached",
            "exit-empty",
            "extended-keys",
            "csi-u",
        ):
            self.assertIn(need, argv)
        self.assertNotIn("-d", [a for a in argv if a in ("attach-session",)])
        i = argv.index(
            "set-clipboard"
        )  # OSC 52 fica no cliente; o servidor não guarda o clipboard
        self.assertEqual(
            argv[i - 2 : i + 2], ["set-option", "-s", "set-clipboard", "external"]
        )


class AttachListTests(support.Env):
    def test_attach_refusals(self) -> None:
        self.assertEqual(run(["attach", "../x"], self.env)[0], 1)
        self.assertEqual(run(["attach", "f" * 32], self.env)[0], 1)  # raiz ausente
        tid, rdir, _rec = self.make_run()
        os.unlink(os.path.join(rdir, "state.json"))
        self.assertIn("incompat", run(["attach", tid], self.env)[2])
        tid, rdir, _rec = self.make_run(state="ended", exit_code=3)
        self.assertIn("encerrado", run(["attach", tid], self.env)[2])
        tid, rdir, _rec = self.make_run()
        with mock.patch.object(tx, "alive", return_value=False):
            self.assertIn("obsoleto", run(["attach", tid], self.env)[2])
        with mock.patch.object(
            cli, "find_tmux", side_effect=st.TransportError("sem tmux")
        ):
            self.assertEqual(run(["attach", tid], self.env)[0], 1)

    def test_attach_flow_results(self) -> None:
        tid, rdir, rec = self.make_run()
        with (
            mock.patch.object(tx, "alive", return_value=True),
            mock.patch.object(tx, "attach", return_value=0),
        ):
            rc, _, err = run(["attach", tid], self.env)
            self.assertEqual(rc, 0)
            self.assertIn(tid, err)
        with (
            mock.patch.object(tx, "alive", return_value=True),
            mock.patch.object(tx, "attach", return_value=1),
        ):
            self.assertEqual(
                run(["attach", tid], self.env)[0], 1
            )  # cliente rc!=0: erro, sem relançar
        with (
            mock.patch.object(tx, "alive", return_value=True),
            mock.patch.object(
                tx, "attach", side_effect=st.TransportError("já existe cliente")
            ),
        ):
            rc, _, err = run(["attach", tid], self.env)
            self.assertEqual(rc, 1)
            self.assertIn("segue viva", err)
        # ended vence: devolve o exit code do nycode
        st.write_record(rdir, tid, dict(rec, state="ended", exitCode=9))
        self.assertEqual(cli.finish("tmux", rdir, tid, 0), 9)
        # registro ilegível sem ended
        os.unlink(os.path.join(rdir, "state.json"))
        self.assertEqual(cli.finish("tmux", rdir, tid, 0), 1)

    def test_list_bounded_metadata_only(self) -> None:
        a, _, _ = self.make_run(sessionFile="/secret/prompt.jsonl")
        b, _, _ = self.make_run(state="ended", exit_code=2)
        c = "d" * 32
        os.mkdir(os.path.join(self.root(), c), 0o700)
        with mock.patch.object(tx, "alive", return_value=False):
            rc, out, _ = run(["list"], self.env)
        self.assertEqual(rc, 0)
        self.assertIn(f"{a} running stale", out)
        self.assertIn(f"{b} ended exit=2", out)
        self.assertIn(f"{c} invalid", out)
        self.assertNotIn("secret", out)
        with mock.patch.object(tx, "alive", return_value=True):
            self.assertIn(f"{a} running live", run(["list"], self.env)[1])
        self.assertEqual(
            run(["list"], dict(self.env, NYCODE_CODING_AGENT_DIR=self.tmp + "/none"))[
                0
            ],
            1,
        )

    def test_find_tmux(self) -> None:
        self.assertTrue(os.path.isabs(cli.find_tmux()))


if __name__ == "__main__":
    unittest.main()
