from decimal import Decimal

from billing import total_with_coupon


def test_no_coupon() -> None:
    assert total_with_coupon(Decimal("10.00"), 0, Decimal("5")) == Decimal("10.00")


def test_total_with_coupon() -> None:
    assert total_with_coupon(Decimal("10.10"), 15, Decimal("50")) == Decimal("8.59")
