from decimal import Decimal

import pytest
from invoicing import Line, invoice_total, line_total, report


@pytest.mark.parametrize(
    ("qty", "price", "want"),
    [
        (9, "2.000", "19.80"),
        (10, "2.000", "20.90"),
        (49, "2.000", "102.41"),
        (50, "2.000", "99.00"),
        (51, "2.000", "100.98"),
        (1, "0.147", "0.16"),
        (1, "0.224", "0.25"),
        (12, "0.133", "1.67"),
        (50, "0.049", "2.43"),
    ],
)
def test_line_total(qty: int, price: str, want: str) -> None:
    assert line_total(Line("X", qty, Decimal(price))) == Decimal(want)


def test_tiers_are_inclusive_and_exclusive() -> None:
    assert line_total(Line("X", 10, Decimal(1))) == Decimal("10.45")
    assert line_total(Line("X", 50, Decimal(1))) == Decimal("49.50")


def test_zero_qty_out_of_total_and_report() -> None:
    lines = [Line("A", 0, Decimal(5)), Line("B", 1, Decimal(1))]
    assert invoice_total(lines) == Decimal("1.10")
    assert report(lines) == ["B;1;1.10"]


def test_report_keeps_input_order_with_ties() -> None:
    lines = [
        Line("C", 1, Decimal(1)),
        Line("A", 2, Decimal(5)),
        Line("B", 1, Decimal(1)),
        Line("D", 10, Decimal(1)),
    ]
    assert report(lines) == ["C;1;1.10", "A;2;11.00", "B;1;1.10", "D;10;10.45"]


def test_invoice_total_with_discounts() -> None:
    lines = [
        Line("A", 10, Decimal("0.133")),
        Line("B", 50, Decimal("0.049")),
        Line("C", 1, Decimal("0.147")),
    ]
    want = sum((line_total(x) for x in lines), Decimal(0))
    assert invoice_total(lines) == want == Decimal("3.98")
