"""Unidades de permissions/: modes, paths, shell, decide. Caminhos temporários; nada é executado."""

import importlib
import os
import sys
import tempfile
import unittest
from typing import Any

sys.path.insert(
    0,
    os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..",
        "..",
        "..",
        "..",
        "resources",
        "hooks",
    ),
)

modes: Any = importlib.import_module("permissions.modes")
paths: Any = importlib.import_module("permissions.paths")
decide_mode: Any = importlib.import_module("permissions.decide").decide_mode
_shell: Any = importlib.import_module("permissions.shell")
analyze: Any = _shell.analyze
split_segments: Any = _shell.split_segments
tokens: Any = _shell.tokens


class ModesTest(unittest.TestCase):
    def test_parse(self) -> None:
        self.assertIsNone(modes.current_mode({}))
        self.assertIsNone(modes.current_mode({"NYCODE_PERMISSION_MODE": "  "}))
        self.assertEqual(
            modes.current_mode({"NYCODE_PERMISSION_MODE": "Manual"}), "default"
        )
        self.assertEqual(
            modes.current_mode({"NYCODE_PERMISSION_MODE": "acceptEdits"}), "acceptEdits"
        )
        self.assertEqual(modes.current_mode({"NYCODE_PERMISSION_MODE": "plan"}), "plan")
        self.assertEqual(
            modes.current_mode({"NYCODE_PERMISSION_MODE": "bypassPermissions"}),
            "bypassPermissions",
        )
        self.assertEqual(
            modes.current_mode({"NYCODE_PERMISSION_MODE": "ask"}), "default"
        )
        self.assertEqual(
            modes.current_mode({"NYCODE_PERMISSION_MODE": "Auto"}), "acceptEdits"
        )
        for bad in ("dontAsk", "x"):
            self.assertEqual(
                modes.current_mode({"NYCODE_PERMISSION_MODE": bad}), "default"
            )

    def test_bypass_flag(self) -> None:
        self.assertTrue(modes.bypass_active({"NYCODE_BYPASS_PERMISSIONS": "on"}))
        self.assertFalse(modes.bypass_active({"NYCODE_BYPASS_PERMISSIONS": "0"}))
        self.assertFalse(modes.bypass_active({}))


class PathsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory(prefix="perm-paths-")
        self.root = os.path.realpath(self.tmp.name)
        self.proj = os.path.join(self.root, "p")
        os.makedirs(self.proj)
        os.makedirs(os.path.join(self.root, "out"))
        os.symlink(os.path.join(self.root, "out"), os.path.join(self.proj, "l"))
        self.roots = paths.scope_roots(self.proj, self.proj)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_symlink_dotdot_resolves_like_kernel(self) -> None:
        lex, real = paths.resolve("l/../x", self.proj)
        self.assertEqual(lex, os.path.join(self.proj, "x"))
        self.assertEqual(real, os.path.join(self.root, "x"))
        self.assertIsNone(paths.scoped_target("l/../x", self.proj, self.roots))
        self.assertIsNotNone(paths.scoped_target("sub/x", self.proj, self.roots))

    def test_resolve_rejects_odd_input(self) -> None:
        for bad in ("", "~root/x", None, "a\0b"):
            self.assertIsNone(paths.resolve(bad, self.proj))

    def test_protected(self) -> None:
        for p in (
            "/a/.git/config",
            "/a/.config/git/x",
            "/a/.claude/settings.json",
            "/a/.npmrc",
            "/a/.vscode/x.json",
        ):
            self.assertTrue(paths.is_protected(p), p)
        for p in ("/a/.claude/worktrees/w/x", "/a/src/main.py", "/a/.github/ci.yml"):
            self.assertFalse(paths.is_protected(p), p)

    def test_critical(self) -> None:
        for p in (
            "/",
            "/usr",
            "/data",
            os.path.realpath(paths.HOME),
            self.proj,
            self.root,
            os.path.dirname(self.root),
        ):
            self.assertTrue(paths.is_critical(p, self.roots), p)
        self.assertFalse(
            paths.is_critical(os.path.join(self.proj, "build"), self.roots)
        )

    def test_root_cwd_gives_no_scope(self) -> None:
        self.assertEqual(paths.scope_roots("/", "/"), [])


class ShellTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory(prefix="perm-shell-")
        self.cwd = os.path.realpath(self.tmp.name)
        self.roots = paths.scope_roots(self.cwd, self.cwd)
        self.denied = lambda p: os.path.basename(p) == ".env"

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def kind(self, cmd: Any) -> Any:
        return analyze(cmd, self.cwd, self.roots, self.denied)

    def test_tokens_fail_closed(self) -> None:
        for bad in (
            "ls 'x",
            "ls $(x)",
            "ls `x`",
            "ls > f",
            "ls\nls",
            "ls \\\n x",
            "",
            None,
            3,
        ):
            self.assertIsNone(tokens(bad), repr(bad))
        self.assertIsNone(split_segments(["ls", "&&", "&&", "ls"]))
        self.assertIsNone(split_segments(["ls", "&"]))

    def test_kinds(self) -> None:
        self.assertEqual(self.kind("ls | wc -l"), "readonly")
        self.assertIsNone(
            self.kind("git log --oneline")
        )  # git nunca é leitura comprovada (core.fsmonitor executa comando)
        self.assertEqual(self.kind("mkdir -p a/b"), "edit")
        self.assertEqual(self.kind("mkdir a && ls"), None)
        self.assertEqual(self.kind("sed -i 's/a/b/' f.txt"), "edit")
        self.assertEqual(self.kind("sed 's/a/b/g'"), "readonly")
        self.assertIsNone(self.kind("sed -i 's/a/b/'"))  # -i sem arquivo
        self.assertIsNone(self.kind("./ls"))
        self.assertIsNone(self.kind("cat .env"))
        self.assertIsNone(self.kind("cat -- .env"))
        self.assertIsNone(self.kind("grep --file=.env x"))
        self.assertIsNone(self.kind("uniq in out"))
        self.assertIsNone(self.kind("rg --pre=sh x"))

    def test_option_forms_cannot_hide_writes_or_execution(self) -> None:
        for cmd in (
            "sort -ofile x",
            "sort -ro file x",
            "sort -nro file x",
            "sort --out=f x",
            "sort --outp f x",
            "sort --comp=sh x",
            "sort --compress-prog sh x",
            "sort -T/tmp x",
            "date --set=2020-01-01",
            "date --se 2020-01-01",
            "date -s2020-01-01",
            "file -bC",
            "file --comp",
            "tree -R",
            "tree -do f",
        ):
            self.assertIsNone(self.kind(cmd), cmd)
        for ok in (
            "sort -rn x",
            "sort -k2,2 x",
            "date -u",
            "file -b x",
            "tree -L 2",
            "find . -name a -o -name b",
        ):
            self.assertEqual(self.kind(ok), "readonly", ok)

    def test_attached_short_option_values_are_checked_for_secrets(self) -> None:
        for cmd in (
            "grep -f.env x",
            "grep -nf.env x",
            "rg -f.env x",
            "head -c5 .env",
            "sort -T.env x",
        ):
            self.assertIsNone(self.kind(cmd), cmd)
        self.assertEqual(self.kind("grep -n -e foo x.txt"), "readonly")

    def test_recursive_rm_refuses_directories_holding_protected_paths(self) -> None:
        os.makedirs(os.path.join(self.cwd, "vendor", "repo", ".git"))
        os.makedirs(os.path.join(self.cwd, "plain", "sub"))
        self.assertIsNone(self.kind("rm -r vendor"))
        self.assertIsNone(self.kind("rm -r vendor/repo"))
        self.assertEqual(self.kind("rm -r plain"), "edit")

    def test_glob_hitting_secret_is_blocked(self) -> None:
        open(os.path.join(self.cwd, ".env"), "w").close()
        self.assertIsNone(self.kind("cat .e*"))
        self.assertEqual(self.kind("cat *.md"), "readonly")

    def test_glob_limit(self) -> None:
        for i in range(210):
            open(os.path.join(self.cwd, f"f{i}.txt"), "w").close()
        self.assertIsNone(self.kind("cat f*.txt"))


class DecideTest(unittest.TestCase):
    def test_exception_free_paths(self) -> None:
        env = {"NYCODE_BYPASS_PERMISSIONS": "1"}
        cwd = "/tmp/perm-decide-fake"
        denied = lambda p: False
        for m in ("default", "acceptEdits", "plan", "bypassPermissions"):
            self.assertIsNone(
                decide_mode(
                    m, "Bash", {"command": "sudo ls"}, cwd, cwd, ["sudo"], denied, env
                ),
                m,
            )
        self.assertEqual(
            decide_mode(
                "plan", "Bash", {"command": "sudo ls"}, cwd, cwd, ["sudo"], denied, {}
            )[0],
            "ask",
        )
        self.assertEqual(
            decide_mode(
                "bypassPermissions",
                "Bash",
                {"command": "sudo ls"},
                cwd,
                cwd,
                ["sudo"],
                denied,
                {},
            )[0],
            "ask",
        )
        r = decide_mode("default", "Bash", {"command": 7}, cwd, cwd, [], denied, {})
        self.assertEqual(r[0], "ask")
        r = decide_mode(
            "acceptEdits", "Write", {"file_path": 5}, cwd, cwd, [], denied, {}
        )
        self.assertEqual(r[0], "ask")
        self.assertIsNone(decide_mode("default", "Read", {}, cwd, cwd, [], denied, {}))


if __name__ == "__main__":
    unittest.main()
