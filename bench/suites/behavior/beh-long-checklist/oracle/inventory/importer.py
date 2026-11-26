from __future__ import annotations

import json

from inventory.item import Item
from inventory.store import Inventory


def import_json(text: str) -> Inventory:
    inv = Inventory()
    for row in json.loads(text):
        qty = row.get("qty", row.get("quantity", 0))
        inv.add(Item(row["sku"], row["name"], qty, row.get("active", True)))
    return inv
