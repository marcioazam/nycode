# SPEC do invoicing

## §1 Linha

R1.1 Uma linha tem `sku` (texto), `qty` (inteiro >= 0) e `unit_price` (`Decimal`, pode ter mais de 2 casas).
R1.2 `qty` negativa levanta `ValueError`.

## §2 Imposto

R2.1 O imposto é de 10% (`TAX_RATE` em `invoicing/tax.py`) sobre o valor da linha.

## §3 Fatura

R3.1 O total da fatura é a soma dos totais de linha.

## §4 Desconto por volume

R4.1 Quantidade >= 10 tem desconto de 5%; quantidade >= 50 tem desconto de 10%. Os limites são inclusivos e só a
maior faixa vale (50 unidades dão 10%, nunca 15%).
R4.2 O desconto incide sobre o valor da linha (`qty * unit_price`) antes do imposto.
R4.3 O total da linha é arredondado uma única vez, a 2 casas, com `ROUND_HALF_EVEN`. Nenhum valor intermediário
(subtotal, valor com desconto, valor com imposto) é arredondado.
R4.4 Linha com quantidade 0 não entra no total da fatura nem no relatório.
R4.5 O relatório tem uma linha de texto por item, na ordem em que os itens foram passados (estável, inclusive com
totais iguais), no formato `<sku>;<qty>;<total com 2 casas>`.
