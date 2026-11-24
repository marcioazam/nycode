import shipping


def test_importable() -> None:
    assert callable(shipping.fee)
