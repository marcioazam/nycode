from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Record:
    id: str
    ts: datetime
    value: int
    tags: list[str] = field(default_factory=list)
