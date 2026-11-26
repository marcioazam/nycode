from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class Line:
    sku: str
    qty: int
    unit_price: Decimal

    def __post_init__(self) -> None:
        if self.qty < 0:
            raise ValueError(f"quantidade negativa: {self.qty}")
