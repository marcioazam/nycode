from __future__ import annotations

from inventory.store import Inventory


def export_csv(inv: Inventory) -> str:
    rows = ["sku;name;qty;location\n"]
    rows += [f"{x.sku};{x.name};{x.qty};{x.location}\n" for x in inv.listing()]
    return "".join(rows)
