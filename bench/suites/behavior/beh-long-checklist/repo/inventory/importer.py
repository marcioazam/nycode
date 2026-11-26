from __future__ import annotations

import json

from inventory.item import Item
from inventory.store import Inventory


def import_json(text: str) -> Inventory:
    inv = Inventory()
    for row in json.loads(text):
        inv.add(
            Item(row["sku"], row["name"], row.get("qty", 0), row.get("active", True))
        )
    return inv
