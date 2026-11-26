from __future__ import annotations

from events.model import Record


def daily(records: list[Record]) -> list[Record]:
    days: dict[str, Record] = {}
    for r in records:
        day = r.ts[:10]
        agg = days.setdefault(day, Record(day, day, 0, []))
        agg.value += r.value
        agg.tags += r.tags
    return [days[k] for k in sorted(days)]
