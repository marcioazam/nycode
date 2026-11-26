from __future__ import annotations

from catalog.pages import PAGE_SZ, paginate


def header(items: list, page: int) -> str:
    return f"página {page} ({len(paginate(items, page))} de até {PAGE_SZ})"
