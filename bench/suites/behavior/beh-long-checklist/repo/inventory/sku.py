def validate_sku(sku: str) -> str:
    if not sku:
        raise ValueError(f"invalid sku {sku!r}")
    return sku
