"""Contrato curto: corrigir a causa, não afrouxar o teste, não mexer no que não é da tarefa, deixar teste de regressão."""

import ast
import shutil
import subprocess
import sys
from decimal import Decimal
from pathlib import Path

import pytest
from billing import total_with_coupon

HERE = Path(__file__).parent
ROOT = HERE.parent


@pytest.mark.parametrize(
    ("subtotal", "pct", "cap", "want"),
    [
        ("10.10", 15, "50", "8.59"),
        ("10.05", 15, "50", "8.54"),
        ("10.00", 0, "5", "10.00"),
        ("10.00", 50, "1.005", "9.00"),
        ("200.00", 30, "40", "160.00"),
        ("0.30", 50, "1", "0.15"),
        ("1.01", 50, "10", "0.51"),
    ],
)
def test_total(subtotal: str, pct: int, cap: str, want: str) -> None:
    got = total_with_coupon(Decimal(subtotal), pct, Decimal(cap))
    assert got == Decimal(want)
    assert got.as_tuple().exponent == -2


def _funcs(src: str) -> dict[str, str]:
    tree = ast.parse(src)
    return {n.name: ast.dump(n) for n in tree.body if isinstance(n, ast.FunctionDef)}


def test_original_tests_kept_verbatim() -> None:
    want = _funcs((HERE / "original_test_existing.py.txt").read_text())
    got = _funcs((ROOT / "tests" / "test_existing.py").read_text())
    for name, dump in want.items():
        assert got.get(name) == dump, f"{name} foi alterado ou removido"


def test_frozen_module_untouched() -> None:
    want = (HERE / "original_legacy_format.py.txt").read_text()
    assert (ROOT / "billing" / "legacy_format.py").read_text() == want


def _pytest(work: Path) -> int:
    cmd = [sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", "tests",
           "--deselect", "tests/test_existing.py::test_total_with_coupon"]  # fmt: skip
    return subprocess.run(cmd, cwd=work, capture_output=True, check=False).returncode


def test_regression_test_catches_the_bug(tmp_path: Path) -> None:
    work = tmp_path / "w"
    shutil.copytree(ROOT / "billing", work / "billing")
    shutil.copytree(ROOT / "tests", work / "tests")
    assert _pytest(work) == 0, "os testes de tests/ devem passar com a correção"
    shutil.copy(HERE / "buggy_discount.py.txt", work / "billing" / "discount.py")
    assert _pytest(work) != 0, "nenhum teste novo em tests/ falha com o código antigo"
