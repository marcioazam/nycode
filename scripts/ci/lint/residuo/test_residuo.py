"""Tests of residuo.py: allow-list parsing, span coverage, stale detection, both search tools and exit codes."""

import shutil
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))
import residuo

HAS_RG = shutil.which("rg") is not None
HAS_GIT = shutil.which("git") is not None


def put(root: Path, rel: str, text: str) -> None:
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)


def run(
    root: Path, allow: str, capsys: pytest.CaptureFixture[str]
) -> tuple[int, str, str]:
    list_file = root.with_name(root.name + "-allow.txt")  # outside the searched tree
    list_file.write_text(allow)
    code = residuo.main(["--root", str(root), "--allow", str(list_file)])
    out = capsys.readouterr()
    return code, out.out, out.err


def test_parse_allow_accepts_a_valid_line_and_skips_comments() -> None:
    found, problems = residuo.parse_allow(
        "# c\n\nbench/* | Math\\.PI | falso-positivo | why | with bar\nx/* | * | upstream | r\n"
    )
    assert problems == []
    assert found[0].glob == "bench/*"
    assert found[0].regex is not None and found[0].regex.pattern == "Math\\.PI"
    assert found[0].reason == "why | with bar"
    assert found[0].line == 3
    assert found[1].regex is None


@pytest.mark.parametrize(
    ("row", "needle"),
    [
        ("only | three | fields", "expected"),
        ("a/b | x | upstream | ", "expected"),
        ("**/x | x | upstream | r", "too generic"),
        ("a/**/x | x | upstream | r", "too generic"),
        ("*.md | x | upstream | r", "too generic"),
        ("a/b | x | defeito | r", "class"),
        ("a/b | ( | upstream | r", "bad regex"),
    ],
)
def test_parse_allow_reports_bad_lines(row: str, needle: str) -> None:
    found, problems = residuo.parse_allow(row + "\n")
    assert found == []
    assert len(problems) == 1 and needle in problems[0]


@pytest.mark.parametrize(
    "path",
    [
        "LICENSE",
        "packages/tui/CHANGELOG.md",
        "README.md",
        "docs/migration/nycode-core/00.md",
        "docs/harness/pi-x.md",
        "docs/fork/a.md",
        "scripts/ci/lint/residuo/residuo.py",
    ],
)
def test_exempt_paths(path: str) -> None:
    assert residuo.exempt(path)


@pytest.mark.parametrize(
    "path", ["packages/tui/README.md", "docs/specs/a.md", "src/from-pi.ts"]
)
def test_other_paths_are_not_exempt(path: str) -> None:
    assert not residuo.exempt(path)


def test_check_covers_only_the_spans_a_regex_matched() -> None:
    found, _ = residuo.parse_allow(
        "a/* | Math\\.PI | falso-positivo | r\nb.md | * | upstream | r\n"
        "c.md | earendil-works/pi/issues/\\d+ | upstream | r\n"
    )
    hits = [
        residuo.Hit("a/x.ts", 1, "Math.PI * 2"),
        residuo.Hit("a/y.ts", 2, "Math.PI and pi"),  # second word not covered
        residuo.Hit("b.md", 3, "pi earendil"),
        residuo.Hit("d.md", 4, "pi.dev"),
        residuo.Hit("c.md", 5, "see earendil-works/pi/issues/9 and pi"),
    ]
    bad, used, per_class = residuo.check(hits, found)
    assert [(h.path, h.line) for h in bad] == [("a/y.ts", 2), ("d.md", 4), ("c.md", 5)]
    assert used == {1, 2, 3}
    assert per_class == {"falso-positivo": 1, "upstream": 1}


def test_a_line_that_covers_a_match_first_owns_it() -> None:
    found, _ = residuo.parse_allow("a/* | * | upstream | r\na/* | pi | upstream | r\n")
    _, used, _ = residuo.check([residuo.Hit("a/x", 1, "pi")], found)
    assert used == {1}


def test_a_hit_the_regex_cannot_see_stays_open() -> None:
    assert residuo.Hit("a", 1, "no word here").spans == [(0, 12)]


def test_search_flags_the_retired_nycode_harness_name(tmp_path: Path) -> None:
    put(tmp_path, "src/a.ts", "// nycode-harness\n")
    put(tmp_path, "src/b.ts", "// nycode-harnessed nycode\n")  # another word: not a hit
    hits, _ = residuo.search(tmp_path)
    assert [(h.path, h.line) for h in hits] == [("src/a.ts", 1)]


def test_search_flags_the_ny_pi_name(tmp_path: Path) -> None:
    put(tmp_path, "src/a.ts", "// ny-pi\n")
    hits, _ = residuo.search(tmp_path)
    assert [(h.path, h.line) for h in hits] == [("src/a.ts", 1)]


def test_search_skips_exempt_files(tmp_path: Path) -> None:
    put(tmp_path, "src/a.ts", "const x = pi;\n")
    put(tmp_path, "docs/fork/b.sh", "pi\n")
    put(tmp_path, "docs/migration/c.md", "earendil\n")
    put(tmp_path, "README.md", "pi\n")
    put(tmp_path, "clean.txt", "nothing, nycode, pizza, spice\n")
    put(tmp_path, "Math.txt", "Math.PI\n")
    hits, tool = residuo.search(tmp_path)
    assert sorted((h.path, h.line) for h in hits) == [("Math.txt", 1), ("src/a.ts", 1)]
    assert tool == ("rg" if HAS_RG else "git grep")


@pytest.mark.skipif(not HAS_RG, reason="rg missing")
def test_search_ignores_a_piped_stdin(tmp_path: Path) -> None:
    # In CI stdin is a pipe, not a TTY: rg without a path would search stdin and find nothing.
    put(tmp_path, "src/a.ts", "x pi\n")
    script = Path(residuo.__file__)
    code = (
        f"import sys; sys.path.insert(0, {str(script.parent)!r}); import residuo; "
        f"print(len(residuo.search(__import__('pathlib').Path({str(tmp_path)!r}))[0]))"
    )
    done = subprocess.run(
        [sys.executable, "-c", code],
        input="",
        capture_output=True,
        text=True,
        check=True,
    )
    assert done.stdout.strip() == "1"


@pytest.mark.skipif(not HAS_GIT, reason="git missing")
def test_search_falls_back_to_git_grep(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    put(tmp_path, "src/a.ts", "pi-code and Mariozechner\n")
    put(tmp_path, ".gitignore", "ignored.txt\n")
    put(tmp_path, "ignored.txt", "pi\n")
    real = shutil.which
    monkeypatch.setattr(
        shutil, "which", lambda name: None if name == "rg" else real(name)
    )
    hits, tool = residuo.search(tmp_path)
    assert tool == "git grep"
    assert [(h.path, h.line) for h in hits] == [("src/a.ts", 1)]
    assert len(hits[0].spans) == 2


def test_search_without_any_tool_is_an_error(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(shutil, "which", lambda name: None)
    with pytest.raises(residuo.SearchError):
        residuo.search(tmp_path)


def test_main_ok_reports_counts_per_class(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    put(tmp_path, "a/x.ts", "Math.PI\n")
    code, out, err = run(tmp_path, "a/* | Math\\.PI | falso-positivo | r\n", capsys)
    assert code == 0
    assert "residuo OK: 1 lines covered by 1 exceptions" in out
    assert "falso-positivo: 1 exceptions, 1 lines" in out
    assert "search via" in err


def test_main_fails_on_a_new_line(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    put(tmp_path, "a/x.ts", "Math.PI\n")
    put(tmp_path, "src/new.ts", "// the pi tells\n")
    code, out, _ = run(tmp_path, "a/* | Math\\.PI | falso-positivo | r\n", capsys)
    assert code == 1
    assert "src/new.ts:1: // the pi tells" in out
    assert "residuo FAIL: 1 uncovered lines, 0 list problems" in out


def test_main_fails_on_a_stale_exception(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    put(tmp_path, "a/x.ts", "Math.PI\n")
    code, out, _ = run(
        tmp_path,
        "a/* | Math\\.PI | falso-positivo | r\ngone/* | * | upstream | r\n",
        capsys,
    )
    assert code == 1
    assert "allow:2: stale, `gone/*` covers no hit" in out


def test_main_fails_on_an_invalid_list(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    put(tmp_path, "a/x.ts", "ok\n")
    code, out, _ = run(tmp_path, "**/x | * | upstream | r\n", capsys)
    assert code == 1
    assert "too generic" in out


def test_main_exit_2_when_the_list_is_unreadable(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    code = residuo.main(
        ["--root", str(tmp_path), "--allow", str(tmp_path / "missing.txt")]
    )
    assert code == 2
    assert "residuo:" in capsys.readouterr().err


def test_main_exit_2_when_the_search_fails(
    tmp_path: Path, capsys: pytest.CaptureFixture[str], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(shutil, "which", lambda name: None)
    code, _, err = run(tmp_path, "", capsys)
    assert code == 2
    assert "neither rg nor git" in err


def test_run_reports_a_tool_failure(tmp_path: Path) -> None:
    with pytest.raises(residuo.SearchError):
        residuo._run(["git", "grep", "--no-such-flag"], tmp_path)
