from __future__ import annotations

from dataclasses import dataclass

from inventory.limits import check_qty
from inventory.sku import validate_sku


@dataclass
class Item:
    sku: str
    name: str
    qty: int = 0
    active: bool = True

    def __post_init__(self) -> None:
        validate_sku(self.sku)
        check_qty(self.qty)
