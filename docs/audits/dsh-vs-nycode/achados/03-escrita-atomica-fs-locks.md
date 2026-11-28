# Achado 03: Escrita atômica via staging privado, locks lexicais e preservação de permissões

## O que o `dsh` faz

Toda escrita de arquivo no `dsh` serializa travas multi-caminho em ordem lexicográfica (`packages/fs/fs-local/src/index.ts:125-146`) e executa gravação atômica por diretório de staging privado (`0o700`), arquivo temporário criado com flag exclusiva `'wx'` (`0o600`), `fsync` antes do fechamento, preservação de modo/DACL e publicação via `link` (para criação exclusiva) ou `rename`/`replaceFileWin32` (`packages/fs/fs-local/src/fsio.ts:605-689`):

```ts
// packages/fs/fs-local/src/fsio.ts:620-669
const stagingDir = join(directory, `.${basename(absolutePath)}.${process.pid}.${randomUUID()}.tmpdir`)
const tempPath = join(stagingDir, `${basename(absolutePath)}.tmp`)
await mkdir(stagingDir, { mode: 0o700 })
stagingCreated = true
await chmod(stagingDir, 0o700)
handle = await open(tempPath, 'wx', 0o600)
...
await handle.writeFile(content, { encoding: 'utf8', ...signal ? { signal } : {} })
await handle.sync()
if (mode !== undefined) await handle.chmod(mode)
await handle.close()
...
await rename(tempPath, absolutePath)
```

Caso ocorra erro ou aborto no meio da escrita, o arquivo destino original nunca fica truncado pela metade e o diretório `.tmpdir` é limpo no `catch`.

## Como o `nycode` faz hoje

O `nycode` serializa mutações no mesmo caminho físico por processo via `withFileMutationQueue` (`packages/coding-agent/src/core/tools/file-mutation-queue.ts:32-61`), mas escreve diretamente no arquivo alvo sem temporário nem `rename` em `packages/coding-agent/src/core/tools/write.ts:34,81` e `packages/coding-agent/src/core/tools/edit.ts`:

```ts
// packages/coding-agent/src/core/tools/write.ts:33-36
const defaultWriteOperations: WriteOperations = {
  writeFile: (path, content) => fsWriteFile(path, content, "utf-8"),
  mkdir: (dir) => fsMkdir(dir, { recursive: true }).then(() => {}),
};
```

Se `writeFile` for interrompido por sinal, erro de disco ou queda de energia durante um `write`/`edit`, ou se outro processo ler simultaneamente o arquivo alvo, ele pode observar um arquivo truncado ou parcialmente reescrito.

## Diferença concreta

- `dsh`: escrita em diretório staging (`0o700`) + `wx` (`0o600`) + `sync()` + `chmod(modeOriginal)` + `rename` atômico no mesmo filesystem (ou `link` quando criação nova sem sobrescrita). Também evita deadlock em operações multi-arquivo ordenando locks lexicograficamente.
- `nycode`: `fsWriteFile` trunca e reescreve o inode destino diretamente no lugar, com serialização apenas por arquivo individual em memória.

## Classificação

**Classe A** — Transparente ao modelo de linguagem (`0` tokens, zero mudança de saída textual de `write`/`edit`, comportamento idêntico em caso de sucesso, apenas atomicidade contra leituras parciais e falhas de I/O).

## Benefício esperado

- Elimina janela de arquivo truncado/corrompido quando o processo é abortado (`SIGINT`/OOM) durante `write` ou `edit` ou quando file watchers (`tsc --watch`, `vitest`, `lsp`) lêem o arquivo durante a gravação.
- Preserva bits de permissão executável/existentes sem herdar `umask` acidental ao recriar arquivos via `rename` (diferente de staging naive com `0o600` sem `chmod(oldStat.mode)`).

## Custo

- **Tokens/turno**: `0` (`o200k_base`).
- **Latência**: marginal (~`0.2–2 ms` extra por escrita; `fsync` opcional configurável caso SSDs lentos em benchmarks sintéticos façam milhares de escritas).
- **Manutenção**: baixa — encapsulável num helper compartilhado por `defaultWriteOperations` e `defaultEditOperations`.

## Riscos e modos de falha

- `rename` sobre symlink: se o destino for um symlink apontando para outro arquivo ou outro filesystem (`EXDEV`), `rename` substituiria o symlink pelo arquivo regular em vez de escrever através do link! **Cuidado obrigatório**: checar `lstat(target)` primeiro e resolver `realpath` quando for symlink dentro da política aceita, ou fazer fallback para escrita direta se o alvo estiver em outro dispositivo (`EXDEV`) após copiar modo.
- Resíduos de `.tmpdir` após `SIGKILL` brusco: prefixo determinístico identificável permite eventual limpeza segura; staging no mesmo diretório falha se só o arquivo for gravável e o diretório pai for somente leitura (fazer fallback para truncamento direto em `EACCES`/`EROFS` no diretório pai).

## Licença

Padrão POSIX padrão sob referência **MIT** (`LICENSE:1-21` do `dsh`). Nenhuma dependência externa necessária em Node.js POSIX (`node:fs/promises` + `node:crypto`).

## Proposta para o `nycode`

1. Criar helper interno em `packages/coding-agent/src/core/tools/atomic-write.ts` implementando escrita atômica via arquivo temporário `'wx'` no diretório do alvo resolvido (após `realpath` para não quebrar symlinks intencionais), preservando `stat.mode` pré-existente (`chmod`), com fallback para escrita direta quando o diretório pai não permitir criação de arquivo ou em `EXDEV`.
2. Adotar o helper em `defaultWriteOperations.writeFile` (`packages/coding-agent/src/core/tools/write.ts:34`) e `defaultEditOperations.writeFile` (`packages/coding-agent/src/core/tools/edit.ts`).

## Testes necessários

- Teste em `packages/coding-agent/test/`:
  - sobrescrever arquivo com permissão `0o755` preserva o bit executável;
  - falha simulada durante gravação do temporário mantém o conteúdo anterior intacto e não deixa arquivo `.tmp` órfão;
  - escrita em symlink aponta ao alvo real sem substituir o link simbólico por arquivo comum;
  - fallback limpo quando diretório pai é read-only mas arquivo já existe e é gravável.

## Plano de eval

Sem necessidade de eval em LLM (**Classe A**). Validar via `./test.sh` em `packages/coding-agent`.

## Critérios de aceite e rollback

- **Aceite**: `npm run check` e suite de testes verdes; `edit` e `write` atômicos preservando permissões e symlinks sem regressão em testes de `EditOperations`/`WriteOperations`.
- **Rollback**: restaurar `fsWriteFile` direto em `defaultWriteOperations` e `defaultEditOperations`.

## Prioridade

**Alta (P1 entre itens Classe A)** — corrige race real com file watchers / LSP após edições (`extensions/lsp` lê o arquivo imediatamente no hook `tool_result`!).
