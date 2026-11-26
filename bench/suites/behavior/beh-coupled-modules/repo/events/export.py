from __future__ import annotations

from events.model import Record


def export_lines(records: list[Record]) -> str:
    return "".join(f"{r.id}|{r.ts}|{r.value}|{','.join(r.tags)}\n" for r in records)
