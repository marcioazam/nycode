# Achado 05: Isolamento `0o700` por sessão e varredura TTL segura contra symlinks para arquivos temporários

## O que o `dsh` faz

O `dsh` centraliza arquivos temporários de spill em `packages/spill/spill-local/src/store.ts:16-81` e aplica limpeza automática com validadores rígidos de segurança no startup em `packages/spill/spill-local/src/cleanup.ts:47-96` e `packages/spill/spill-local/src/index.ts:66-70` (`cleanupPeriodDays: 30`):

- Os arquivos ficam segregados em diretório privado `dsh-spill-*` (`0o700`) e subdiretórios por sessão `session-<sha256_prefix>` (`0o700`), gravados sempre com `'wx'` (`0o600`).
- Na limpeza por TTL, `cleanup.ts:47-96` valida antes de remover:

```ts
// packages/spill/spill-local/src/cleanup.ts:47-55,83-91
function isTrustedDirectory(stats: Stats): boolean {
  if (!stats.isDirectory()) return false
  if (process.platform === 'win32' || process.geteuid === undefined) return true
  return stats.uid === process.geteuid() && (stats.mode & 0o022) === 0
}
...
const stats = await lstat(parent)
if (!stats.isDirectory()) return false
const writableByOthers = (stats.mode & 0o022) !== 0
const sticky = (stats.mode & 0o1000) !== 0
if (writableByOthers && !sticky) return false
if (writableByOthers && childStats.uid !== currentUid) return false
```

Aceita diretórios padrão abaixo de `/tmp` (`0o1777` sticky bit) apenas quando o diretório filho é possuído pelo próprio `uid`, usa `lstat` estrito e ignora symlinks e nomes fora do regex estrito.

## Como o `nycode` faz hoje

`packages/coding-agent/src/utils/output-files.ts:17-34` cria arquivos individuais diretamente soltos na raiz de `os.tmpdir()` (`nycode-*-<random>.log` / `.txt`, com proteção `'wx'` `0o600` em `writeOutputFile` e `createOutputFileStream`), utilizados por `packages/coding-agent/src/core/tools/output-accumulator.ts:35-88`, `packages/coding-agent/src/core/bash-executor.ts`, `packages/coding-agent/src/extensions/codemode/execute.ts` e `packages/coding-agent/src/extensions/mcp/tools.ts`. Não existe subdiretório por sessão nem nenhuma rotina de coleta de lixo / expiração por TTL: todo arquivo temporário permanece em `/tmp` indefinidamente até reinício do SO ou limpeza manual.

## Diferença concreta

- `dsh`: organiza spills em raiz privada + subdiretório por sessão (`0o700`) e limpa arquivos expirados após 30 dias com defesa contra symlink-planting / TOCTOU (`lstat`, verificação de UID, modo `0o022` e sticky bit nos ancestrais).
- `nycode`: cria arquivos seguros (`'wx'`, `0o600`), mas soltos em `os.tmpdir()` e sem política de expiração/varredura.

## Classificação

**Classe A** — Operação puramente de ciclo de vida de arquivos temporários em disco; não toca prompt, schema, nome de tool, tokens nem saída retornada ao modelo durante a sessão ativa.

## Benefício esperado

- Evita acúmulo ilimitado de logs de `bash` e `codemode` em servidores long-lived ou containers onde `/tmp` não é limpo com frequência (onde `output-accumulator.ts` chega a escrever dezenas de MB por execução longa).
- Prepara caminho limpo caso o achado `09` adicione spill também para `grep`/`find`.

## Custo

- **Tokens/turno**: `0` (`o200k_base`).
- **Latência**: irrelevante (`setImmediate` / sweep assíncrono em background após boot com limite de entradas por varredura).
- **Manutenção**: baixa — ~80–120 linhas em `packages/coding-agent/src/utils/output-files.ts` sem novas dependências.

## Riscos e modos de falha

- Corrida/TOCTOU ou abuso via symlinks em `/tmp` compartilhado: seguir estritamente o modelo do `dsh` (`lstat` antes de descer/remover, conferir `stats.uid === process.geteuid()` e sticky bit nos ancestrais, nunca seguir symlink e validar nome estrito `^nycode-(bash|codemode|output|mcp)-[0-9a-f]+\.(log|txt)$`).
- Apagar arquivo de sessão ainda viva por vários dias: filtrar por `mtimeMs` > `30` dias (ou janela menor se explícita em settings) garantindo margem muito acima da duração de sessões ativas.

## Licença

Código de referência `dsh` sob licença **MIT** (`LICENSE:1-21`).

## Proposta para o `nycode`

1. Em `packages/coding-agent/src/utils/output-files.ts:17-34`:
   - agrupar novos output files sob ``join(tmpdir(), `nycode-out-${uid}`)`` (criado `0o700`, validado com `lstat` + dono = `geteuid` quando em POSIX; com fallback seguro para `tmpdir()` se outro processo criar colisão inesperada);
   - adicionar função assíncrona `sweepExpiredOutputFiles({ maxAgeDays = 30 })` verificando `isTrustedDirectory`, `hasProtectedAncestors` e `lstat` sem seguir symlinks antes de chamar `unlink`.
2. Disparar `void sweepExpiredOutputFiles().catch(() => {})` uma vez em background na inicialização interativa/CLI em `packages/coding-agent/src/main.ts` (sem bloquear startup nem gerar ruído em stderr/JSON).

## Testes necessários

- Teste unitário em `packages/coding-agent/test/`:
  - arquivos mais antigos que `maxAgeDays` dentro do diretório confiável são removidos; arquivos recentes permanecem;
  - symlinks plantados no diretório são ignorados intactos e nunca seguidos;
  - diretório não possuído pelo usuário atual ou gravável por terceiros sem sticky bit aborta o sweep sem tocar nenhum arquivo.

## Plano de eval

Sem eval de LLM (**Classe A** — zero impacto em modelo, tokens ou assertividade). Validar via `npm run check` e `./test.sh` em `packages/coding-agent`.

## Critérios de aceite e rollback

- **Aceite**: remoção de arquivos expirados no teste, zero risco com symlinks, zero erro em startup headless/RPC (`output-guard.ts`).
- **Rollback**: remover a chamada de inicialização do sweep mantendo `writeOutputFile` e `createOutputFileStream` atuais.

## Prioridade

**Baixa-Média (P3 entre itens Classe A)** — higiene operacional limpa com código pequeno e zero efeito colateral.
