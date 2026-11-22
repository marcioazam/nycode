"""Bypasses reproduzidos da auditoria 2026-11-19 (seguranca 1-8, 16; perf 20) e não regressão do guard.
Em processo: guard.decide() com o ambiente limpo (modo legado, sem bypass). Só texto; nada é executado.
Rodar: python3 -m pytest claude-home/hooks/permissions/tests -q"""

import importlib.util
import json
import os
import subprocess
import sys
import time
from collections.abc import Callable
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

HOOKS = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..",
    "..",
    "..",
    "..",
    "resources",
    "hooks",
)
GUARD = os.path.join(HOOKS, "guard.py")
PROJECT = "/tmp/guard-project"


def load_guard() -> ModuleType:
    spec = importlib.util.spec_from_file_location("guard_bypass_under_test", GUARD)
    assert spec is not None and spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


GUARD_MOD = load_guard()


@pytest.fixture(autouse=True)
def clean_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for k in ("NYCODE_BYPASS_PERMISSIONS", "NYCODE_PERMISSION_MODE"):
        monkeypatch.delenv(k, raising=False)
    monkeypatch.setenv("CLAUDE_PROJECT_DIR", PROJECT)


def decision(tool: str, tool_input: dict[str, Any], cwd: str = PROJECT) -> str:
    r = GUARD_MOD.decide({"tool_name": tool, "tool_input": tool_input, "cwd": cwd})
    return "allow" if r is None else r[0]


def bash(cmd: str, cwd: str = PROJECT) -> str:
    return decision("Bash", {"command": cmd}, cwd)


@pytest.fixture()
def main_repo(tmp_path: Path) -> Path:
    (tmp_path / "repo" / ".git").mkdir(parents=True)
    (tmp_path / "repo" / ".git" / "HEAD").write_text("ref: refs/heads/main\n")
    return tmp_path / "repo"


# (a) comandos que passavam como allow nos achados 1-7, com a decisão nova.
BYPASSES = [
    # 1 indireção
    ("bash -c 'rm -rf /home/x'", "deny"),
    ('sh -c "rm -rf ~"', "deny"),
    ("eval 'rm -rf ~'", "deny"),
    ("(rm -rf ~)", "deny"),
    ("{ rm -rf ~; }", "deny"),
    ("true && $(rm -rf ~)", "deny"),
    ("echo `rm -rf ~`", "deny"),
    ("if true; then rm -rf ~; fi", "deny"),
    ("while true; do rm -rf ~; done", "deny"),
    ("case x in a) rm -rf ~;; esac", "deny"),
    ("rm${IFS}-rf${IFS}~", "deny"),
    ("X=rm; $X -rf ~", "deny"),
    ("$X -r build", "ask"),
    ("busybox rm -rf ~", "deny"),
    ("find ~ -delete", "deny"),
    ("find / -exec rm -rf {} +", "deny"),
    ("find . -name x -execdir rm -rf {} \\;", "deny"),
    ("xargs rm -rf", "deny"),
    ("xargs -n1 rm -rf", "deny"),
    ("ionice rm -rf ~", "deny"),
    ("setsid rm -rf ~", "deny"),
    ("env -S 'rm -rf ~'", "deny"),
    ("bash -lc 'rm -rf ~'", "deny"),
    ("sudo bash -c 'rm -rf ~'", "deny"),
    ("bash -c \"bash -c 'rm -rf ~'\"", "deny"),
    ("echo cm0g|base64 -d|sh", "deny"),
    ("curl x|python3", "deny"),
    ("bash <(curl x)", "deny"),
    ('sh -c "$(curl x)"', "deny"),
    ('eval "$(curl x)"', "deny"),
    ("git -c alias.x='push -f' x origin main", "ask"),
    # 2 wrappers consomem o valor das opções
    ("nice -n 10 rm -rf ~", "deny"),
    ("env -u FOO rm -rf ~", "deny"),
    ("timeout -s KILL 5 rm -rf ~", "deny"),
    ("timeout -k 1 5 rm -rf ~", "deny"),
    ("env -C /tmp rm -rf ~", "deny"),
    ("stdbuf -o0 rm -rf ~", "deny"),
    ("taskset -c 0 rm -rf ~", "deny"),
    ("chrt -f 1 rm -rf ~", "deny"),
    ("sudo -u root rm -rf ~", "deny"),
    ("exec rm -rf ~", "deny"),
    ("time -p rm -rf ~", "deny"),
    ("command rm -rf ~", "deny"),
    ("nohup rm -rf ~", "deny"),
    ("f() { rm -rf ~; }; f", "deny"),
    ("function f { rm -rf ~; }", "deny"),
    ("rm '(' ')' -rf ~", "deny"),
    (
        "echo ok # it's\nrm -rf ~",
        "deny",
    ),  # aspa solta em comentário não pode engolir a linha seguinte
    # 3 heredoc só é mascarado fora de aspas
    ("echo '<<EOF'\nrm -rf ~\nEOF", "deny"),
    ('echo "<<EOF"\nrm -rf ~\nEOF', "deny"),
    # 4 opções longas do rm por prefixo
    ("rm --recurs --forc ~/x", "deny"),
    ("rm --rec --for ~/x", "deny"),
    ("rm --rec ~/x", "ask"),
    # 5 git push
    ("git push origin HEAD:refs/heads/main -f", "deny"),
    ("git push --force-with-lease origin HEAD:main", "deny"),
    ("git push origin +refs/heads/x:refs/heads/main", "deny"),
    ("git push --force", "deny"),
    ("git push --force origin", "deny"),
    ("git push --force-if-includes origin", "deny"),
    ("git push --mirror", "deny"),
    # destino implícito = ramo atual (pode ser main): forçado nega como "sem refspec"
    ("git push -f origin HEAD", "deny"),
    ("git push --force-with-lease origin @", "deny"),
    ("git push origin +HEAD", "deny"),
    ("git push -f --all origin", "deny"),
    # 6 dispositivos
    ("echo x > /dev//sda", "deny"),
    ("echo x > /dev/./sda", "deny"),
    ("echo x > /dev/sr0", "deny"),
    ("echo x > /dev/mem", "deny"),
    ("echo x > /dev/vg0/root", "deny"),
    ("dd if=x of=/dev/shm/../sda", "deny"),
    ("tee /dev/sr0 < img", "deny"),
    ("cp img /dev/sr0", "deny"),
    ("echo x > /dev/sda", "deny"),
]

# (b) decisão idêntica à de antes da mudança (capturada antes de editar).
NON_REGRESSION = [
    ("bash -c 'echo oi'", "allow"),
    ('sh -c "ls -la"', "allow"),
    ("(cd src && ls)", "allow"),
    ("{ echo a; echo b; }", "allow"),
    ("echo $(date)", "allow"),
    ("if [ -f a ]; then cat a; fi", "allow"),
    ("for f in *.ts; do echo $f; done", "allow"),
    ("X=1; echo $X", "allow"),
    ("nice -n 10 make", "allow"),
    ("env FOO=1 node x.js", "allow"),
    ("timeout 30 npm test", "allow"),
    ("find . -name '*.pyc' -delete", "allow"),
    ("find . -name x -exec grep -l y {} +", "allow"),
    ("xargs -n1 echo", "allow"),
    ("echo a > /dev/null", "allow"),
    ("cmd 2>/dev/stderr", "allow"),
    ("cat <<EOF\nrm -rf /tmp/x\nEOF", "allow"),
    ("git push origin feature-x", "ask"),
    ("git push --force-with-lease origin feature-x", "ask"),
    ("curl -s https://x | jq .", "allow"),
    ("python3 -c 'print(1)'", "allow"),
    ("rm -r build", "ask"),
    # vizinhos que a indireção não pode transformar em ask/deny
    ("curl -s https://x | python3 -c 'import sys; print(sys.stdin.read())'", "allow"),
    ("echo aGk= | base64 -d | cat", "allow"),
    ("bash -c 'echo a; echo b' | cat", "allow"),
    ("echo '$(rm -rf ~)'", "allow"),
    ("cat <<'EOF'\nit's $(rm -rf ~)\nEOF\ncat <<EOF2\nrm -rf /\nEOF2", "allow"),
    ("git commit -m \"$(cat <<'EOF'\nDon't rm -rf / (1) fix\nEOF\n)\"", "allow"),
    ("echo a > /dev/stdout", "allow"),
    ("echo x > /dev/pts/0", "allow"),
]


@pytest.mark.parametrize(("cmd", "want"), BYPASSES, ids=[c[:60] for c, _ in BYPASSES])
def test_bypass_decisions(cmd: str, want: str, main_repo: Path) -> None:
    # an implicit push target is the current branch, read from HEAD: judge it from a checkout on main
    assert bash(cmd, cwd=str(main_repo)) == want


@pytest.mark.parametrize(
    ("cmd", "want"), NON_REGRESSION, ids=[c[:60] for c, _ in NON_REGRESSION]
)
def test_non_regression(cmd: str, want: str) -> None:
    assert bash(cmd) == want


@pytest.mark.parametrize("name", [".env.example", "src/app.ts", "README.md"])
def test_read_non_regression(name: str) -> None:
    assert decision("Read", {"file_path": f"{PROJECT}/{name}"}) == "allow"


def test_nesting_limit_asks() -> None:
    cmd = "echo hi"  # allow direto; só a profundidade (>5) o torna ask
    for _ in range(7):
        cmd = "bash -c " + json.dumps(cmd)
    assert bash(cmd) == "ask"


def test_nesting_within_limit_keeps_inner_decision() -> None:
    cmd = "rm -rf ~"
    for _ in range(3):
        cmd = "bash -c " + json.dumps(cmd)
    assert bash(cmd) == "deny"


# 16 / perf 20: custo limitado; acima do teto o comando vira ask, nunca allow silencioso.
def timed(cmd: str) -> tuple[str, float]:
    t = time.perf_counter()
    got = bash(cmd)
    return got, time.perf_counter() - t


def best_of_three(make: Callable[[int], str], n: int) -> float:
    cmd = make(n)
    return min(timed(cmd)[1] for _ in range(3))


def assert_scales_linearly(make: Callable[[int], str], n: int) -> None:
    """Linear means 4x the input costs about 4x the time: a quadratic cost would give 16x. Measured warm, best of 3,
    so a slow runner does not matter, only the growth does."""
    timed(make(n))  # warm-up
    small = max(best_of_three(make, n), 0.005)
    large = best_of_three(make, 4 * n)
    assert large / small < 8, (small, large)


def test_fork_bomb_regex_is_linear() -> None:
    # the line of finding 16: a command `aaa...` with arguments
    assert_scales_linearly(lambda n: "a" * n + " rm -rf /tmp/x", 10000)
    got, _ = timed("a" * 40000 + "; rm -rf /tmp/x")
    assert got == "deny"
    assert_scales_linearly(lambda n: "(){" * n, 5000)
    assert timed("(){" * 87_000)[0] in ("allow", "ask", "deny")  # about 256 KB


def test_heredocs_without_terminator_are_linear() -> None:
    assert_scales_linearly(
        lambda n: "".join(f"cat <<E{i}\nbody {i}\n" for i in range(n)), 400
    )


def test_real_heredoc_still_masked_and_fast() -> None:
    def heredoc(n: int) -> str:
        return "cat > f <<'EOF'\n" + "rm -rf /\n" * n + "EOF"

    assert timed(heredoc(10000))[0] == "allow"
    assert_scales_linearly(heredoc, 2500)


def test_forkbomb_forms_still_denied() -> None:
    assert bash(":(){ :|:& };:") == "deny"
    assert bash("bomb() { bomb | bomb & }; bomb") == "deny"
    assert bash("x;:(){ :|:& };:") == "deny"


def test_oversized_command_asks() -> None:
    assert bash("echo " + "a" * 300_000) == "ask"


# (c) D8: ver BYPASSES. D9 e D10 por subprocesso com HOME falso (a lista de segredos nasce do HOME).
def run_guard(
    payload: dict[str, Any], home: Path, extra_env: dict[str, str] | None = None
) -> str:
    env = {
        k: v
        for k, v in os.environ.items()
        if k not in ("NYCODE_BYPASS_PERMISSIONS", "NYCODE_PERMISSION_MODE")
    }
    env["HOME"] = str(home)
    env.update(extra_env or {})
    p = subprocess.run(
        [sys.executable, GUARD],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        env=env,
        timeout=10,
        check=False,
    )
    assert p.returncode == 0, p.stderr
    return (
        json.loads(p.stdout)["hookSpecificOutput"]["permissionDecision"]
        if p.stdout.strip()
        else "allow"
    )


@pytest.fixture()
def fake_home(tmp_path: Path) -> Path:
    home = tmp_path / "home"
    for rel in (
        ".ssh/id_rsa",
        ".aws/credentials",
        ".netrc",
        ".git-credentials",
        ".gnupg/key",
        ".config/gh/hosts.yml",
        ".docker/config.json",
        ".kube/config",
        ".npmrc",
        ".pypirc",
        ".nycode/agent/local.env",
        ".nycode/agent/auth.json",
        "work/notes.txt",
        "other/.env",
    ):
        f = home / rel
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text("x")
    (home / "proj").mkdir()
    return home


def read_as(home: Path, path: Path | str, cwd: Path | None = None) -> str:
    return run_guard(
        {
            "tool_name": "Read",
            "tool_input": {"file_path": str(path)},
            "cwd": str(cwd or home / "proj"),
        },
        home,
    )


@pytest.mark.parametrize(
    "rel",
    [
        ".aws/credentials",
        ".netrc",
        ".git-credentials",
        ".gnupg/key",
        ".config/gh/hosts.yml",
        ".docker/config.json",
        ".kube/config",
        ".npmrc",
        ".pypirc",
        ".nycode/agent/local.env",
    ],
)
def test_d9_credential_files_denied(fake_home: Path, rel: str) -> None:
    assert read_as(fake_home, fake_home / rel) == "deny"


def test_d9_proc_environ_denied(fake_home: Path) -> None:
    assert read_as(fake_home, "/proc/self/environ") == "deny"
    assert read_as(fake_home, "/proc/123/environ") == "deny"


def test_d9_symlink_to_denied_file_denied(fake_home: Path) -> None:
    link = fake_home / "proj" / "innocent.txt"
    link.symlink_to(fake_home / ".ssh" / "id_rsa")
    assert read_as(fake_home, link) == "deny"
    assert read_as(fake_home, fake_home / "work" / "notes.txt") == "allow"


def test_d9_symlinked_home_still_denied(tmp_path: Path) -> None:
    real = tmp_path / "real"
    (real / ".ssh").mkdir(parents=True)
    (real / ".ssh" / "id_rsa").write_text("x")
    home = tmp_path / "homelink"
    home.symlink_to(real)
    assert read_as(home, real / ".ssh" / "id_rsa") == "deny"
    assert read_as(home, home / ".ssh" / "id_rsa") == "deny"


def grep_as(home: Path, path: Path | str | None, cwd: Path | None = None) -> str:
    ti: dict[str, str] = (
        {"pattern": "KEY"} if path is None else {"pattern": "KEY", "path": str(path)}
    )
    return run_guard(
        {"tool_name": "Grep", "tool_input": ti, "cwd": str(cwd or home / "proj")}, home
    )


def test_d10_grep_denied_paths(fake_home: Path) -> None:
    assert grep_as(fake_home, fake_home / ".ssh") == "deny"  # diretório negado
    assert grep_as(fake_home, fake_home / ".ssh" / "id_rsa") == "deny"  # arquivo negado
    assert (
        grep_as(fake_home, fake_home / ".nycode" / "agent") == "deny"
    )  # guarda auth.json e local.env
    assert grep_as(fake_home, fake_home) == "deny"  # $HOME
    assert grep_as(fake_home, "/") == "deny"
    assert grep_as(fake_home, fake_home / ".aws") == "deny"  # guarda credentials
    assert grep_as(fake_home, fake_home / "other") == "deny"  # guarda .env


def test_d10_grep_allowed_and_symlink(fake_home: Path) -> None:
    assert grep_as(fake_home, fake_home / "work") == "allow"
    assert grep_as(fake_home, fake_home / "work" / "notes.txt") == "allow"
    assert grep_as(fake_home, None, cwd=fake_home / "work") == "allow"
    assert grep_as(fake_home, None, cwd=fake_home / "other") == "deny"  # sem path = cwd
    (fake_home / "proj" / "lnk").symlink_to(fake_home / ".ssh")
    assert grep_as(fake_home, fake_home / "proj" / "lnk") == "deny"


def test_d10_matcher_reaches_grep() -> None:
    ex = os.path.join(os.path.dirname(HOOKS), "instructions", "lite.settings.json")
    with open(ex, encoding="utf-8") as fh:
        matcher = json.load(fh)["hooks"]["PreToolUse"][0]["matcher"]
    parts = set(matcher.split("|"))
    assert {"Bash", "run", "Edit", "Write", "Read", "Grep"} <= parts


# Auditoria 2026-11-20. Vermelho = decide() devolve None (allow) no comportamento antigo.
AUDIT_2026_11_20 = [
    ("true <<EOF\n$(rm -rf /)\nEOF", "deny"),
    ("source /dev/stdin <<EOF\nrm -rf /\nEOF", "deny"),
    (". /dev/stdin <<EOF\nrm -rf /\nEOF", "deny"),
    ("r\\\nm -rf /", "deny"),
    ("builtin eval 'rm -rf /'", "deny"),
    ("builtin kill -9 -1", "deny"),
    ("coproc rm -rf /", "deny"),
    ("function f() { rm -rf /; }; f", "deny"),
    ('case ")" in *) rm -rf /;; esac', "deny"),
    ("bash -c -o errexit 'rm -rf /'", "deny"),
    ("env '-Srm -rf /'", "deny"),
]


@pytest.mark.parametrize(
    ("cmd", "want"), AUDIT_2026_11_20, ids=[c[:48] for c, _ in AUDIT_2026_11_20]
)
def test_audit_2026_11_20_payloads(cmd: str, want: str) -> None:
    assert bash(cmd) == want


def test_audit_payloads_stay_deny_under_bypass(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("NYCODE_BYPASS_PERMISSIONS", "1")
    monkeypatch.setenv("NYCODE_PERMISSION_MODE", "default")
    assert bash("rm -rf /") == "deny"
    for cmd, want in AUDIT_2026_11_20:
        assert bash(cmd) == want, cmd


def test_run_start_is_checked_and_unknown_action_is_deny(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("NYCODE_BYPASS_PERMISSIONS", "1")
    denied = GUARD_MOD.decide(
        {
            "tool_name": "run",
            "tool_input": {"action": "start", "command": "rm -rf /"},
            "cwd": PROJECT,
        }
    )
    assert denied is not None and denied[0] == "deny"
    unknown = GUARD_MOD.decide(
        {
            "tool_name": "run",
            "tool_input": {"action": "exec", "command": "true"},
            "cwd": PROJECT,
        }
    )
    assert unknown is not None and unknown[0] == "deny"
    listed = GUARD_MOD.decide(
        {"tool_name": "run", "tool_input": {"action": "list"}, "cwd": PROJECT}
    )
    assert listed is None


def test_uniq_operand_after_pipe_is_not_allow(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("NYCODE_PERMISSION_MODE", "default")
    monkeypatch.delenv("NYCODE_BYPASS_PERMISSIONS", raising=False)
    target = tmp_path / "guard.py"
    target.write_text("x")
    got = GUARD_MOD.decide(
        {
            "tool_name": "Bash",
            "tool_input": {"command": f"true | uniq - {target}"},
            "cwd": PROJECT,
        }
    )
    assert got is not None and got[0] != "allow"
    one = GUARD_MOD.decide(
        {
            "tool_name": "Bash",
            "tool_input": {"command": f"uniq - {target}"},
            "cwd": PROJECT,
        }
    )
    assert one is not None and one[0] != "allow"


def test_lite_matcher_blocks_on_failure() -> None:
    lite = json.loads(
        Path(os.path.dirname(HOOKS), "instructions", "lite.settings.json").read_text(
            encoding="utf-8"
        )
    )
    hook = lite["hooks"]["PreToolUse"][0]
    assert {"Bash", "run", "Edit", "Write", "Read", "Grep"} <= set(
        hook["matcher"].split("|")
    )
    assert hook["hooks"][0]["onFailure"] == "block"


def test_grep_ancestor_and_proc(fake_home: Path) -> None:
    assert grep_as(fake_home, fake_home / ".nycode") == "deny"
    assert grep_as(fake_home, "/proc") == "deny"
    assert grep_as(fake_home, "/proc/self") == "deny"
    assert grep_as(fake_home, fake_home / "work") == "allow"


def test_tmp_symlink_to_protected_file_is_deny(fake_home: Path, tmp_path: Path) -> None:
    secret = fake_home / ".nycode" / "agent" / "local.env"
    link = tmp_path / "innocent"
    link.symlink_to(secret)
    asked = run_guard(
        {
            "tool_name": "Write",
            "tool_input": {"file_path": str(link), "content": "x"},
            "cwd": "/tmp",
        },
        fake_home,
    )
    assert asked == "ask"
    guard = fake_home / ".nycode" / "agent" / "claude-home" / "hooks" / "guard.py"
    guard.parent.mkdir(parents=True, exist_ok=True)
    guard.write_text("print(1)\n")
    got_guard = run_guard(
        {
            "tool_name": "Write",
            "tool_input": {"file_path": str(guard), "content": "x"},
            "cwd": str(fake_home / "proj"),
        },
        fake_home,
        {"NYCODE_BYPASS_PERMISSIONS": "1", "NYCODE_PERMISSION_MODE": "default"},
    )
    assert got_guard == "deny"
