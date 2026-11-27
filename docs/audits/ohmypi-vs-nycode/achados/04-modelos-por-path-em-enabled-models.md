# 04 — Modelos escopados por caminho (`pathScoped`) em `enabledModels`

- **Classe**: **A** (recurso puramente declarativo de configuração do usuário; zero tokens extras, zero alteração no comportamento padrão sem configuração explícita).
- **Prioridade**: **P2** (ganho de ergonomia para usuários com múltiplos repositórios/worktrees usando perfis distintos de modelos).

## O que o `omp` faz

O `omp` permite que `enabledModels` (`omp:packages/coding-agent/src/config/model-settings.ts:94-99`), `enabledProviders` (`:101-106`) e `disabledProviders` (`:108-113`) aceitem tanto strings globais quanto objetos `{ path | paths | pathPrefix | pathPrefixes, models | providers | values | items }` filtrados por prefixo lexical de `cwd` via `resolvePathScopedArray` (`omp:packages/coding-agent/src/config/settings.ts:660-688`):

```ts
function resolvePathScopedArray(setting: AnySetting, value: unknown, cwd: string): unknown[] | undefined {
	const scope = setting.definition.pathScoped;
	if (!scope || !Array.isArray(value)) return undefined;

	const resolved: unknown[] = [];
	if (scope.itemType === "object") {
		resolvePathScopedObjects(value, scope.valuesKey, cwd, resolved);
		resolved.push(...scopedListDefault(setting, value));
		return resolved;
	}

	for (const entry of value) {
		if (typeof entry === "string") {
			resolved.push(entry);
			continue;
		}
		if (!isRecord(entry)) continue;

		const prefixes = pathScopePrefixes(entry);
		if (prefixes.length === 0 || !prefixes.some(prefix => pathMatchesPrefix(cwd, prefix))) continue;
```

- **Ancestralidade Pi**: `pi0.9.4` não tinha `enabledModels`; `pibase` adicionou `enabledModels: string[]` (`pibase:packages/coding-agent/src/core/settings-schema.ts:340`). A extensão `pathScoped` é criação original do `omp`.

## Como o `nycode` faz

Em `packages/coding-agent/src/core/settings-schema.ts:378-382` e `packages/coding-agent/src/core/settings-manager.ts:1398-1410`, `enabledModels` aceita exclusivamente `Type.Array(Type.String())`:

```ts
		enabledModels: Type.Optional(
			Type.Array(Type.String(), {
				description: "Model patterns for cycling, in the same format as the --models CLI flag.",
			}),
		),
```

Não existe escopo por prefixo de diretório no `~/.nycode/agent/settings.json` global (para subagentes existe `.nycode/subagent-routing.json`, lido por diretório confiável em `extensions/subagent/routing/policy.ts:29-37`, mas não para o catálogo/cycling principal de `enabledModels`).

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Tipo de `enabledModels` | União `string \| { path/pathPrefix, models/values }` (`omp:packages/coding-agent/src/config/settings.ts:591-688`) | Apenas `string[]` (`packages/coding-agent/src/core/settings-schema.ts:378-382`) |
| Regras de prefixo em `settings.json` global | Prefixo lexical de `cwd` (expande `~`), sem depender de config local dentro do repo | Exige editar `.nycode/settings.json` dentro de cada projeto (sujeito a trust) ou passar `--models` manualmente |

## Benefício

- **Problema**: um usuário que trabalha em projetos com políticas diferentes (ex.: `~/work/*` restrito a modelos corporativos/Bedrock e `~/oss/*` com modelos pessoais) hoje precisa criar `.nycode/settings.json` em cada repositório e aprová-lo via trust prompt, ou alterar `--models` a cada execução.
- **Rastro**: em `settings-manager.ts:1398-1410`, `getEnabledModels()` retorna diretamente `string[]` sem considerar `this.cwd`.
- **Solução**: estender o schema de `enabledModels` para aceitar opcionalmente objetos `{ paths: string[], models: string[] }` (ou forma unificada compatível com `string[]` existente), avaliados por prefixo lexical de `cwd` (`path.resolve`, normalizando `/` e expandindo `~`) no `SettingsManager`, mantendo 100% compatível com configurações atuais `string[]`.

## Custo

- **Tokens / turno**: **0** (atua apenas na lista de modelos disponíveis para o usuário/cycling na CLI e TUI).
- **Latência**: **< 1 ms** na inicialização de `SettingsManager`.
- **Manutenção**: ~60–90 LOC TS puro em `settings-schema.ts` e `settings-manager.ts`, zero dependências.

## Riscos

- **Sobrescrita entre camadas de settings**: conforme documentado na auditoria (`omp:docs/providers.md:398`), um `enabledModels` definido no projeto substitui a lista global inteira — manter a mesma semântica explícita de override por camada de `SettingsManager` evita confusão e preservará comportamento previsível.
- **Segurança (`ProjectTrustStore`)**: regras `pathScoped` em `~/.nycode/agent/settings.json` vêm da config global do próprio usuário; se definidas em `.nycode/settings.json`, já passam pela barreira de confiança de projeto existente (`core/trust-manager.ts`).

## Licença

**MIT** (`omp:LICENSE:1-23`). Implementação própria enxuta no `nycode`.

## Proposta

- **`packages/coding-agent/src/core/settings-schema.ts:378-382`**: estender o TypeBox schema de `enabledModels` para `Type.Array(Type.Union([Type.String(), PathScopedModelsSchema]))`.
- **`packages/coding-agent/src/core/settings-manager.ts:1398-1410`**: resolver entradas `pathScoped` contra `this.cwd` (expansão `~` e `path.resolve`, prefixo de diretório inteiro — `/work` não casa `/work2`) no getter `getEnabledModels()`.
- **`packages/coding-agent/docs/settings.md`**: documentar o formato.

## Testes

- Adicionar testes em `packages/coding-agent/test/settings-manager.test.ts` (ou novo teste dedicado) cobrindo: lista mista `string[]` + `{ paths, models }`, match por prefixo completo (evitando `/repo` casar `/repo-other`), expansão de `~`, e compatibilidade reversa com `string[]` puro.

## Plano de eval

Não aplicável (Classe A: não altera prompts, tools ou comportamento do LLM).

## Critérios de aceite

1. `getEnabledModels()` preserva entradas `string` globais e inclui entradas `pathScoped` apenas quando `cwd` coincide ou é subdiretório.
2. `/repo` nunca casa com `cwd = /repo-2`.
3. `npm run check` e testes unitários de `settings-manager` passam.

## Rollback

Reverter a união de schema e o filtro de `cwd` em `settings-schema.ts` e `settings-manager.ts`.
