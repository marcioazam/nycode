from __future__ import annotations

PAGE_SZ = 3


def page_count(n: int) -> int:
    return n // PAGE_SZ


def paginate(items: list, page: int) -> list:
    start = (page - 1) * PAGE_SZ
    if page > page_count(len(items)):
        return []
    return items[start : start + PAGE_SZ]
