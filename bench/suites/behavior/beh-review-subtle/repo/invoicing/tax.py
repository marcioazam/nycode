from decimal import Decimal

TAX_RATE = Decimal("0.10")


def with_tax(value: Decimal) -> Decimal:
    return value * (1 + TAX_RATE)
