from __future__ import annotations

from inventory.store import Inventory


def summary(inv: Inventory) -> str:
    return f"{len(inv.listing())} itens, {inv.total_units()} unidades"
