from __future__ import annotations

from collections.abc import Iterable
from decimal import Decimal

from invoicing.models import Line
from invoicing.money import to_cents
from invoicing.tax import with_tax


def line_total(line: Line) -> Decimal:
    subtotal = to_cents(line.qty * line.unit_price)
    return to_cents(with_tax(subtotal))


def invoice_total(lines: Iterable[Line]) -> Decimal:
    return sum((line_total(x) for x in lines), Decimal("0.00"))
