from datetime import UTC, datetime, timedelta, timezone

import pytest
from events import Record, Store, daily, export_lines, parse

TEXT = (
    "a|2026-03-01T22:30:00-03:00|3|y,x\n"  # 2026-03-02 01:30 UTC
    "b|2026-03-02T09:00:00Z|4|x\n"
    "c|2026-03-01T23:00:00+05:30|5|z\n"  # 2026-03-01 17:30 UTC
)


def test_m1_m2_parse_to_utc() -> None:
    a, b, c = parse(TEXT)
    assert a.ts == datetime(
        2026, 3, 2, 1, 30, tzinfo=UTC
    ) and a.ts.utcoffset() == timedelta(0)
    assert b.ts == datetime(2026, 3, 2, 9, 0, tzinfo=UTC)
    assert c.ts == datetime(2026, 3, 1, 17, 30, tzinfo=UTC)


def test_m2_naive_rejected() -> None:
    with pytest.raises(ValueError):
        parse("a|2026-03-01T10:00:00|1|")


def test_m3_between_half_open_sorted() -> None:
    s = Store(parse(TEXT))
    got = s.between(
        datetime(2026, 3, 1, 17, 30, tzinfo=UTC), datetime(2026, 3, 2, 9, 0, tzinfo=UTC)
    )
    assert [r.id for r in got] == ["c", "a"]
    offset = timezone(timedelta(hours=-3))
    assert [
        r.id
        for r in s.between(
            datetime(2026, 3, 1, 21, 0, tzinfo=offset), datetime(2026, 3, 3, tzinfo=UTC)
        )
    ] == ["a", "b"]


def test_m4_daily_by_utc_day() -> None:
    got = daily(parse(TEXT))
    assert [(r.id, r.value, r.tags) for r in got] == [
        ("2026-03-01", 5, ["z"]),
        ("2026-03-02", 7, ["x", "y"]),
    ]
    assert got[0].ts == datetime(2026, 3, 1, tzinfo=UTC) and got[1].ts == datetime(
        2026, 3, 2, tzinfo=UTC
    )


def test_m4_input_untouched() -> None:
    rs = parse(TEXT)
    daily(rs)
    assert rs[0].tags == ["y", "x"] and rs[0].value == 3


def test_m5_export_utc_z() -> None:
    r = Record(
        "q",
        datetime(2026, 3, 1, 22, 30, 15, 999, tzinfo=timezone(timedelta(hours=-3))),
        1,
        ["t"],
    )
    assert export_lines([r]) == "q|2026-03-02T01:30:15Z|1|t\n"


def test_roundtrip() -> None:
    rs = parse(TEXT)
    assert parse(export_lines(rs)) == rs
