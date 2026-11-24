from __future__ import annotations

PAGE_SIZE = 3


def page_count(n: int) -> int:
    return -(-n // PAGE_SIZE)


def paginate(items: list, page: int) -> list:
    if page < 1:
        raise ValueError(f"página inválida: {page}")
    if page > page_count(len(items)):
        return []
    start = (page - 1) * PAGE_SIZE
    return items[start : start + PAGE_SIZE]
