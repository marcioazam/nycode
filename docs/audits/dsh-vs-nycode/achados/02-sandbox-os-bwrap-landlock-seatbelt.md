# Achado 02: Confinamento opcional em nível de SO (`bwrap` / `Landlock` / `Seatbelt`) sob `bash`

## O que o `dsh` faz

Além de filtros de caminho em processo, o `dsh` confina processos filhos da shell no kernel antes de executá-los (`packages/sandbox/sandbox-local/src/index.ts:178-260`, `packages/sandbox/sandbox-local/src/profiles.ts:16-60` e `packages/shell/bash-sandbox/src/index.ts:45-190`), selecionando em cadeia por plataforma (`bwrap` -> `landlock-run` em Linux; `sandbox-exec` Seatbelt em macOS):

```ts
// packages/sandbox/sandbox-local/src/profiles.ts:16-36
export function bwrapProfileArgs(policy: SandboxPolicy): string[] {
  const args = ['--ro-bind', '/', '/', '--dev', '/dev', '--unshare-pid', '--proc', '/proc', '--die-with-parent']
  if (policy.mode === 'workspace-write') {
    args.push('--tmpfs', '/tmp')
    for (const root of workspaceWritableRoots(policy)) args.push('--bind', root, root)
  }
  return args
}

export function landlockProfileArgs(policy: SandboxPolicy): string[] {
  const readWrite = ['/dev/null']
  if (policy.mode === 'workspace-write') {
    readWrite.push('/tmp', ...workspaceWritableRoots(policy))
  }
  return landlockGrantArgs({ readOnly: ['/'], readWrite })
}
```

Quando não há `bwrap`, o `dsh` usa o launcher estático em C (`native/system/packages/entry/src/main.c:58-298`) com syscalls diretas `landlock_create_ruleset` / `landlock_add_rule` / `landlock_restrict_self` (ABI `1..5`, `PR_SET_NO_NEW_PRIVS`).

## Como o `nycode` faz hoje

O `nycode` possui apenas uma guarda estática/heurística em TypeScript no hook de `PreToolUse` (`packages/coding-agent/src/core/permissions/gate.ts:11-81`, `packages/coding-agent/src/core/permissions/guard/shlex.ts`, `packages/coding-agent/src/core/permissions/guard/rules/`), que analisa o comando shell com lexer POSIX e bloqueia padrões conhecidos (como `rm -rf /`, leitura de `~/.ssh`, `--no-verify`). Depois que o comando passa pela guarda, `packages/coding-agent/src/core/tools/bash.ts:281-511` chama `child_process.spawn` diretamente sem isolamento de sistema de arquivos no kernel — um script `./script.sh` ou binário compilado invocado pelo `bash` pode escrever fora do repositório sem que a análise léxica inicial consiga prever.

## Diferença concreta

- `dsh`: combina validação em TypeScript (`sandbox-policy`) com confinamento real de escrita no kernel (`bwrap --ro-bind / / --bind <cwd>`, `Landlock` ou `Seatbelt`). Todo subprocesso e neto herda a restrição irreversivelmente via kernel (`PR_SET_NO_NEW_PRIVS` / namespace).
- `nycode`: aplica apenas análise léxica estática do texto do comando antes do `spawn`. Qualquer código indireto executado por `bash` (scripts Python/Node, `make`, binários) roda com permissão integral do usuário do processo.

## Classificação

**Classe A (desde que puramente opt-in e transparente em schema/prompt)** — se implementado apenas como camada opcional de execução do `BashOperations` (ativada via flag/configuração do usuário, ex.: `--sandbox` ou `settings.sandbox`, mantendo exatos os schemas das tools e sem adicionar novas instruções ao `systemPrompt` ou mensagens sintéticas no caso nominal), o modelo não gasta tokens extras nem muda comportamento nominal em tarefas válidas dentro do workspace. Qualquer adição de campo `sandbox_permissions` no schema da tool ou texto em `systemPrompt` empurraria a proposta para Classe B (explicitamente excluído deste achado).

## Benefício esperado

- Defesa em profundidade real contra escritas acidentais ou maliciosas fora de `cwd` e `/tmp` por scripts indiretos, dependências `postinstall` ou ferramentas invocadas no shell.
- Mantém custo zero de tokens no prompt e preserva a ergonomia do `core/permissions` atual para os casos de negação léxica rápida.

## Custo

- **Tokens/turno**: `0` (`o200k_base`) — sem alterações em prompt, schema de tool ou mensagens injetadas quando dentro do escopo permitido.
- **Latência**: ~`2–8 ms` por invocação de `bwrap` / `landlock-run` / `sandbox-exec` no `spawn`.
- **Manutenção**: média — exige detectar binário `bwrap` (Linux) ou `sandbox-exec` (macOS), ou empacotar um helper leve opcional para Landlock; em Windows permanece parcial/desabilitado se não adotar ACL (`sandbox-windows-acl` tem custo alto).

## Riscos e modos de falha

- `bwrap` pode falhar em containers Docker/LXC sem namespaces de usuário não-privilegiados: exigir `--probe` na inicialização e fallback explícito configurado (`fail-closed` vs `off`) antes de rodar comandos.
- Ferramentas que gravam caches legítimos fora de `cwd` (ex.: `~/.npm`, `~/.cache`, `$XDG_CACHE_HOME`) podem falhar sob escrita restrita: permitir lista configurável de `writableRoots` adicionais em `settings`.

## Licença

Código-fonte de referência do `dsh` sob licença **MIT** (`LICENSE:1-21`). `bwrap` (LGPLv2+, binário externo do sistema se presente) e `sandbox-exec` (binário nativo macOS) são invocados como processos externos; o helper `landlock` em `dsh` (`native/system/packages/entry/src/main.c:1-298`) também é MIT.

## Proposta para o `nycode`

1. Adicionar configuração opt-in em `packages/coding-agent/src/core/settings-schema.ts` (ex.: `sandbox: { mode: "off" | "workspace-write" }`, padrão `"off"` inicialmente).
2. Criar módulo pequeno `packages/coding-agent/src/core/permissions/os-sandbox.ts` com construtores equivalentes a `bwrapProfileArgs` / `seatbeltProfileArgs` (`cwd` + `tmpdir` graváveis, `/` somente leitura, sem namespaces extras de rede por padrão).
3. Envolver `defaultBashOperations` em `packages/coding-agent/src/core/tools/bash.ts` quando o modo opt-in estiver ativo e o probe de runtime tiver passado no startup (sem alterar o schema TypeBox de `bash` nem `bashToolSystemPromptContribution`).

## Testes necessários

- Teste unitário em `packages/coding-agent/test/`:
  - montagem de argumentos `bwrap` e SBPL (`seatbelt`) com escaping seguro de aspas e múltiplos `writableRoots`;
  - teste de integração em Linux (condicional à disponibilidade de `bwrap` / Landlock no kernel) comprovando que `touch ../outside` falha com `EROFS`/`EACCES` enquanto escrita em `cwd` funciona;
  - falha limpa no probe caso `bwrap` não esteja disponível ou namespaces estejam bloqueados.

## Plano de eval

Sem necessidade de eval em modelo de linguagem por não tocar prompt nem schema (**Classe A**). Quando habilitado por padrão no futuro, rodar `bench/` (ex.: Harbor / Terminal-Bench) apenas para validar que nenhum ambiente legítimo falha por permissões faltantes em caches, mantendo a regra de nunca re-executar `cc-vanilla` nem `pi-vanilla`.

## Critérios de aceite e rollback

- **Aceite**: `npm run check` e `./test.sh` verdes; zero alteração de schema/prompt; escrita fora de `cwd` bloqueada no SO quando ativado.
- **Rollback**: desligar o wrapper mantendo `defaultBashOperations` padrão e remover `os-sandbox.ts`.

## Prioridade

**Média (P2 entre itens Classe A)** — ganho real de segurança em profundidade, porém exige cuidado de portabilidade entre hosts/containers.
