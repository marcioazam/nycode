import pathlib

import catalog
import pytest
from catalog import TTLCache, page_count, paginate
from catalog.listing import header

PKG = pathlib.Path(catalog.__file__).parent


class Clock:
    def __init__(self) -> None:
        self.t = 0.0

    def __call__(self) -> float:
        return self.t


def test_p1_renamed_everywhere() -> None:
    assert catalog.PAGE_SIZE == 3 and not hasattr(catalog, "PAGE_SZ")
    assert not any("PAGE_SZ" in p.read_text() for p in PKG.rglob("*.py"))
    assert header(list(range(4)), 2) == "página 2 (1 de até 3)"


@pytest.mark.parametrize(
    ("n", "pages"), [(0, 0), (1, 1), (3, 1), (4, 2), (6, 2), (7, 3)]
)
def test_p2_page_count(n: int, pages: int) -> None:
    assert page_count(n) == pages


def test_p2_last_page_and_bounds() -> None:
    assert paginate(list(range(6)), 2) == [3, 4, 5]
    assert paginate(list(range(7)), 3) == [6]
    assert paginate(list(range(6)), 3) == []
    assert paginate([], 1) == []
    with pytest.raises(ValueError):
        paginate([1], 0)


def test_p3_ttl_expiry_boundary() -> None:
    c = Clock()
    cache = TTLCache(2, 10, c)
    cache.put("a", 1)
    c.t = 9.99
    assert cache.get("a") == 1
    c.t = 10
    assert cache.get("a") is None and len(cache) == 0


def test_p3_lru_counts_get() -> None:
    c = Clock()
    cache = TTLCache(2, 100, c)
    cache.put("a", 1)
    cache.put("b", 2)
    assert cache.get("a") == 1
    cache.put("c", 3)
    assert cache.get("b") is None and cache.get("a") == 1 and cache.get("c") == 3


def test_p3_expired_leave_before_lru() -> None:
    c = Clock()
    cache = TTLCache(2, 10, c)
    cache.put("old", 1)
    c.t = 5
    cache.put("fresh", 2)
    cache.get("old")
    c.t = 11
    cache.put("new", 3)
    assert cache.get("fresh") == 2 and cache.get("new") == 3 and len(cache) == 2


def test_p3_update_existing_no_eviction() -> None:
    c = Clock()
    cache = TTLCache(2, 10, c)
    cache.put("a", 1)
    cache.put("b", 2)
    c.t = 8
    cache.put("a", 9)
    c.t = 12
    assert cache.get("a") == 9 and cache.get("b") is None
