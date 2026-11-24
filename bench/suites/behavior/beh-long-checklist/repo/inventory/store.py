from __future__ import annotations

from inventory.item import Item
from inventory.limits import check_qty
from inventory.text import normalize


class Inventory:
    def __init__(self) -> None:
        self._items: dict[str, Item] = {}

    def add(self, item: Item) -> None:
        self._items[item.sku] = item

    def get(self, sku: str) -> Item:
        return self._items[sku]

    def remove(self, sku: str) -> None:
        if sku not in self._items:
            raise KeyError("not found")
        del self._items[sku]

    def restock(self, sku: str, n: int) -> None:
        item = self._items[sku]
        item.qty = check_qty(item.qty + n)

    def listing(self) -> list[Item]:
        return sorted(self._items.values(), key=lambda x: x.sku)

    def search(self, name: str) -> list[Item]:
        needle = normalize(name)
        return [x for x in self.listing() if needle in normalize(x.name)]

    def low_stock(self, threshold: int = 3) -> list[Item]:
        return [x for x in self.listing() if x.qty < threshold]

    def total_units(self) -> int:
        return sum(x.qty for x in self._items.values())
