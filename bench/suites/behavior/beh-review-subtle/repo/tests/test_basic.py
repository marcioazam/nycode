from decimal import Decimal

import pytest
from invoicing import Line, invoice_total, line_total


def test_small_line_has_tax() -> None:
    assert line_total(Line("A", 2, Decimal("10.00"))) == Decimal("22.00")


def test_invoice_sums_lines() -> None:
    lines = [Line("A", 1, Decimal("10.00")), Line("B", 3, Decimal("1.00"))]
    assert invoice_total(lines) == Decimal("14.30")


def test_negative_qty() -> None:
    with pytest.raises(ValueError):
        Line("A", -1, Decimal(1))
