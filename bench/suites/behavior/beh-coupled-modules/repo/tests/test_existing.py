from events import Store, parse

TEXT = "a|2026-03-01T10:00:00Z|3|x,y\nb|2026-03-02T09:00:00Z|4|\n"


def test_parse_fields() -> None:
    rs = parse(TEXT)
    assert [r.id for r in rs] == ["a", "b"]
    assert rs[0].value == 3 and rs[0].tags == ["x", "y"] and rs[1].tags == []


def test_store_all() -> None:
    assert len(Store(parse(TEXT)).all()) == 2
