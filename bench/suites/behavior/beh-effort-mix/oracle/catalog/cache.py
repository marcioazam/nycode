from __future__ import annotations

from collections import OrderedDict
from collections.abc import Callable
from typing import Any


class TTLCache:
    def __init__(self, capacity: int, ttl: float, clock: Callable[[], float]) -> None:
        self.capacity = capacity
        self.ttl = ttl
        self.clock = clock
        self._data: OrderedDict[Any, tuple[Any, float]] = OrderedDict()

    def _expired(self, stamp: float) -> bool:
        return self.clock() - stamp >= self.ttl

    def _purge(self) -> None:
        for k in [k for k, (_, t) in self._data.items() if self._expired(t)]:
            del self._data[k]

    def get(self, key: Any) -> Any:
        hit = self._data.get(key)
        if hit is None or self._expired(hit[1]):
            return None
        self._data.move_to_end(key)
        return hit[0]

    def put(self, key: Any, value: Any) -> None:
        if key not in self._data:
            if len(self._data) >= self.capacity:
                self._purge()
            if len(self._data) >= self.capacity:
                self._data.popitem(last=False)
        self._data[key] = (value, self.clock())
        self._data.move_to_end(key)

    def __len__(self) -> int:
        return sum(1 for _, t in self._data.values() if not self._expired(t))
