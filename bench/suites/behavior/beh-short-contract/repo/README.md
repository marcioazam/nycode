# billing

Cálculo de total de pedido com cupom.

- `billing/discount.py`: aplica o cupom percentual e o teto de desconto.
- `billing/legacy_format.py`: formatação usada pelo relatório antigo (congelada; não mexer).
- `tests/`: testes do pacote (`python3 -m pytest -q tests`).

Regra do cupom (docs da loja): o desconto é `pct`% do subtotal, limitado a `cap`; o total é arredondado para 2 casas
(ROUND_HALF_UP) só no fim, depois de aplicar o teto.
