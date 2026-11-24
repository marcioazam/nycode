from __future__ import annotations

from collections.abc import Iterable

from invoicing.models import Line
from invoicing.totals import line_total


def report(lines: Iterable[Line]) -> list[str]:
    return [f"{x.sku};{x.qty};{line_total(x):.2f}" for x in lines if x.qty > 0]
