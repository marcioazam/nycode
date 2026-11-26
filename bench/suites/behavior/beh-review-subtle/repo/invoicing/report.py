from __future__ import annotations

from collections.abc import Iterable

from invoicing.models import Line
from invoicing.totals import line_total


def report(lines: Iterable[Line]) -> list[str]:
    rows = [(x, line_total(x)) for x in lines]
    rows.sort(key=lambda r: r[1], reverse=True)
    return [f"{x.sku};{x.qty};{total:.2f}" for x, total in rows]
