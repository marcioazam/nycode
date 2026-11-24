"""rename.py on a throwaway git repository: content, paths, skipped files, repository URL rule and --dry."""

import re
import subprocess
import sys
from pathlib import Path

import pytest

RENAME = Path(__file__).resolve().parents[1] / "rename.py"
GIT = ["git", "-c", "user.name=t", "-c", "user.email=t@t"]
TEXT = (
    "pi uses PI_HOME with @earendil-works/pi-ai from https://github.com/earendil-works/pi\n"
    "kept: pi.dev and https://github.com/earendil-works/pi/issues/12 and @earendil-works/gondolin\n"
)


@pytest.fixture
def repo(tmp_path: Path) -> Path:
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "pi-tool.ts").write_text("export const pi = 1;\n")
    (tmp_path / "pi.md").write_text(TEXT)
    (tmp_path / "CHANGELOG.md").write_text("pi 1.0\n")
    (tmp_path / "data.jsonl").write_text("pi\n")
    (tmp_path / "blob.bin").write_bytes(b"pi\x00pi")
    (tmp_path / "latin.txt").write_bytes(b"pi \xff")
    subprocess.run(["git", "init", "-q", str(tmp_path)], check=True)
    subprocess.run([*GIT, "-C", str(tmp_path), "add", "-A"], check=True)
    return tmp_path


def run(repo: Path, *extra: str) -> str:
    out = subprocess.run(
        [sys.executable, str(RENAME), str(repo), *extra],
        check=True,
        capture_output=True,
        text=True,
    )
    return out.stdout


def test_renames_content_paths_and_keeps_exceptions(repo: Path) -> None:
    out = run(repo)
    assert out.splitlines()[0] == "arquivos de conteudo alterados: 2"
    assert (repo / "src" / "nycode-tool.ts").read_text() == "export const nycode = 1;\n"
    assert not (repo / "src" / "pi-tool.ts").exists()
    assert (repo / "nycode.md").read_text() == (
        "nycode uses NYCODE_HOME with @nycode/ai from https://github.com/marcioazam/nycode\n"
        "kept: pi.dev and https://github.com/earendil-works/pi/issues/12 and @earendil-works/gondolin\n"
    )
    for name, content in [
        ("CHANGELOG.md", b"pi 1.0\n"),
        ("data.jsonl", b"pi\n"),
        ("blob.bin", b"pi\x00pi"),
        ("latin.txt", b"pi \xff"),
    ]:
        assert (repo / name).read_bytes() == content


def test_repository_url_is_marcioazam_nycode_not_nycode_cli(repo: Path) -> None:
    run(repo)
    text = (repo / "nycode.md").read_text()
    assert "marcioazam/nycode\n" in text
    assert "nycode-cli" not in text


def test_dry_run_changes_nothing_and_counts_to_stdout(repo: Path) -> None:
    out = run(repo, "--dry")
    assert (repo / "src" / "pi-tool.ts").exists()
    assert (repo / "pi.md").read_text() == TEXT
    assert "mv pi.md -> nycode.md" in out
    assert re.search(r"^ +\d+  \S", out, re.MULTILINE)  # the counted fragments


@pytest.fixture
def internals(tmp_path: Path) -> Path:
    files = {
        "src/a.ts": (
            "const x = fold(pi); entry?.pi; // the pi-code pack, as pi 1.5.2 did\n"
            "env PI_CODE_SUBAGENT PI_CODING_AGENT_DIR PI_HOME, dir .pi/skills, upstream pi\n"
            "// Working contract (pi) vs (nycode)\n"
            "`nycode migrate from-pi` reads docs/harness/pi-hooks.md\n"
        ),
        "packages/coding-agent/src/migrations/from-pi.ts": "const dir = '.pi';\n",
        "docs/specs/0001.md": "pi\n",
        "docs/bench/r.md": "pi\n",
        "README.md": "pi\n",
        ".gitleaksignore": "pi\n",
        "scripts/fork/x.sh": "pi\n",
    }
    for rel, text in files.items():
        (tmp_path / rel).parent.mkdir(parents=True, exist_ok=True)
        (tmp_path / rel).write_text(text)
    subprocess.run(["git", "init", "-q", str(tmp_path)], check=True)
    subprocess.run([*GIT, "-C", str(tmp_path), "add", "-A"], check=True)
    return tmp_path


def test_internals_are_renamed_but_legacy_names_stay(internals: Path) -> None:
    run(internals, "--fork")
    assert (internals / "src/a.ts").read_text() == (
        "const x = fold(nycode); entry?.nycode; // the nycode pack, as upstream 1.5.2 did\n"
        "env PI_CODE_SUBAGENT PI_CODING_AGENT_DIR NYCODE_HOME, dir .pi/skills, upstream agent\n"
        "// Working contract (pi) vs (nycode)\n"
        "`nycode migrate from-pi` reads docs/harness/pi-hooks.md\n"
    )


def test_declared_paths_are_left_untouched(internals: Path) -> None:
    run(internals, "--fork")
    for rel in [
        "packages/coding-agent/src/migrations/from-pi.ts",
        "docs/specs/0001.md",
        "docs/bench/r.md",
        "README.md",
        ".gitleaksignore",
        "scripts/fork/x.sh",
    ]:
        assert (internals / rel).exists(), rel
        assert "nycode" not in (internals / rel).read_text(), rel


def test_attribution_and_escaped_slash_names_stay(tmp_path: Path) -> None:
    text = (
        "// Adapted from earendil-works/pi (MIT)\n"
        "const R = /github\\.com\\/(?:badlogic|earendil-works)\\/pi-mono(?=\\/|$)/;\n"
        "match(/@earendil-works\\/pi-server\\/unix is not declared/);\n"
        "see https://github.com/earendil-works/pi\n"
    )
    (tmp_path / "a.ts").write_text(text)
    subprocess.run(["git", "init", "-q", str(tmp_path)], check=True)
    subprocess.run([*GIT, "-C", str(tmp_path), "add", "-A"], check=True)
    run(tmp_path, "--fork")
    assert (tmp_path / "a.ts").read_text() == text.replace(
        "github.com/earendil-works/pi", "github.com/marcioazam/nycode"
    )


def test_default_mode_renames_the_upstream_config_dir_and_env(tmp_path: Path) -> None:
    (tmp_path / "a.ts").write_text("dir .pi/settings.json and PI_CODING_AGENT_DIR\n")
    subprocess.run(["git", "init", "-q", str(tmp_path)], check=True)
    subprocess.run([*GIT, "-C", str(tmp_path), "add", "-A"], check=True)
    run(tmp_path)
    assert (
        tmp_path / "a.ts"
    ).read_text() == "dir .nycode/settings.json and NYCODE_CODING_AGENT_DIR\n"


def test_default_mode_renames_readme_and_github_but_fork_mode_skips_them(
    tmp_path: Path,
) -> None:
    for mode in ([], ["--fork"]):
        root = tmp_path / ("fork" if mode else "default")
        (root / ".github").mkdir(parents=True)
        (root / "README.md").write_text("pi\n")
        (root / ".github" / "ci.yml").write_text("pi\n")
        subprocess.run(["git", "init", "-q", str(root)], check=True)
        subprocess.run([*GIT, "-C", str(root), "add", "-A"], check=True)
        run(root, *mode)
        expected = "pi\n" if mode else "nycode\n"
        assert (root / "README.md").read_text() == expected
        assert (root / ".github" / "ci.yml").read_text() == expected


def test_version_statement_is_nycode_by_default_and_upstream_with_fork(
    tmp_path: Path,
) -> None:
    for mode in ([], ["--fork"]):
        root = tmp_path / ("fork" if mode else "default")
        root.mkdir()
        (root / "a.md").write_text("pi 1.6.0\n")
        subprocess.run(["git", "init", "-q", str(root)], check=True)
        subprocess.run([*GIT, "-C", str(root), "add", "-A"], check=True)
        run(root, *mode)
        assert (root / "a.md").read_text() == (
            "upstream 1.6.0\n" if mode else "nycode 1.6.0\n"
        )
