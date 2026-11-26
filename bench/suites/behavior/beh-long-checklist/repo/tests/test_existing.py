import pytest
from inventory import Inventory, Item, import_json
from inventory.report import summary


def make() -> Inventory:
    inv = Inventory()
    inv.add(Item("ABC-0001", "Parafuso", 10))
    inv.add(Item("ABC-0002", "Arruela", 2))
    return inv


def test_get_and_summary() -> None:
    inv = make()
    assert inv.get("ABC-0001").qty == 10
    assert summary(inv) == "2 itens, 12 unidades"


def test_restock_adds() -> None:
    inv = make()
    inv.restock("ABC-0002", 3)
    assert inv.get("ABC-0002").qty == 5


def test_negative_qty() -> None:
    with pytest.raises(ValueError):
        Item("ABC-0003", "Porca", -1)


def test_import_basic() -> None:
    inv = import_json('[{"sku": "ABC-0009", "name": "Prego", "qty": 4}]')
    assert inv.get("ABC-0009").qty == 4
