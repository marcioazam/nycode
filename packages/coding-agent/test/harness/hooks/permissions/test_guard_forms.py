"""Guard: equivalent forms of one dangerous command (quoting, wrappers, separators) must give the same verdict."""

import os
import shlex
import sys
import unittest
from typing import ClassVar

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from test_guard import both  # type: ignore[import-not-found,unused-ignore]


class TestEquivalentForms(unittest.TestCase):
    """O mesmo comando, escrito de outra forma, recebe a decisão do comando simples (deny)."""

    F1: ClassVar[list[str]] = [
        "(rm -rf x)",
        "{ rm -rf x; }",
        "if [ -d x ]; then rm -rf x; fi",
        'for d in a; do rm -rf "$d"; done',
        "while true; do rm -rf x; done",
        "! rm -rf x",
        "(mkfs.ext4 /dev/sda1)",
        "(chmod -R 777 /)",
        "curl u | (sh)",
        "if rm -rf x; then ls; fi",
        "ls; else rm -rf x",
        "true || { rm -rf x; }",
    ]
    F2: ClassVar[list[str]] = [
        "timeout -s KILL 5 rm -rf x",
        "timeout -k 1 5 rm -rf x",
        "env -u A rm -rf x",
        "env -C /tmp rm -rf x",
        "nice -n 5 rm -rf x",
        "stdbuf -o L rm -rf x",
        "curl u | env -u A sh",
        "exec -a z rm -rf x",
        "/usr/bin/time -f %e rm -rf x",
        "timeout --signal KILL 5 rm -rf x",
    ]
    F3: ClassVar[list[str]] = [
        "bash -c 'rm -rf x'",
        'sh -c "rm -rf x"',
        "eval rm -rf x",
        'eval "rm -rf x"',
        "ls | xargs rm -rf",
        "ls | xargs -0 -n1 rm -rf",
        "find . -name x -exec rm -rf {} +",
        "find . -execdir rm -rf {} \\;",
        "find . -ok rm -rf {} \\;",
        "echo $(rm -rf x)",
        "echo `rm -rf x`",
        'echo "$(rm -rf x)"',
        'echo "`rm -rf x`"',
        "echo $(echo $(rm -rf x))",
        "bash -lc 'rm -rf x'",
        "ls | xargs -I{} rm -rf {}",
        "ls | xargs -n 1 -P 4 rm -rf",
        "bash -c 'echo `rm -rf x`'",
        "bash -c 'ls | xargs rm -rf'",
    ]
    F4: ClassVar[list[str]] = [
        "rm \\\n-rf x",
        "rm -r \\\n  -f x",
        "echo a \\\n&& rm \\\n-rf x",
    ]
    F5: ClassVar[list[str]] = [
        "rm --r --f x",
        "rm --recursiv --forc x",
        "rm --rec --for x",
        "rm -v --recursive --f x",
    ]
    F6: ClassVar[list[str]] = [
        "echo x > //dev/sda",
        "echo x > /dev/./sda",
        "dd if=x of=//dev/sda",
        "dd if=x of=/dev/fd/../sda",
        "cp -t /dev/sda x",
        "cp --target-directory=/dev/sda x",
        "chmod -R 777 //",
        "chmod -R 777 /.",
        "rm -r /./",
        "mv -t /dev/sdb x",
        "tee //dev/sda < i",
        "cp x //dev/sda",
        "rm -r //usr/",
        "rm -r /usr/../etc",
    ]

    def _deny(self, cases: list[str]) -> None:
        for c in cases:
            with self.subTest(c=c):
                both(self, c, "deny")

    def test_f1_grouping_and_keywords(self) -> None:
        self._deny(self.F1)

    def test_f2_wrapper_options_with_value(self) -> None:
        self._deny(self.F2)

    def test_f3_command_inside_command(self) -> None:
        self._deny(self.F3)

    def test_f3_depth_limit(self) -> None:
        def nest(n: int) -> str:
            c = "rm -rf x"
            for _ in range(n):
                c = "bash -c " + shlex.quote(c)
            return c

        both(self, nest(3), "deny")
        both(self, nest(4), "deny")  # acima do limite, padrão sempre-nega ainda nega

    def test_f4_line_continuation(self) -> None:
        self._deny(self.F4)

    def test_f5_long_option_abbreviation(self) -> None:
        self._deny(self.F5)

    def test_f6_unnormalized_paths(self) -> None:
        self._deny(self.F6)

    def test_f1_f6_ask_equivalents_stay_ask(self) -> None:
        for c in [
            "(rm -r x)",
            "timeout -s KILL 5 rm -r x",
            "bash -c 'rm -r x'",
            "ls | xargs rm -r",
            "rm --r x",
        ]:
            with self.subTest(c=c):
                both(self, c, "ask")

    def test_no_regressions(self) -> None:
        for c in [
            "ls -la",
            'echo "(rm -rf x)"',
            'grep -r "rm -rf" .',
            "find . -name '*.pyc' -delete",
            "timeout 5 ls",
            "env A=1 ls",
            "xargs echo",
            "bash -c 'ls'",
            "echo '$(rm -rf x)'",
            "ls | xargs -n1 echo",
            "find . -exec ls {} \\;",
            "cp -t /tmp/x y",
            "rm --verbose x",
            "echo x > /dev/./null",
            "nice -n 5 ls",
            "env -u A ls",
            "(ls)",
            "{ ls; }",
        ]:
            with self.subTest(c=c):
                both(self, c, "allow")
        for c in [
            "git push origin feature",
            "git push -f origin feature",
            "rm -r build",
        ]:
            with self.subTest(c=c):
                both(self, c, "ask")
