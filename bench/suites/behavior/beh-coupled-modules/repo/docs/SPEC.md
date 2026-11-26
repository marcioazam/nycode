# SPEC do events

## §1 Hoje

`Record.ts` é texto (`"2026-03-01T10:00:00Z"`) e cada módulo o trata como texto.

## §2 Mudança pedida

M1 `Record.ts` passa a ser `datetime` com fuso, sempre normalizado para UTC.
M2 `parse` aceita o horário com `Z` ou com deslocamento (`-03:00`, `+05:30`) e converte para UTC; sem fuso é
   `ValueError`.
M3 `Store.between(a, b)` recebe `datetime`s com fuso e devolve os registros com `a <= ts < b`, em ordem de `ts`.
M4 `daily(records)` agrupa pelo dia **UTC** de `ts`. Cada agregado é um `Record` com `id` = `YYYY-MM-DD`,
   `ts` = meia-noite UTC desse dia, `tags` = união das tags, sem repetição e em ordem alfabética, e `value` = soma.
   Os agregados saem em ordem de dia.
M5 `export_lines` escreve `ts` como `YYYY-MM-DDTHH:MM:SSZ` (UTC, sem microssegundos) e mantém o resto da linha.
