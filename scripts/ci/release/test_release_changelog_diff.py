"""Tests of release_changelog_diff.py on throwaway git repos: green header swaps, red for anything else."""

import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))
import release_changelog_diff

pytestmark = pytest.mark.skipif(shutil.which("git") is None, reason="git not installed")

BODY = "# Changelog\n\n## [Unreleased]\n\n### Added\n\n- thing\n\n## [1.0.0] - 2026-01-01\n\n- old\n"


def git(root: Path, *args: str) -> str:
    env = {
        "GIT_CONFIG_GLOBAL": "/dev/null",
        "GIT_CONFIG_SYSTEM": "/dev/null",
        "PATH": "/usr/bin:/bin",
    }
    cmd = [
        "git",
        "-c",
        "user.name=t",
        "-c",
        "user.email=t@t",
        "-c",
        "commit.gpgsign=false",
        *args,
    ]
    return subprocess.run(
        cmd, cwd=root, env=env, check=True, capture_output=True, text=True
    ).stdout


def write(root: Path, rel: str, text: str) -> None:
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)


@pytest.fixture
def repo(tmp_path: Path) -> Path:
    git(tmp_path, "init", "-q", "-b", "main")
    for pkg in ("a", "b"):
        write(tmp_path, f"packages/{pkg}/CHANGELOG.md", BODY)
        write(
            tmp_path, f"packages/{pkg}/package.json", json.dumps({"version": "2.0.0"})
        )
    git(tmp_path, "add", "-A")
    git(tmp_path, "commit", "-q", "-m", "base")
    git(tmp_path, "checkout", "-q", "-b", "release/v2.0.0")
    return tmp_path


def swap(root: Path, pkg: str, heading: str = "## [2.0.0] - 2026-11-21") -> None:
    p = root / f"packages/{pkg}/CHANGELOG.md"
    p.write_text(p.read_text().replace("## [Unreleased]", heading))


def check(root: Path, capsys: pytest.CaptureFixture[str]) -> tuple[int, str]:
    git(root, "commit", "-q", "-am", "release")
    code = release_changelog_diff.main(["--root", str(root), "--base", "main"])
    out = capsys.readouterr()
    return code, out.out + out.err


def test_header_swap_in_several_packages_passes(
    repo: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    swap(repo, "a")
    swap(repo, "b")
    code, out = check(repo, capsys)
    assert code == 0, out


def test_no_changelog_change_passes(
    repo: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    write(repo, "packages/a/other.txt", "x")
    git(repo, "add", "-A")
    code, out = check(repo, capsys)
    assert code == 0, out


def test_base_may_be_ahead_of_the_merge_base(
    repo: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    swap(repo, "a")
    git(repo, "commit", "-q", "-am", "release")
    git(repo, "checkout", "-q", "main")
    write(repo, "packages/a/other.txt", "x")
    git(repo, "add", "-A")
    git(repo, "commit", "-q", "-m", "main moved")
    git(repo, "checkout", "-q", "release/v2.0.0")
    assert release_changelog_diff.main(["--root", str(repo), "--base", "main"]) == 0


def test_changed_released_line_fails(
    repo: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    swap(repo, "a")
    p = repo / "packages/a/CHANGELOG.md"
    p.write_text(p.read_text().replace("- old", "- older"))
    code, out = check(repo, capsys)
    assert code == 1 and "packages/a/CHANGELOG.md" in out


def test_version_different_from_package_json_fails(
    repo: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    swap(repo, "a", "## [2.0.1] - 2026-11-21")
    code, out = check(repo, capsys)
    assert code == 1 and "2.0.0" in out


@pytest.mark.parametrize("date", ["2026-13-01", "2026-02-30", "21-11-2026", "soon"])
def test_invalid_date_fails(
    repo: Path, capsys: pytest.CaptureFixture[str], date: str
) -> None:
    swap(repo, "a", f"## [2.0.0] - {date}")
    code, out = check(repo, capsys)
    assert code == 1 and "date" in out


def test_new_entry_under_the_version_fails(
    repo: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    swap(repo, "a")
    p = repo / "packages/a/CHANGELOG.md"
    p.write_text(p.read_text().replace("- thing\n", "- thing\n- sneaked in\n"))
    code, out = check(repo, capsys)
    assert code == 1 and "sneaked in" in out


def test_removed_section_fails(repo: Path, capsys: pytest.CaptureFixture[str]) -> None:
    swap(repo, "a")
    p = repo / "packages/a/CHANGELOG.md"
    p.write_text(p.read_text().replace("## [1.0.0] - 2026-01-01\n\n- old\n", ""))
    code, _ = check(repo, capsys)
    assert code == 1


def test_unreleased_heading_removed_without_replacement_fails(
    repo: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    p = repo / "packages/a/CHANGELOG.md"
    p.write_text(p.read_text().replace("## [Unreleased]\n\n", ""))
    code, _ = check(repo, capsys)
    assert code == 1


def test_heading_added_without_removal_fails(
    repo: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    p = repo / "packages/a/CHANGELOG.md"
    p.write_text(p.read_text() + "\n## [2.0.0] - 2026-11-21\n")
    code, _ = check(repo, capsys)
    assert code == 1


def test_deleted_changelog_fails(
    repo: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    (repo / "packages/a/CHANGELOG.md").unlink()
    code, out = check(repo, capsys)
    assert code == 1 and "deleted" in out


def test_added_changelog_fails(repo: Path, capsys: pytest.CaptureFixture[str]) -> None:
    write(repo, "packages/c/CHANGELOG.md", BODY)
    write(repo, "packages/c/package.json", json.dumps({"version": "2.0.0"}))
    git(repo, "add", "-A")
    code, out = check(repo, capsys)
    assert code == 1 and "added" in out


def test_missing_package_json_fails(
    repo: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    swap(repo, "a")
    (repo / "packages/a/package.json").unlink()
    code, out = check(repo, capsys)
    assert code == 1 and "package.json" in out


def test_content_line_starting_with_dashes_is_not_a_file_header(
    repo: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    swap(repo, "a")
    p = repo / "packages/a/CHANGELOG.md"
    p.write_text(p.read_text().replace("- old\n", "-- old\n"))
    code, out = check(repo, capsys)
    assert code == 1 and "-- old" in out


def test_unknown_base_fails_clearly(
    repo: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    code = release_changelog_diff.main(["--root", str(repo), "--base", "nope"])
    err = capsys.readouterr().err
    assert code == 1 and "merge-base" in err


def test_unrelated_histories_have_no_merge_base(
    repo: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    git(repo, "checkout", "-q", "--orphan", "other")
    git(repo, "commit", "-q", "-m", "orphan", "--allow-empty")
    code = release_changelog_diff.main(["--root", str(repo), "--base", "main"])
    assert code == 1 and "merge-base" in capsys.readouterr().err


def test_report_is_capped(repo: Path, capsys: pytest.CaptureFixture[str]) -> None:
    swap(repo, "a")
    p = repo / "packages/a/CHANGELOG.md"
    p.write_text(p.read_text() + "".join(f"- extra {n}\n" for n in range(50)))
    code, out = check(repo, capsys)
    assert code == 1 and "extra 0" in out and "extra 49" not in out and "more" in out
