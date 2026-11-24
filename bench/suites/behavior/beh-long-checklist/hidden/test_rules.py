import pytest
from inventory import Inventory, Item, export_csv, import_json


def inv3() -> Inventory:
    inv = Inventory()
    inv.add(Item("AAA-0003", "zinco", 7))
    inv.add(Item("AAA-0001", "Ácido", 5))
    inv.add(Item("AAA-0002", "Bucha", 6, active=False))
    return inv


def test_r1_message() -> None:
    with pytest.raises(ValueError) as e:
        Item("abc", "x")
    assert str(e.value) == "SKU inválido: abc"


@pytest.mark.parametrize(
    "sku", ["ABC-123", "abc-1234", "ABCD-1234", "AB-1234", "ABC-12345", "ABC1234"]
)
def test_r2_rejects(sku: str) -> None:
    with pytest.raises(ValueError):
        Item(sku, "x")


def test_r3_max_qty() -> None:
    Item("ABC-0001", "x", 1000)
    with pytest.raises(ValueError):
        Item("ABC-0001", "x", 1001)
    inv = Inventory()
    inv.add(Item("ABC-0001", "x", 999))
    with pytest.raises(ValueError):
        inv.restock("ABC-0001", 2)


def test_r4_location_default() -> None:
    assert Item("ABC-0001", "x").location == "MAIN"
    assert Item("ABC-0001", "x", location="B2").location == "B2"


def test_r5_listing_by_name_casefold() -> None:
    inv = Inventory()
    inv.add(Item("AAA-0001", "beta"))
    inv.add(Item("AAA-0002", "Alfa"))
    inv.add(Item("AAA-0003", "Gama"))
    assert [x.name for x in inv.listing()] == ["Alfa", "beta", "Gama"]


def test_r6_semicolon() -> None:
    inv = Inventory()
    inv.add(Item("ABC-0001", "Parafuso", 2))
    assert export_csv(inv).splitlines()[1] == "ABC-0001;Parafuso;2;MAIN"


def test_r7_header() -> None:
    assert export_csv(Inventory()).splitlines() == ["sku;name;qty;location"]


@pytest.mark.parametrize("n", [0, -1])
def test_r8_restock_positive(n: int) -> None:
    inv = inv3()
    with pytest.raises(ValueError):
        inv.restock("AAA-0003", n)


def test_r9_search_accents() -> None:
    inv = inv3()
    assert [x.sku for x in inv.search("acido")] == ["AAA-0001"]
    assert [x.sku for x in inv.search("ÁCIDO")] == ["AAA-0001"]


def test_r10_low_stock_default_inclusive() -> None:
    assert [x.sku for x in inv3().low_stock()] == ["AAA-0001"]
    assert sorted(x.sku for x in inv3().low_stock(6)) == ["AAA-0001", "AAA-0002"]


def test_r11_remove_missing() -> None:
    with pytest.raises(KeyError) as e:
        inv3().remove("ZZZ-0000")
    assert e.value.args == ("ZZZ-0000",)


def test_r12_total_ignores_inactive() -> None:
    assert inv3().total_units() == 12


def test_r13_quantity_alias() -> None:
    inv = import_json('[{"sku": "ABC-0001", "name": "x", "quantity": 8}]')
    assert inv.get("ABC-0001").qty == 8


def test_r14_str() -> None:
    assert str(Item("ABC-0001", "Parafuso", 3)) == "ABC-0001 Parafuso x3"
