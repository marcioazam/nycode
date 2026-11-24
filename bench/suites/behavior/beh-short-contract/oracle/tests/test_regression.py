from decimal import Decimal

from billing import total_with_coupon


def test_half_cent_discount_rounds_at_the_end() -> None:
    assert total_with_coupon(Decimal("10.10"), 15, Decimal("50")) == Decimal("8.59")


def test_cap_with_fraction_of_cent_is_rounded() -> None:
    assert total_with_coupon(Decimal("10.00"), 50, Decimal("1.005")) == Decimal("9.00")
