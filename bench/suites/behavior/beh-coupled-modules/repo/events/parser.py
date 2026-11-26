from __future__ import annotations

from events.model import Record


def parse(text: str) -> list[Record]:
    """Uma linha por registro: `id|ts|value|tag1,tag2`."""
    out = []
    for line in text.splitlines():
        if not line.strip():
            continue
        rid, ts, value, tags = line.split("|")
        out.append(Record(rid, ts, int(value), [t for t in tags.split(",") if t]))
    return out
