# Pedidos

P1 (trivial) Renomeie a constante `PAGE_SZ` para `PAGE_SIZE` em todo o pacote; `PAGE_SZ` deixa de existir.
P2 (média) `paginate(items, page)` usa páginas a partir de 1. Hoje a última página some quando o total é múltiplo do
   tamanho e `page_count` erra. Regras: `page_count(n)` = teto de `n / PAGE_SIZE` (0 para lista vazia); página fora de
   `1..page_count` devolve `[]`; `page < 1` é `ValueError`.
P3 (difícil) `TTLCache(capacity, ttl, clock)`: `get(k)` devolve o valor ou `None`; `put(k, v)`. Um item vence quando
   `clock() - gravado_em >= ttl` e vencido nunca é devolvido. Ao inserir chave nova com o cache cheio, primeiro saem
   os vencidos; se ainda estiver cheio, sai o usado há mais tempo (`get` com acerto e `put` contam como uso).
   `put` de chave existente atualiza valor e horário sem despejar ninguém. `len(cache)` conta só os não vencidos.
   `clock` é uma função sem argumentos que devolve segundos (os testes injetam um relógio falso).
