from decimal import ROUND_HALF_UP, Decimal

CENT = Decimal("0.01")


def total_with_coupon(subtotal: Decimal, pct: int, cap: Decimal) -> Decimal:
    """Total do pedido com cupom de pct% limitado a cap."""
    discount = (subtotal * pct / 100).quantize(CENT, rounding=ROUND_HALF_UP)
    if discount > cap:
        discount = cap
    return subtotal - discount
