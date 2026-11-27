# 01. Reparo de input de tool (JSON em string, chaves extras, aliases)

Classe: **A**. Prioridade: **P1** (custo zero, reduz chamadas falhas).

## O que o OpenCode faz

`packages/core/src/plugin/tool-input-repair.ts:11-29` (v2.4.2, `fc31a485`):

```ts
// Repairs apply only when the input schema unambiguously supports them:
// - Stringified root or nested object: '{"limit":"20"}' -> { limit: 20 }
// - Closed object: { limit: "20", extra: true } -> { limit: 20 }
// - Optional null or empty-object placeholder: { limit: null } -> {}
// - Stringified array or compatible item: { tags: '["a"]', count: "2" } -> { tags: ["a"], count: [2] }
...
const aliases = new Map([["bash", "shell"], ["Bash", "shell"]])
```

O reparo roda antes da validação, só quando o schema não deixa dúvida, e registra uma nota quando o modelo chamou por
alias (linhas 33-39), para a resposta dizer como chamar da próxima vez.

## Como o nycode faz

- `packages/schema/src/coerce.ts:1-13`: três passes (nulo opcional removido, regras do `Value.Convert` do TypeBox,
  coerção de primitivos). Não há passe que faça `JSON.parse` de string quando o schema pede objeto ou array
  (`rg -n 'JSON.parse' packages/schema/src/coerce.ts` vazio).
- `packages/ai/src/utils/validation.ts:54-69`: valida após coagir; falha devolve `Validation failed ... Received
  arguments: <json>` ao modelo.
- Tool desconhecida: `packages/agent/src/agent-loop.ts:729` devolve `Tool ${name} not found`, sem alias.

## Diferença

Dois casos frequentes com modelos não-Anthropic (objeto serializado como string; chave inventada em objeto fechado)
viram erro + nova chamada no nycode e são aceitos no OpenCode. Aliases: o nycode não tem tool `shell`; o equivalente
seria aceitar nomes de outros harnesses (`Bash`, `Read`, `Edit`, `shell`) quando nenhuma tool tem aquele nome.

## Benefício

Menos turnos de correção. Cada erro de validação custa um turno: a mensagem de erro (~100-300 tok com o JSON recebido)
mais a nova chamada. Sem mudança de prompt nem de schema: o modelo vê os mesmos tools.

## Custo

- Tokens por turno: 0 no caminho feliz; negativo quando evita um retry.
- Latência: desprezível (só roda quando a validação falharia).
- Manutenção: ~150-250 linhas em `packages/schema` (passe novo no `Coercer`) + tabela de aliases.

## Riscos

- Reparo "criativo" aceitar input errado. Mitigação: só quando o resultado valida contra o schema, como no OC.
- Remover chaves extras pode esconder bug do modelo; manter só para `additionalProperties: false`.

## Licença

OpenCode é MIT. Reimplementar a regra não exige atribuição; copiar trechos exige manter o aviso MIT do OpenCode no
arquivo ou em `THIRD_PARTY`.

## Proposta (arquivos a tocar)

1. `packages/schema/src/coerce.ts`: passe 0 "string JSON → objeto/array" quando o nó do schema é `object`/`array` e o
   valor é string que faz parse; passe "remover chaves fora de `properties`" só em `additionalProperties: false`.
2. `packages/agent/src/agent-loop.ts:729` (lookup da tool): tabela de aliases usada só quando o nome não existe.
3. Changelog de `packages/schema` e `packages/agent`.

## Testes

- `packages/schema/test/coerce.test.ts`: casos do comentário do OC (string raiz, aninhada, array em string, chave extra
  em objeto fechado, chave extra em objeto aberto preservada, string que não é JSON preservada).
- `packages/agent/test`: tool chamada como `Bash` resolve para `bash`; nome inexistente continua erro.

## Plano de eval

Classe A: não exige eval de comportamento. Verificação: contar, nas sessões locais (`~/.nycode/agent/sessions`),
quantos `Validation failed` seriam reparados (script só-leitura sobre JSONL) antes e depois.

## Aceite

Testes acima verdes; `npm run check` limpo; zero mudança no schema serializado das tools
(`/tmp/ny-tools.json` idêntico antes/depois).

## Rollback

Reverter o commit; o passe é isolado no `Coercer`.
