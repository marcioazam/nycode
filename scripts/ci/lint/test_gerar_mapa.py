"""The migration map generator (docs/migration/nycode-core/anexos/gerar-mapa.py): overrides, rules, TSV and summary."""

import importlib.util
import io
import sys
from pathlib import Path
from types import ModuleType

import pytest

SCRIPT = (
    Path(__file__).resolve().parents[3]
    / "docs/migration/nycode-core/anexos/gerar-mapa.py"
)


def load() -> ModuleType:
    spec = importlib.util.spec_from_file_location("gerar_mapa", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run(
    monkeypatch: pytest.MonkeyPatch, paths: list[str], *args: str
) -> tuple[int, ModuleType]:
    module = load()
    monkeypatch.setattr(sys, "argv", ["gerar-mapa", *args])
    monkeypatch.setattr(sys, "stdin", io.StringIO("\n".join(paths) + "\n\n"))
    return module.main(), module


def test_override_wins_over_the_rule_that_would_match() -> None:
    module = load()
    compiled = [
        (rid, module.re.compile(rx), dest, act, ph)
        for rid, rx, dest, act, ph in module.RULES
    ]
    # E28 would keep the pi- name; the override has the renamed gate (D-61)
    assert module.classify("claude-home/bin/tests/pi-ui-final-gate.sh", compiled) == (
        "scripts/harness/ui-gates/nycode-ui-final-gate.sh",
        "converter",
        "F7",
        "E28",
    )
    # replay.test.ts is a removal: it only reverts and reapplies the patch stack
    replay = "claude-home/patches/pi-code/zzzzzzz-subagent-model-effort/replay.test.ts"
    assert module.classify(replay, compiled) == (
        "(sem pilha de patches)",
        "remover",
        "F6",
        "P16",
    )


def test_x01_removes_what_nothing_in_nycode_reads() -> None:
    module = load()
    compiled = [
        (rid, module.re.compile(rx), dest, act, ph)
        for rid, rx, dest, act, ph in module.RULES
    ]
    for path in (
        "claude-home/bin/evals/plan_ab.py",
        "claude-home/bin/evals/plan_ab_cases.jsonl",
        "claude-home/bin/evals/test_plan_ab.py",
        "claude-home/bin/evals/harbor/run.sh",
        "claude-home/bin/evals/harbor/README.md",
    ):
        row = module.classify(path, compiled)
        assert row and row[1:] == ("remover", "F3", "X01")
    # structure and the Harbor agents are converted, with their tests
    assert module.classify("claude-home/bin/structure/structure.py", compiled) == (
        "packages/coding-agent/resources/bin/structure/structure.py", "converter", "F3", "C09"
    )  # fmt: skip
    for path, dest in (
        ("claude-home/bin/structure/test_structure.py", "packages/coding-agent/resources/bin/structure/test_structure.py"),
        ("claude-home/bin/evals/harbor/bundle.sh", "bench/harbor/pi_bundle.sh"),
        ("claude-home/bin/evals/harbor/pi_harness_agent.py", "bench/harbor/pi_harness_agent.py"),
        ("claude-home/bin/evals/harbor/tests/test_pi_vanilla_api_agent.py", "bench/tests/harbor/test_pi_vanilla_api_agent.py"),
    ):  # fmt: skip
        row = module.classify(path, compiled)
        assert row and row[:3] == (dest, "converter", "F3")
    assert module.classify("no/such/rule.xyz", compiled) is None


def test_main_prints_the_tsv_and_fails_on_a_path_without_rule(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    code, _ = run(monkeypatch, ["README.md", "no/such/rule.xyz"])
    out = capsys.readouterr()
    assert code == 1
    assert out.out.splitlines() == [
        "origem\tdestino\tacao\tfase\tregra",
        "README.md\tREADME.md\tfundir\tF2\tG01",
    ]
    assert "SEM REGRA: no/such/rule.xyz" in out.err


def test_resumo_counts_per_rule_and_per_phase(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    paths = ["README.md", "CODE_OF_CONDUCT.md", "SUPPORT.md", "LICENSE"]
    code, _ = run(monkeypatch, paths, "--resumo", "abc1234")
    lines = capsys.readouterr().out.splitlines()
    assert code == 0
    assert lines[0].startswith("<!-- Gerado por gerar-mapa.py")
    assert "abc1234 (4 arquivos)" in lines[0]
    assert (
        "| G03 | 2 | `^(CODE_OF_CONDUCT\\|SUPPORT)\\.md$` | `$1.md` | mover | F2 |"
        in lines
    )
    assert "| F2 | 2 | 0 | 1 | 0 | 1 | 4 |" in lines
    assert lines[-1] == "| **Total** | 2 | 0 | 1 | 0 | 1 | **4** |"


def test_onda9_paths_follow_the_standard_input_and_are_counted_apart(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    tmp_path: Path,
) -> None:
    extra = tmp_path / "onda9.txt"
    extra.write_text("claude-home/bin/session-transport/cli.py\n\n")
    code, _ = run(monkeypatch, ["README.md"], "--onda9", str(extra))
    assert code == 0
    assert capsys.readouterr().out.splitlines()[1:] == [
        "README.md\tREADME.md\tfundir\tF2\tG01",
        (
            "claude-home/bin/session-transport/cli.py\t"
            "packages/coding-agent/resources/bin/session-transport/cli.py\tconverter\tF8\tR19"
        ),
    ]
    code, _ = run(
        monkeypatch, ["README.md"], "--onda9", str(extra), "--resumo", "abc1234"
    )
    head = capsys.readouterr().out.splitlines()
    assert code == 0
    assert "abc1234 (1 arquivos) e da lista da onda 9 (1 arquivos)" in head[0]
    assert "**2** (1 do nycode-harness e 1 da onda 9)" in head[3]


ANEXOS = SCRIPT.parent
REPO = Path(__file__).resolve().parents[3]


def committed_rows() -> list[list[str]]:
    lines = (
        (ANEXOS / "E-mapa-arquivo-a-arquivo.tsv")
        .read_text(encoding="utf-8")
        .splitlines()
    )
    assert lines[0] == "origem\tdestino\tacao\tfase\tregra"
    return [line.split("\t") for line in lines[1:]]


def test_the_committed_map_is_the_script_output_row_by_row() -> None:
    """The TSV is never edited by hand: every row is what classify() gives for its origin."""
    module = load()
    compiled = [
        (rid, module.re.compile(rx), dest, act, ph)
        for rid, rx, dest, act, ph in module.RULES
    ]
    rows = committed_rows()
    assert [
        row for row in rows if tuple(row[1:]) != module.classify(row[0], compiled)
    ] == []
    onda9 = (ANEXOS / "E-onda9-caminhos.txt").read_text(encoding="utf-8").split()
    assert [row[0] for row in rows[-len(onda9) :]] == onda9


def test_every_destination_of_the_committed_map_exists() -> None:
    """Destinations are paths in this repository, except removals and descriptions in parentheses."""
    missing = [
        (origin, dest)
        for origin, dest, action, _, _ in committed_rows()
        if action != "remover"
        and not dest.startswith("(")
        and not (REPO / dest.split(" ")[0]).exists()
    ]
    assert missing == []
