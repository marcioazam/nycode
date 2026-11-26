from __future__ import annotations

from events.model import Record


class Store:
    def __init__(self, records: list[Record] | None = None) -> None:
        self._records = list(records or [])

    def add(self, r: Record) -> None:
        self._records.append(r)

    def between(self, a: str, b: str) -> list[Record]:
        return sorted((r for r in self._records if a <= r.ts < b), key=lambda r: r.ts)

    def all(self) -> list[Record]:
        return list(self._records)
