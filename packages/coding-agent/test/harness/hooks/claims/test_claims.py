"""Plano de testes 5: o veredito de claims.py liga edição, teste e alegação "os testes passam".
Rodar: python3 -m pytest packages/coding-agent/test/harness/hooks/claims -q"""

import importlib.util
from pathlib import Path
from typing import Any

SPEC = importlib.util.spec_from_file_location(
    "claims",
    Path(__file__).resolve().parents[4]
    / "resources"
    / "hooks"
    / "claims"
    / "claims.py",
)
assert SPEC and SPEC.loader
claims = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(claims)

CLAIM = "Todos os testes passam."
EDIT = claims.record("Edit", {"file_path": "a.py"}, False, "", "")


def run_tests(ok: bool) -> Any:
    """Um `pytest` terminado: saída verde ou vermelha, como o PostToolUse a registra."""
    out = "3 passed in 0.1s" if ok else "1 failed, 2 passed in 0.1s"
    return claims.record(
        "Bash",
        {"command": "python3 -m pytest -q"},
        not ok,
        "" if ok else "Exit code 1",
        out,
    )


def judge(*events: object, text: str = CLAIM) -> Any:
    found = claims.find_claims(text)
    assert found, text
    return claims.verdict(found, list(events), [])


def test_the_ledger_records_edits_and_runs() -> None:
    assert EDIT == {"k": "edit"}
    assert run_tests(True) == {
        "k": "test",
        "t": "Bash",
        "r": "pytest",
        "ok": True,
        "x": None,
    }
    assert run_tests(False)["ok"] is False


def test_edit_then_failing_test_then_claim_without_evidence_is_unsupported() -> None:
    status, reason = judge(EDIT, run_tests(False))
    assert status == "unsupported"
    assert reason.startswith("last-run-failed")


def test_edit_then_passing_test_then_claim_is_supported() -> None:
    assert judge(EDIT, run_tests(True)) == ("supported", "test-run-ok")


def test_an_edit_after_the_test_invalidates_it() -> None:
    assert judge(EDIT, run_tests(True), EDIT) == ("unsupported", "no-run-since-edit")


def test_claim_with_no_run_at_all_is_unsupported() -> None:
    assert judge(EDIT) == ("unsupported", "no-run-since-edit")


def test_a_later_green_run_after_a_red_one_supports_the_claim() -> None:
    assert judge(EDIT, run_tests(False), run_tests(True))[0] == "supported"


def test_no_evidence_source_is_unknown() -> None:
    assert claims.verdict(claims.find_claims(CLAIM), None, []) == (
        "unknown",
        "no-evidence-source",
    )
