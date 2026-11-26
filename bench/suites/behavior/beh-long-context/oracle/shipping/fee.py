import math

BASE = {"SUL": 1200, "SUDESTE": 1000, "CENTRO": 1500, "NORDESTE": 1800, "NORTE": 2500}
MAX_G = 30000


def fee(region: str, weight_g: int, express: bool = False) -> int:
    if region not in BASE:
        raise ValueError(f"região desconhecida: {region}")
    if weight_g <= 0 or weight_g > MAX_G:
        raise ValueError(f"peso fora do limite: {weight_g}")
    if express and region == "NORTE":
        raise ValueError("expresso indisponível para NORTE")
    extra = 150 * max(0, math.ceil(weight_g / 1000) - 1)
    total = BASE[region] + extra
    return (total * 3 + 1) // 2 if express else total
