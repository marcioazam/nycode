"""Endurecimento da classificação de Bash: git, leitura recursiva, cp/mv e rm -r. Só arquivos temporários; nada é executado."""

import os
import sys
import tempfile
import unittest
from typing import Any
from unittest import mock

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

from permissions import paths
from permissions.shell import analyze


class Base(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory(prefix="perm-hard-")
        self.root = os.path.realpath(self.tmp.name)
        self.cwd = os.path.join(self.root, "p")
        self.out = os.path.join(self.root, "outside")
        os.makedirs(os.path.join(self.cwd, "src"))
        os.makedirs(os.path.join(self.cwd, "out"))
        os.makedirs(self.out)
        for name in ("a.txt", "b.txt", "src/f.txt", ".env"):
            self.touch(name)
        self.roots = paths.scope_roots(self.cwd, self.cwd)
        self.denied = lambda p: os.path.basename(p) == ".env"

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def touch(self, rel: Any, base: Any = None) -> Any:
        p = os.path.join(base or self.cwd, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w") as fh:
            fh.write("x")
        return p

    def kind(self, cmd: Any) -> Any:
        return analyze(cmd, self.cwd, self.roots, self.denied)


class GitIsNeverAutoApproved(Base):
    def test_every_git_command_asks(self) -> None:
        for cmd in (
            "git status",
            "git log --oneline",
            "git diff",
            "git show HEAD",
            "git rev-parse HEAD",
            "git ls-files",
            "git blame a.txt",
            "ls | git status",
            "git status && ls",
        ):
            self.assertIsNone(self.kind(cmd), cmd)


class RecursiveContentSearchAsks(Base):
    def test_grep_family_recursion_asks(self) -> None:
        for cmd in (
            "grep -r x",
            "grep -rn x src",
            "grep -R x .",
            "grep --recursive x src",
            "grep --recurs x src",
            "grep --dereference-recursive x",
            "grep -d recurse x src",
            "grep -drecurse x src",
            "grep --directories=recurse x src",
            "egrep -r x src",
            "fgrep -r x src",
            "grep -nr x src",
            "grep -i -r x src",
        ):
            self.assertIsNone(self.kind(cmd), cmd)

    def test_grep_on_explicit_files_still_allowed(self) -> None:
        self.assertEqual(self.kind("grep -n -i x a.txt b.txt"), "readonly")
        self.assertEqual(self.kind("ls | grep x"), "readonly")
        self.assertIsNone(self.kind("grep x .env"))

    def test_rg_needs_explicit_regular_files(self) -> None:
        for cmd in (
            "rg x",
            "rg x .",
            "rg x src",
            "rg -n x",
            "rg x -- src",
            "rg x missing.txt",
            "rg x .env",
            "ls | rg x",
            "rg --files",
            "rg -uu x a.txt",
            "rg -g '*.env' x a.txt",
            "rg x a.txt src",
            "rg x *.txt .",
            "rg --no-ignore -e x",
        ):
            self.assertIsNone(self.kind(cmd), cmd)
        os.symlink(self.out, os.path.join(self.cwd, "lnk"))
        self.assertIsNone(self.kind("rg x lnk"))
        self.assertEqual(self.kind("rg x a.txt"), "readonly")
        self.assertEqual(self.kind("rg -n -i x a.txt b.txt"), "readonly")

    def test_diff_directories_and_recursion_ask(self) -> None:
        for cmd in (
            "diff -r src out",
            "diff -rq src out",
            "diff --recursive src out",
            "diff --rec src out",
            "diff src out",
            "diff a.txt",
            "diff a.txt b.txt src",
            "diff a.txt .env",
            "diff -x x a.txt b.txt",
            "diff --from-file=src a.txt",
            "diff a.txt missing.txt",
            "ls | diff - a.txt",
        ):
            self.assertIsNone(self.kind(cmd), cmd)
        self.assertEqual(self.kind("diff -u a.txt b.txt"), "readonly")

    def test_file_list_consumers_ask(self) -> None:
        for cmd in (
            "sort --files0-from=list",
            "sort --files0 list",
            "sort --files0-from list",
            "wc --files0-from=list",
            "wc --files0-from list",
            "du --files0-from=list",
            "file -f list",
            "file --files-from list",
            "find . -files0-from list",
        ):
            self.assertIsNone(self.kind(cmd), cmd)
        self.assertEqual(self.kind("wc -l a.txt"), "readonly")

    def test_sed_cannot_read_secret_operand(self) -> None:
        self.assertIsNone(self.kind("sed 's/a/b/' .env"))
        self.assertIsNone(self.kind("sed -i 's/a/b/' .env"))
        self.assertEqual(self.kind("sed -n 's/a/b/p' a.txt"), "readonly")


class CopyMoveFinalDestination(Base):
    def test_cp_into_directory_asks(self) -> None:
        os.symlink(os.path.join(self.out), os.path.join(self.cwd, "src", "f.txt.d"))
        self.touch("sub/file")
        os.makedirs(os.path.join(self.cwd, "dest"))
        os.symlink(
            os.path.join(self.out, "target"), os.path.join(self.cwd, "dest", "file")
        )
        for cmd in (
            "cp sub/file dest",
            "cp sub/file dest/",
            "cp sub/file out",
            "mv sub/file out",
            "mv sub/file src",
        ):
            self.assertIsNone(self.kind(cmd), cmd)

    def test_cp_through_symlink_target_asks(self) -> None:
        os.symlink(os.path.join(self.out, "t"), os.path.join(self.cwd, "ln"))
        os.symlink(self.touch("t2", self.out), os.path.join(self.cwd, "ln2"))
        for cmd in ("cp a.txt ln", "cp a.txt ln2", "mv a.txt ln", "cp ln2 b2.txt"):
            self.assertIsNone(self.kind(cmd), cmd)

    def test_hardlinked_target_asks_for_inplace_cp(self) -> None:
        os.link(self.touch("t3", self.out), os.path.join(self.cwd, "hl"))
        self.assertIsNone(self.kind("cp a.txt hl"))

    def test_directories_and_complex_forms_ask(self) -> None:
        for cmd in (
            "cp -r src copy",
            "cp -R src copy",
            "cp --recursive src copy",
            "cp src copy",
            "mv src moved",
            "cp a.txt b.txt out",
            "mv a.txt b.txt out",
            "cp a.txt",
            "cp -T a.txt out",
            "cp -a a.txt c.txt",
            "cp -l a.txt c.txt",
            "cp -s a.txt c.txt",
            "cp --parents a.txt c.txt",
            "cp --backup a.txt c.txt",
            "mv --backup a.txt c.txt",
            "cp a.txt missingdir/c.txt",
            "cp missing.txt c.txt",
            "cp .env c.txt",
            "cp a.txt .git/x",
        ):
            self.assertIsNone(self.kind(cmd), cmd)

    def test_directory_holding_protected_paths_cannot_move_or_copy(self) -> None:
        os.makedirs(os.path.join(self.cwd, "vendor", ".git"))
        for cmd in ("mv vendor moved", "cp -r vendor copy", "mv vendor out"):
            self.assertIsNone(self.kind(cmd), cmd)

    def test_two_regular_files_still_allowed(self) -> None:
        self.assertEqual(self.kind("cp a.txt c.txt"), "edit")
        self.assertEqual(self.kind("cp -p -v a.txt b.txt"), "edit")
        self.assertEqual(self.kind("cp a.txt out/c.txt"), "edit")
        self.assertEqual(self.kind("mv a.txt c.txt"), "edit")
        self.assertEqual(self.kind("mv -n a.txt out/c.txt"), "edit")


class RecursiveRmFailsClosed(Base):
    def test_unreadable_tree_asks(self) -> None:
        os.makedirs(os.path.join(self.cwd, "tree", "sub"))
        real_scandir = os.scandir

        def deny(path: Any, *a: Any, **kw: Any) -> Any:
            if str(path).endswith(os.path.join("tree", "sub")):
                raise PermissionError(13, "denied", str(path))
            return real_scandir(path, *a, **kw)

        with mock.patch("os.scandir", side_effect=deny):
            self.assertIsNone(self.kind("rm -r tree"))
        self.assertEqual(self.kind("rm -r tree"), "edit")

    def test_missing_or_symlinked_operand_asks(self) -> None:
        os.makedirs(os.path.join(self.cwd, "real", "x"))
        os.symlink(os.path.join(self.cwd, "real"), os.path.join(self.cwd, "viaLink"))
        for cmd in (
            "rm -r missing",
            "rm -r viaLink",
            "rm -r viaLink/x",
            "rm -r real/missing",
        ):
            self.assertIsNone(self.kind(cmd), cmd)

    def test_no_protected_below_unit(self) -> None:
        self.assertFalse(paths.no_protected_below(os.path.join(self.cwd, "nope")))
        self.assertTrue(paths.no_protected_below(os.path.join(self.cwd, "a.txt")))
        self.assertTrue(paths.no_protected_below(os.path.join(self.cwd, "src")))

    def test_plain_rm_of_file_still_edit(self) -> None:
        self.assertEqual(self.kind("rm a.txt"), "edit")
        self.assertEqual(self.kind("rm -r src"), "edit")


if __name__ == "__main__":
    unittest.main()
