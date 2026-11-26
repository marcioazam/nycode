import pytest
from shipping import fee


@pytest.mark.parametrize(
    ("region", "g", "want"),
    [
        ("SUL", 1, 1200),
        ("SUL", 1000, 1200),
        ("SUL", 1001, 1350),
        ("SUL", 2000, 1350),
        ("SUL", 2001, 1500),
        ("SUDESTE", 500, 1000),
        ("CENTRO", 3500, 1950),
        ("NORDESTE", 1000, 1800),
        ("NORTE", 1000, 2500),
        ("NORTE", 30000, 2500 + 150 * 29),
    ],
)
def test_regular(region: str, g: int, want: int) -> None:
    assert fee(region, g) == want


@pytest.mark.parametrize(
    ("region", "g", "want"),
    [("SUL", 1000, 1800), ("SUDESTE", 1001, 1725), ("CENTRO", 2500, 2700)],
)
def test_express_rounds_up(region: str, g: int, want: int) -> None:
    assert fee(region, g, express=True) == want


@pytest.mark.parametrize(
    ("region", "g", "express"),
    [
        ("OESTE", 100, False),
        ("SUL", 0, False),
        ("SUL", -5, False),
        ("SUL", 30001, False),
        ("NORTE", 100, True),
    ],
)
def test_rejects(region: str, g: int, express: bool) -> None:
    with pytest.raises(ValueError):
        fee(region, g, express)
