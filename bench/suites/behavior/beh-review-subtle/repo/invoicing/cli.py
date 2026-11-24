"""Uso: python3 -m invoicing.cli SKU:QTD:PRECO ..."""

from __future__ import annotations

import sys
from decimal import Decimal

from invoicing.models import Line
from invoicing.report import report
from invoicing.totals import invoice_total


def parse(arg: str) -> Line:
    sku, qty, price = arg.split(":")
    return Line(sku, int(qty), Decimal(price))


def main(argv: list[str]) -> int:
    lines = [parse(a) for a in argv]
    for row in report(lines):
        print(row)
    print(f"TOTAL;{invoice_total(lines):.2f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
