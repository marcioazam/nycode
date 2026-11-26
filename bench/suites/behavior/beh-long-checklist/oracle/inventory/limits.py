MAX_QTY = 1000


def check_qty(qty: int) -> int:
    if qty < 0:
        raise ValueError(f"quantidade negativa: {qty}")
    if qty > MAX_QTY:
        raise ValueError(f"quantidade acima de {MAX_QTY}: {qty}")
    return qty
