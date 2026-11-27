# 04. Aprovações salvas ("Always allow"), com escopo de site para web fetch

Classe: **A**. Prioridade: **P3** (o dono usa bypass; vale para modo seguro e para outros usuários).

## O que o OpenCode faz

- `packages/core/src/permission/saved.ts:1-14,96`: aprovações persistidas por projeto em SQLite, editáveis (índice
  único rejeita duplicata).
- `packages/core/src/permission.ts:104-108`:

```ts
export function site(url: string) {
  const origin = /^https?:\/\/[^/\\?#@\s*]+(?=[/\\?#]|$)/i.exec(url)?.[0]
  if (origin) return [origin, `${origin}/*`]
  return /[*?]/.test(url) ? [] : [url]
}
```

- `CHANGELOG.md:15` (#66000): "Always allow" de web fetch passou a valer só para o site.
- `packages/core/src/permission/policy.ts:27-37`: aprovações salvas são a camada `fallback`, que nunca sobrepõe
  `deny` nem `allow` explícitos.

## Como o nycode faz

Sem aprovação persistida: `rg -n -i 'always allow|allow always|sempre permitir|remember'` em
`packages/coding-agent/src/core/permissions`, `extensions/hooks` e `extensions/claude-compat/permissions` não acha nada.
Cada `ask` do guard (`core/permissions/guard/decide.ts:76`) pergunta de novo.

## Diferença

Em modo seguro o nycode repete a mesma pergunta para o mesmo comando/caminho/site a cada chamada.

## Benefício

Menos interrupções em modo seguro. Zero tokens: a decisão acontece antes da execução e o modelo não vê nada novo.

## Custo

Tokens 0; latência 0; manutenção média (armazenamento por projeto, UI de listar/remover, ~200-300 linhas).

## Riscos

- Aprovação ampla demais (o bug que o OC corrigiu em #66000): salvar só padrões estreitos (comando exato, origem de
  site, caminho exato).
- Nunca salvar sobre um `deny` do guard (catastrófico continua negado), igual à camada `fallback` do OC.

## Licença

MIT; reimplementação.

## Proposta

1. `core/permissions/` novo `saved.ts` (JSON em `~/.nycode/agent/permissions/<projeto>.json`), consultado em
   `gate.ts` só quando o veredito é `ask`.
2. Diálogo de confirmação ganha "Permitir sempre (neste projeto)".
3. `/permissions` lista e remove.

## Testes

`packages/coding-agent/test/`: ask salvo vira allow; deny nunca vira allow; web fetch salvo vale só para a origem.

## Plano de eval

Classe A: sem eval de modelo.

## Aceite

Testes verdes; deny catastrófico continua negado com aprovação salva presente.

## Rollback

Apagar o arquivo de aprovações; reverter o commit.
