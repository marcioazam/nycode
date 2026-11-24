from __future__ import annotations

from collections.abc import Callable
from typing import Any


class TTLCache:
    def __init__(self, capacity: int, ttl: float, clock: Callable[[], float]) -> None:
        self.capacity = capacity
        self.ttl = ttl
        self.clock = clock
        self._data: dict[Any, Any] = {}

    def get(self, key: Any) -> Any:
        return self._data.get(key)

    def put(self, key: Any, value: Any) -> None:
        if len(self._data) >= self.capacity:
            self._data.pop(next(iter(self._data)))
        self._data[key] = value

    def __len__(self) -> int:
        return len(self._data)
