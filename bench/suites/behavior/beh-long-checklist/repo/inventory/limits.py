def check_qty(qty: int) -> int:
    if qty < 0:
        raise ValueError(f"quantidade negativa: {qty}")
    return qty
