from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Record:
    id: str
    ts: str
    value: int
    tags: list[str] = field(default_factory=list)
