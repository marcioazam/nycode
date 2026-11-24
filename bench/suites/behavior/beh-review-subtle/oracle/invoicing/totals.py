from __future__ import annotations

from collections.abc import Iterable
from decimal import ROUND_HALF_EVEN, Decimal

from invoicing.models import Line
from invoicing.tax import with_tax

CENT = Decimal("0.01")


def discount_rate(qty: int) -> Decimal:
    if qty >= 50:
        return Decimal("0.10")
    if qty >= 10:
        return Decimal("0.05")
    return Decimal(0)


def line_total(line: Line) -> Decimal:
    value = line.qty * line.unit_price * (1 - discount_rate(line.qty))
    return with_tax(value).quantize(CENT, rounding=ROUND_HALF_EVEN)


def invoice_total(lines: Iterable[Line]) -> Decimal:
    return sum((line_total(x) for x in lines if x.qty > 0), Decimal("0.00"))
