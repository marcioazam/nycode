import re

SKU_RE = re.compile(r"^[A-Z]{3}-\d{4}$")


def validate_sku(sku: str) -> str:
    if not SKU_RE.fullmatch(sku):
        raise ValueError(f"SKU inválido: {sku}")
    return sku
