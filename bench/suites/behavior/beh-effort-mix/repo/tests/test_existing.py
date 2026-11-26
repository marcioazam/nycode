from catalog.pages import paginate


def test_first_page() -> None:
    assert paginate(list(range(7)), 1) == [0, 1, 2]
