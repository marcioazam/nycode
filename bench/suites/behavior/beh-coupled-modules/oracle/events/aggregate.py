from __future__ import annotations

from datetime import UTC, datetime

from events.model import Record


def daily(records: list[Record]) -> list[Record]:
    days: dict[str, tuple[int, set[str]]] = {}
    for r in records:
        day = r.ts.astimezone(UTC).date().isoformat()
        total, tags = days.get(day, (0, set()))
        days[day] = (total + r.value, tags | set(r.tags))
    return [
        Record(
            day, datetime.fromisoformat(day).replace(tzinfo=UTC), total, sorted(tags)
        )
        for day, (total, tags) in sorted(days.items())
    ]
