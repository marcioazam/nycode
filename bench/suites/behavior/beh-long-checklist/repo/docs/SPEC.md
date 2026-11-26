# SPEC do inventory

## §1 Estado atual

`Inventory` guarda `Item`s por SKU. Os testes de `tests/` descrevem o comportamento que já existe.

## §2 Mudanças pedidas (todas valem)

R1 A mensagem do erro de SKU inválido passa a ser exatamente `SKU inválido: <sku>` (`ValueError`).
R2 Um SKU válido casa com `^[A-Z]{3}-\d{4}$` (hoje qualquer texto não vazio passa).
R3 A quantidade de um item é no máximo 1000; acima disso, `ValueError` (vale ao criar o item e no `restock`).
R4 `Item` ganha o campo `location: str` com padrão `"MAIN"`.
R5 `Inventory.listing()` ordena por nome com `str.casefold` (hoje ordena por SKU).
R6 `export_csv` usa `;` como separador.
R7 `export_csv` começa com a linha de cabeçalho `sku;name;qty;location` e inclui a coluna `location`.
R8 `restock(sku, n)` recusa `n <= 0` com `ValueError`.
R9 `search(name)` ignora acentos e maiúsculas nos dois lados (normalização `unicodedata` NFKD, sem marcas combinantes).
R10 `low_stock(threshold=5)` tem o limite padrão 5 e é inclusivo (`qty <= threshold`).
R11 `remove(sku)` de SKU inexistente levanta `KeyError` cujo argumento é o SKU.
R12 `total_units()` ignora itens com `active=False`.
R13 `import_json` aceita a chave `quantity` como sinônimo de `qty`.
R14 `str(item)` é `<sku> <name> x<qty>`.
