from __future__ import annotations

from datetime import UTC

from events.model import Record


def export_lines(records: list[Record]) -> str:
    def ts(r: Record) -> str:
        return r.ts.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")

    return "".join(f"{r.id}|{ts(r)}|{r.value}|{','.join(r.tags)}\n" for r in records)
