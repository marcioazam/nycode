#!/usr/bin/env python3
"""Residue gate (D-30, D-45, P-17 R1, C-F12-06): the pi stays out of the nycode internals.

The search (rg; git grep when rg is missing, said on stderr) is `-i -w` over PI_WORDS: `pi`, `pi-<x>`, `pi.dev`,
`earendil`, `mariozechner` and the retired names `nycode-harness` and `ny-pi`. Files the plan keeps on purpose are exempt (EXEMPT_*): LICENSE, NOTICE, every
CHANGELOG.md, the root README.md (D-31), the migration from pi, docs/fork, docs/migration, docs/harness.
Every other match must be covered by a line of residuo-allow.txt: `glob | regex | class | reason`.

The glob uses fnmatch rules (`*` also crosses `/`): `**` and a leading wildcard are refused. The regex is a
Python regex (searched in the hit line) or `*` for every match of the file; a match is covered only when it lies
inside a span the regex matched, so an exception never hides a second, different leftover on the same line.
The first line that covers a match owns it; a line that owns none is stale and fails too: the list only shrinks.

Usage: residuo.py [--root DIR] [--allow FILE]
Exit 0 clean, 1 findings (new hit or stale/invalid exception), 2 search or list unusable.
"""

from __future__ import annotations

import argparse
import fnmatch
import re
import shutil
import subprocess
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

PI_WORDS = r"pi|pi-[a-z]+|pi\.dev|earendil|mariozechner|nycode-harness|ny-pi"
PI_RX = re.compile(rf"(?<!\w)(?:{PI_WORDS})(?!\w)", re.IGNORECASE)
CLASSES = (
    "upstream",  # history and records of the upstream we forked: issue links, session fixtures, archived docs
    "terceiros",  # packages, hosts and repositories someone else owns and names
    "legal",  # license attribution
    "protocolo",  # names on the wire shared with processes we do not rebuild
    "falso-positivo",  # `Math.PI` and the like
    "compat",  # names still accepted from the origin harness
    "migracao",  # records and pointers about the migration from the origin harness
    "ferramenta-fork",  # the fork's own rename and gate machinery
    "produto-externo",  # bench: the arms and records that measure the pi
)
EXEMPT_BASENAMES = ("LICENSE", "NOTICE", "CHANGELOG.md")
EXEMPT_PATHS = ("README.md",)
EXEMPT_GLOBS = (
    "docs/fork/*",
    "docs/migration/*",
    "docs/harness/*",
    "scripts/ci/lint/residuo/*",  # the gate spells the words by design
)
ALL = "*"
ALLOW_FILE = Path(__file__).with_name("residuo-allow.txt")
SHOW = 140


class SearchError(Exception):
    """No usable search tool, or the tool failed."""


@dataclass(frozen=True)
class Exemption:
    glob: str
    regex: re.Pattern[str] | None  # None = every match
    cls: str
    reason: str
    line: int


@dataclass(frozen=True)
class Hit:
    path: str
    line: int
    text: str

    @property
    def spans(self) -> list[tuple[int, int]]:
        found = [m.span() for m in PI_RX.finditer(self.text)]
        return found or [
            (0, len(self.text))
        ]  # the tool saw it, the regex did not: the whole line is open


def parse_allow(text: str) -> tuple[list[Exemption], list[str]]:
    """Return the exceptions and the problems found in the list itself."""
    found: list[Exemption] = []
    problems: list[str] = []
    for n, raw in enumerate(text.splitlines(), 1):
        row = raw.strip()
        if not row or row.startswith("#"):
            continue
        parts = [p.strip() for p in row.split(" | ", 3)]
        if len(parts) != 4 or not all(parts):
            problems.append(f"allow:{n}: expected `glob | regex | class | reason`")
            continue
        glob, pattern, cls, reason = parts
        if "**" in glob or glob[0] in "*?[":
            problems.append(
                f"allow:{n}: glob `{glob}` is too generic (no `**`, no leading wildcard)"
            )
        elif cls not in CLASSES:
            problems.append(
                f"allow:{n}: class `{cls}` is not one of {', '.join(CLASSES)}"
            )
        else:
            try:
                rx = None if pattern == ALL else re.compile(pattern)
            except re.error as e:
                problems.append(f"allow:{n}: bad regex `{pattern}`: {e}")
                continue
            found.append(Exemption(glob, rx, cls, reason, n))
    return found, problems


def exempt(path: str) -> bool:
    return (
        path.rsplit("/", 1)[-1] in EXEMPT_BASENAMES
        or path in EXEMPT_PATHS
        or any(fnmatch.fnmatchcase(path, g) for g in EXEMPT_GLOBS)
    )


def _run(cmd: list[str], root: Path) -> str:
    # stdin closed: rg reads a piped stdin (CI) instead of the tree when no path is given.
    done = subprocess.run(
        cmd,
        cwd=root,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        check=False,
    )
    if done.returncode not in (0, 1):  # 1 = no match, for rg and git grep alike
        raise SearchError(
            f"{cmd[0]} exited {done.returncode}: {done.stderr.strip()[:200]}"
        )
    return done.stdout


def search(root: Path) -> tuple[list[Hit], str]:
    """Run the search; return the hits outside the fixed exemptions and the tool that ran."""
    if shutil.which("rg"):
        tool = "rg"
        out = _run(
            [
                "rg",
                "-n",
                "-i",
                "-w",
                "--no-heading",
                "--color",
                "never",
                "-e",
                PI_WORDS,
                "--",
                ".",
            ],
            root,
        )
    elif shutil.which("git"):
        # --no-index + --exclude-standard: the working tree minus .gitignore, like rg (no repository needed).
        tool = "git grep"
        out = _run(
            [
                "git",
                "grep",
                "--no-index",
                "--exclude-standard",
                "-nIiwE",
                PI_WORDS,
                "--",
                ".",
            ],
            root,
        )
    else:
        raise SearchError("neither rg nor git found")
    hits: list[Hit] = []
    for row in out.splitlines():
        path, _, rest = row.partition(":")
        num, _, text = rest.partition(":")
        path = path.removeprefix("./")
        if num.isdigit() and not exempt(path):
            hits.append(Hit(path, int(num), text))
    return hits, tool


def check(
    hits: list[Hit], exemptions: list[Exemption]
) -> tuple[list[Hit], set[int], Counter[str]]:
    """Return the uncovered hits, the exception lines that own a match and the covered lines per class."""
    bad: list[Hit] = []
    used: set[int] = set()
    per_class: Counter[str] = Counter()
    for hit in hits:
        classes: set[str] = set()
        open_spans = 0
        for start, end in hit.spans:
            owner = next(
                (
                    ex
                    for ex in exemptions
                    if fnmatch.fnmatchcase(hit.path, ex.glob)
                    and (
                        ex.regex is None
                        or any(
                            m.start() <= start and end <= m.end()
                            for m in ex.regex.finditer(hit.text)
                        )
                    )
                ),
                None,
            )
            if owner is None:
                open_spans += 1
            else:
                used.add(owner.line)
                classes.add(owner.cls)
        if open_spans:
            bad.append(hit)
        else:
            per_class.update(classes)
    return bad, used, per_class


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=(__doc__ or "").split("\n")[0])
    ap.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[4])
    ap.add_argument("--allow", type=Path, default=ALLOW_FILE)
    args = ap.parse_args(argv)
    try:
        exemptions, problems = parse_allow(args.allow.read_text())
        hits, tool = search(args.root)
    except (OSError, SearchError) as e:
        print(f"residuo: {e}", file=sys.stderr)
        return 2
    print(
        f"residuo: search via {tool}, {len(hits)} lines, {len(exemptions)} exceptions",
        file=sys.stderr,
    )
    bad, used, per_class = check(hits, exemptions)
    problems += [
        f"allow:{ex.line}: stale, `{ex.glob}` covers no hit"
        for ex in exemptions
        if ex.line not in used
    ]
    for hit in bad:
        print(f"{hit.path}:{hit.line}: {hit.text.strip()[:SHOW]}")
    for p in problems:
        print(p)
    if bad or problems:
        print(
            f"residuo FAIL: {len(bad)} uncovered lines, {len(problems)} list problems"
        )
        return 1
    by_class = Counter(ex.cls for ex in exemptions)
    print(f"residuo OK: {len(hits)} lines covered by {len(exemptions)} exceptions")
    for cls in CLASSES:
        print(f"  {cls}: {by_class[cls]} exceptions, {per_class[cls]} lines")
    return 0


if __name__ == "__main__":
    sys.exit(main())
