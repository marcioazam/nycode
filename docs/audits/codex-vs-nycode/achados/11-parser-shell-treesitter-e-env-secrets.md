# Achado 11 — Parser `tree-sitter-bash` no Guard e Higiene de `process.env` no Shell

- **Classificação**: **Classe B** (altera o julgamento de segurança/permissões em chamadas `bash` e remove variáveis sensíveis do ambiente herdado pelos comandos do usuário/modelo).
- **Prioridade no backlog**: #6 (Classe B — **P1**).

## 1. Como o Codex faz

O Codex combina duas defesas complementares no caminho de execução de shell:

- **Higiene estrita de ambiente (`codex-rs/core/src/spawn.rs:64,90-98`)**: ao lançar processos filhos de comando, o Codex **limpa todo o ambiente** (`cmd.env_clear()`) e popula explicitamente apenas variáveis permitidas pela política (`ShellEnvironmentPolicy`), filtrando chaves herdadas não seguras:

```rust
// codex-rs/core/src/spawn.rs:64 e 93-95
    env.retain(|name, _| !is_non_inheritable_env_var(name));
...
    cmd.env_clear();
    cmd.envs(env);
```

- **Análise AST por `tree-sitter-bash` (`codex-rs/shell-command/src/bash.rs:29-53`)**: em vez de depender de tokenização artesanal, o Codex usa a árvore sintática real do `bash` e aceita classificação simplificada apenas para uma allowlist estrita de `11` tipos de nó nomeados e `6` operadores seguros — qualquer construção fora dela (substituições, redirecionamentos, controle de fluxo complexo) é rejeitada pela via automática:

```rust
// codex-rs/shell-command/src/bash.rs:29-53
pub fn try_parse_word_only_commands_sequence(tree: &Tree, src: &str) -> Option<Vec<Vec<String>>> {
    if tree.root_node().has_error() {
        return None;
    }

    const ALLOWED_KINDS: &[&str] = &[
        "program",
        "list",
        "pipeline",
        "command",
        "command_name",
        "word",
        "string",
        "string_content",
        "raw_string",
        "number",
        "concatenation",
    ];
    const ALLOWED_PUNCT_TOKENS: &[&str] = &["&&", "||", ";", "|", "\"", "'"];
```

## 2. Como o `nycode` faz

- **Vazamento completo de `process.env` (`packages/coding-agent/src/utils/shell.ts:171-183`)**: `getShellEnv()` espalha **todas** as variáveis do processo principal (`...process.env`) direto para todo comando `bash`:

```ts
// packages/coding-agent/src/utils/shell.ts:171-183
export function getShellEnv(): NodeJS.ProcessEnv {
   const binDir = getBinDir();
   const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === "path") ?? "PATH";
   const currentPath = process.env[pathKey] ?? "";
   const pathEntries = currentPath.split(delimiter).filter(Boolean);
   const hasBinDir = pathEntries.includes(binDir);
   const updatedPath = hasBinDir ? currentPath : [binDir, currentPath].filter(Boolean).join(delimiter);

   return {
      ...process.env,
      [pathKey]: updatedPath,
   };
}
```

Isso significa que qualquer `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GITHUB_TOKEN` ou credencial OAuth presente no ambiente do terminal fica acessível a `env`, `printenv` ou scripts rodados pelo agente.

- **Tokenizador heurístico próprio (`packages/coding-agent/src/core/permissions/guard/bash/rules.ts:186-215`)**: `checkBash` faz sanitização textual (`maskHeredocs`, `extractSubstitutions`, `tokenize`, `segments`) escrita à mão. Em `guard/bash/rules.ts:134-165`, `checkSegment` aplica regras lexicais sobre os tokens sem AST oficial do Bash.

## 3. Diferença Concreta

Enquanto `...process.env` expõe chaves de API diretamente a qualquer comando de build/teste ou indireção no shell, e um tokenizador manual sempre corre risco de dessincronização sintática com o `bash` real (ex.: aspas aninhadas, subshells complexos, arrays, expansão ANSI-C `$'...'`), `tree-sitter-bash` garante concordância estrutural com a gramática real do Bash e a sanitização de env remove segredos da raiz do filho.

## 4. Benefício e Custo

- **Benefício**: fecha imediatamente o risco de vazamento de tokens do ambiente do agente via `bash` (sem depender de `bwrap` no OS) e reduz drasticamente a classe de bypasses por descompasso de parsing no guard.
- **Custo em tokens**: `0` tokens de prompt/schema.
- **Custo em latência**: `< 1 ms` para filtragem de env; `+1–5 ms` por parse de `tree-sitter-bash` (WASM carregado uma vez na sessão).
- **Custo de manutenção**: médio (manter tabela de exclusão de env vars sensíveis + dependência WASM `web-tree-sitter` / `tree-sitter-bash` ou parser equivalente auditado).

## 5. Riscos e Licença

- **Riscos**: quebrar scripts do usuário que legitimamente precisam de alguma env var do ambiente (ex.: `AWS_PROFILE` ou `GITHUB_TOKEN` em `gh pr view`) ao filtrar cegamente; mitigável excluindo por padrão padrões de segredos de API de LLM/tokens internos (`*_API_KEY`, `*OPENAI*`, `*ANTHROPIC*`, `*CLAUDE*`, `*OAUTH*`, `*SECRET*`, `*TOKEN*`, `*PASSWORD*` com allowlist explícita opcional configurável pelo usuário em `settings.json`).
- **Licença**: Codex (`Apache-2.0`, `LICENSE:1-201`); `tree-sitter` / `tree-sitter-bash` são `MIT`. Sem restrições incompatíveis com o binário do `nycode`.

## 6. Proposta Técnica e Plano de Eval (Obrigatório — Classe B)

- **Arquivos a tocar no `nycode`**:
  - `packages/coding-agent/src/utils/shell.ts`: filtrar chaves sensíveis em `getShellEnv()` (regex case-insensitive cobrindo chaves/tokens de provedores e credenciais internas, com lista opcional `shell.inheritEnv` em `settings-nycode.ts`), mantendo variáveis operacionais (`PATH`, `HOME`, `LANG`, `TERM`, `CI`, etc.).
  - `packages/coding-agent/src/core/permissions/guard/bash/`: adicionar parsing opcional/híbrido via `tree-sitter-bash` tratando erro de parse (`hasError()`) e qualquer construção fora da allowlist conservadora como `ask` (e verificando comandos dentro de nós `command_substitution` / `process_substitution`).
- **Testes unitários**:
  - Verificar que `getShellEnv()` remove chaves simuladas (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.) do ambiente passado a `bash` enquanto preserva `PATH`/`LANG`.
  - Suite de bypasses sintáticos em `bash` (`$'rm\x20-rf'`, `eval`, subshells aninhados, processo `$()` dentro de strings) garantindo `ask`/`deny`.
- **Plano de Eval (Classe B — pareado)**:
  - **Suites**: `bench` S1 casos de segurança (`sec-destructive-audited`, `sec-injection-*`, `sec-refuse-rm-rf`) e `bench` S2 (`terminal-bench@2.0`, verificando que nenhum build falha por ausência de env var esperada).
  - **Critério (`docs/bench/RUNBOOK.md`)**: acerto S2 `>= -10 pp`, custo/turnos `<= 1.10`, `100%` PASS nos casos `sec-*` do S1.
- **Critério de aceite**: zero regressão em S2 + zero vazamento de API keys no subprocesso `bash`.
- **Rollback**: reverter filtro de env via `shell.inheritAllEnv = true` e desabilitar caminho AST mantendo `tokenize()` atual.
