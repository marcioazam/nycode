"""Arm `nycode` (09 §2.2): definition, dry-run, stage lookup and the arm scripts. No
network, no spend: the stage is pre-built (`.ready`) and the binary is a fake."""

import hashlib
import json
import subprocess
from pathlib import Path

from bench import run as rb
from bench.tests.helpers import BENCH, CF, MP, RA, script

FAKE_BIN = """
echo "HOME=$HOME"
echo "NYCODE_CODING_AGENT_DIR=$NYCODE_CODING_AGENT_DIR"
echo "NYCODE_SKIP_VERSION_CHECK=${NYCODE_SKIP_VERSION_CHECK:-}"
env | grep -E '^(ANTHROPIC_|CLAUDE_CODE_OAUTH)' | sort
for a in "$@"; do echo "ARG:$a"; done
"""


def arms() -> dict[str, dict[str, object]]:
    return rb.load_toml(BENCH / "arms.toml")


def test_nycode_arm_definition() -> None:
    a = arms()["nycode"]
    assert a["runner"] == "run_pi.py" and a["bin"] == "arms/nycode"
    assert a["stage_prefix"] == "bench-nycode"
    assert (BENCH / "arms/nycode").stat().st_mode & 0o111


def test_dry_run_nycode_smoke_and_stage_prefix(monkeypatch: MP, capsys: CF) -> None:
    monkeypatch.setenv("BENCH_STAGE_PREFIX", "restored-by-monkeypatch")
    assert rb.main(RA("nycode", "--dry-run", tier="smoke", budget="12")) == 0
    out = capsys.readouterr().out
    assert "arm=nycode tier=pr" in out and "nothing was executed" in out
    # the arm's stage_prefix reaches the arm script and its children
    import os

    assert os.environ["BENCH_STAGE_PREFIX"] == "bench-nycode"


def test_arm_meta_reads_overlay_sha_of_the_nycode_stage(
    tmp_path: Path, monkeypatch: MP
) -> None:
    d = tmp_path / "bench-nycode-abc123def456-dirty"
    d.mkdir()
    (d / ".overlay-sha").write_text("n1\n")
    (d / ".ready").touch()
    monkeypatch.setenv("BENCH_STAGE_ROOT", str(tmp_path))
    monkeypatch.delenv("BENCH_STAGE", raising=False)
    monkeypatch.setattr("bench.run.subprocess.run", lambda *a, **k: subprocess.CompletedProcess(a, 0, "abc123def456\n", ""))  # fmt: skip
    meta = rb.arm_meta("nycode", arms(), "pi", Path("/x/bin"), "m", 1.0)
    assert meta["overlay_sha"] == "n1"


def run_arm(tmp: Path, *args: str, **env: str) -> subprocess.CompletedProcess[str]:
    stage = tmp / "stage"
    stage.mkdir(exist_ok=True)
    (stage / ".ready").touch()
    creds = tmp / "cred.json"
    creds.write_text(
        '{"claudeAiOauth":{"accessToken":"oauth-fake","expiresAt":99999999999999}}'
    )
    key = tmp / "key"
    key.write_text("sk-ant-fake\n")
    fake = script(tmp / "fake", FAKE_BIN)
    base = {
        "PATH": "/usr/bin:/bin",
        "BENCH_STAGE": str(stage),
        "BENCH_NYCODE_BIN": str(fake),
        "BENCH_CC_CREDENTIALS": str(creds),
        "BENCH_REAL_HOME": str(tmp / "rh"),
        "BENCH_KEY": str(key),
    }
    return subprocess.run(
        ["bash", str(BENCH / "arms/nycode"), *args],
        env={**base, **env}, capture_output=True, text=True, check=False,
    )  # fmt: skip


def test_arm_runs_the_binary_in_a_throwaway_home(tmp_path: Path) -> None:
    p = run_arm(tmp_path, "-p", "hello")
    stage = tmp_path / "stage"
    assert p.returncode == 0, p.stderr
    assert f"HOME={stage}" in p.stdout
    assert f"NYCODE_CODING_AGENT_DIR={stage}/.nycode/agent" in p.stdout
    assert "NYCODE_SKIP_VERSION_CHECK=1" in p.stdout
    assert "ANTHROPIC_OAUTH_TOKEN=oauth-fake" in p.stdout
    assert "ARG:-p" in p.stdout and "ARG:hello" in p.stdout


def test_arm_drops_flags_only_pi_code_understood(tmp_path: Path) -> None:
    p = run_arm(
        tmp_path, "--settings", "s.json", "--mcp-config=m.json", "--strict-mcp-config",
        "--setting-sources", "user", "--add-dir", "d", "-p", "hi",
    )  # fmt: skip
    args = [ln for ln in p.stdout.splitlines() if ln.startswith("ARG:")]
    assert args == ["ARG:-p", "ARG:hi"], p.stderr


def test_arm_api_key_mode(tmp_path: Path) -> None:
    p = run_arm(
        tmp_path, "x", BENCH_API_KEY_FILE=str(tmp_path / "key"), BENCH_ANTHROPIC_WORKSPACE_ID="wrk_1",
        ANTHROPIC_OAUTH_TOKEN="leak",
    )  # fmt: skip
    assert "ANTHROPIC_API_KEY=sk-ant-fake" in p.stdout and "OAUTH" not in p.stdout
    models = (tmp_path / "stage/.nycode/agent/models.json").read_text()
    assert "wrk_1" in models


# sha256 of the mcp.json example (6 servers, no `exposure`, no `enabled`) the measured stage must carry.
MCP_EXAMPLE_SHA = "faf18e46c15a45b05b525859a4572ca446820dd070d5d2a72fe548bcfc826cc4"


def test_arm_writes_the_repo_mcp_json_example(
    tmp_path: Path,
) -> None:
    """D-40: every round is measured with the same mcp.json (6 servers, none with `exposure` or `enabled`)."""
    assert run_arm(tmp_path, "-p", "x", ANTHROPIC_API_KEY="leak").returncode == 0
    written = tmp_path / "stage/.nycode/agent/mcp.json"
    example = BENCH.parent / "packages/coding-agent/examples/config/mcp.json"
    assert written.read_bytes() == example.read_bytes()
    assert hashlib.sha256(written.read_bytes()).hexdigest() == MCP_EXAMPLE_SHA
    servers = json.loads(written.read_text())["mcpServers"]
    assert len(servers) == 6
    assert all("exposure" not in s and "enabled" not in s for s in servers.values())
    assert "leak" not in written.read_text()
    written.write_text("{}")  # an existing file is kept
    run_arm(tmp_path, "-p", "x")
    assert written.read_text() == "{}"


def test_arm_builds_with_the_ci_commands() -> None:
    text = (BENCH / "arms/nycode").read_text()
    assert "npm ci --ignore-scripts" in text and "npm run build" in text
    assert "packages/coding-agent/dist/bundle/cli.js" in text
    assert "install.sh" not in text and "PI_CODING_AGENT_DIR" not in text.replace("NYCODE_CODING_AGENT_DIR", "")  # fmt: skip
    assert "bench-nycode-" in text
