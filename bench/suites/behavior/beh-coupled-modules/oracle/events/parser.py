from __future__ import annotations

from datetime import UTC, datetime

from events.model import Record


def parse_ts(text: str) -> datetime:
    dt = datetime.fromisoformat(text)
    if dt.tzinfo is None:
        raise ValueError(f"horário sem fuso: {text}")
    return dt.astimezone(UTC)


def parse(text: str) -> list[Record]:
    """Uma linha por registro: `id|ts|value|tag1,tag2`."""
    out = []
    for line in text.splitlines():
        if not line.strip():
            continue
        rid, ts, value, tags = line.split("|")
        out.append(
            Record(rid, parse_ts(ts), int(value), [t for t in tags.split(",") if t])
        )
    return out
