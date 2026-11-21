"""Checks that a release PR changes the CHANGELOG.md files only by dating the `## [Unreleased]` heading (D-44).

The generic released-sections check compares every changelog with the newest tag, so it cannot pass a version PR:
the commit of `release.mjs` turns `## [Unreleased]` into `## [<version>] - <date>`. This narrower check reads the diff
between the merge-base with the PR base and HEAD. In each changed CHANGELOG.md the only allowed change is one removed
`## [Unreleased]` line and one added `## [<version>] - <YYYY-MM-DD>` line, with <version> equal to the `version` of the
package.json beside it and a real calendar date. Any other added or removed line, an added or deleted file fails.
Usage: release_changelog_diff.py --base <ref> [--root <repo>]. Exit 0 ok, 1 violation or git failure.
"""

import argparse
import json
import re
import subprocess
import sys
from datetime import date
from pathlib import Path, PurePosixPath

UNRELEASED = "## [Unreleased]"
MAX_REPORTED = 20  # a mass edit of a changelog must not flood the CI log
DATED = re.compile(r"^## \[(?P<version>[^\]]+)\] - (?P<date>\d{4}-\d{2}-\d{2})$")
SECTIONS = re.compile(r"^diff --git a/(?P<path>.+) b/(?P=path)$")


class GitError(Exception):
    pass


def git(root: Path, *args: str) -> str:
    done = subprocess.run(
        ["git", "-c", "core.quotepath=off", *args],
        cwd=root,
        capture_output=True,
        text=True,
        check=False,
    )
    if done.returncode != 0:
        raise GitError(done.stderr.strip() or f"git {args[0]} exited {done.returncode}")
    return done.stdout


def changed_lines(
    diff: str,
) -> tuple[dict[str, tuple[list[str], list[str]]], dict[str, str]]:
    """Per CHANGELOG path: (removed lines, added lines); plus the paths added or deleted whole, with the verb."""
    changes: dict[str, tuple[list[str], list[str]]] = {}
    whole: dict[str, str] = {}
    path = ""
    in_hunk = False
    for line in diff.splitlines():
        header = SECTIONS.match(line)
        if header:  # a content line never starts with "diff --git": git prefixes it with +, - or a space
            path = header["path"]
            changes[path] = ([], [])
            in_hunk = False
        elif not path:
            continue
        elif line.startswith("@@"):
            in_hunk = True
        elif (
            not in_hunk
        ):  # file headers (`--- a/x`, `+++ b/x`) stay out of the content lines
            if line.startswith("new file mode"):
                whole[path] = "added"
            elif line.startswith("deleted file mode"):
                whole[path] = "deleted"
        elif line.startswith("-"):
            changes[path][0].append(line[1:])
        elif line.startswith("+"):
            changes[path][1].append(line[1:])
    return changes, whole


def package_version(root: Path, changelog: str) -> str:
    manifest = (PurePosixPath(changelog).parent / "package.json").as_posix()
    try:
        return str(json.loads(git(root, "show", f"HEAD:{manifest}"))["version"])
    except (GitError, ValueError, KeyError) as err:
        raise GitError(f"cannot read the version of {manifest}: {err}") from err


def violations(root: Path, diff: str) -> list[str]:
    changes, whole = changed_lines(diff)
    problems = [
        f"{path}: file {verb}; a version PR only dates the existing heading"
        for path, verb in whole.items()
    ]
    for path, (removed, added) in changes.items():
        if path in whole:
            continue
        if removed != [UNRELEASED]:
            problems += [
                f"{path}: removed line is not '{UNRELEASED}': {line!r}"
                for line in removed or ["(none)"]
            ]
        if len(added) != 1:
            problems += [
                f"{path}: added line outside the dated heading: {line!r}"
                for line in added or ["(none)"]
            ]
            continue
        match = DATED.match(added[0])
        if not match:
            problems.append(
                f"{path}: added line is not a dated heading '## [<version>] - <date YYYY-MM-DD>': {added[0]!r}"
            )
            continue
        try:
            date.fromisoformat(match["date"])
        except ValueError:
            problems.append(f"{path}: invalid date {match['date']!r}")
            continue
        try:
            version = package_version(root, path)
        except GitError as err:
            problems.append(f"{path}: {err}")
            continue
        if match["version"] != version:
            problems.append(
                f"{path}: heading version {match['version']} differs from package.json version {version}"
            )
    return problems


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__.splitlines()[0] if __doc__ else None
    )
    parser.add_argument("--base", required=True, help="PR base ref, e.g. origin/main")
    parser.add_argument(
        "--root", default=".", type=Path, help="repository root (default: cwd)"
    )
    args = parser.parse_args(argv)
    try:
        try:
            base = git(args.root, "merge-base", args.base, "HEAD").strip()
        except GitError as err:
            raise GitError(
                f"no merge-base between {args.base} and HEAD (shallow fetch?): {err}"
            ) from err
        diff = git(
            args.root,
            "diff",
            "--unified=0",
            "--no-renames",
            base,
            "HEAD",
            "--",
            "*CHANGELOG.md",
        )
        problems = violations(args.root, diff)
    except GitError as err:
        print(f"release-changelog-diff: {err}", file=sys.stderr)
        return 1
    for problem in problems[:MAX_REPORTED]:
        print(f"release-changelog-diff: {problem}", file=sys.stderr)
    if len(problems) > MAX_REPORTED:
        print(
            f"release-changelog-diff: ... and {len(problems) - MAX_REPORTED} more",
            file=sys.stderr,
        )
    print(f"release-changelog-diff: {'FAILED' if problems else 'ok'} (base {base[:9]})")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
