from __future__ import annotations

from inventory.store import Inventory


def export_csv(inv: Inventory) -> str:
    return "".join(f"{x.sku},{x.name},{x.qty}\n" for x in inv.listing())
