# 05 — Deduplicação de arquivos de contexto contidos e prazo de montagem do system prompt

- **Classe**: **A** (zero tokens extras — na verdade reduz tokens duplicados acidentalmente sem alterar comportamento normal do modelo; guarda defensiva de timeout contra travamento de inicialização).
- **Prioridade**: **P2** (melhora resiliência e evita duplicação quando hierarquias ou links simbólicos apontam para o mesmo `AGENTS.md`).

## O que o `omp` faz

Em `omp:packages/coding-agent/src/system-prompt.ts:354-373`, `dedupeContainedContextFiles` ordena os arquivos de contexto por profundidade (do mais distante para o mais próximo de `cwd`) e remove um arquivo ancestral inteiro sempre que todos os seus blocos normalizados já estiverem contidos em um arquivo mais próximo/específico:

```ts
export function dedupeContainedContextFiles(
   contextFiles: Array<{ path: string; content: string; depth?: number }>,
): Array<{ path: string; content: string; depth?: number }> {
   // Sort by depth descending: higher depth (farther from cwd, less
   // authoritative) first, lower depth (closer to cwd, more authoritative)
   // last. Stable sort preserves caller order among equal-depth files.
   const sorted = [...contextFiles].sort((a, b) => {
      const depthA = a.depth ?? Number.POSITIVE_INFINITY;
      const depthB = b.depth ?? Number.POSITIVE_INFINITY;
      return depthB - depthA;
   });
   const blocks = sorted.map(file => splitComparablePromptBlocks(file.content));
   return sorted.filter(
      (_file, index) =>
         !blocks.some(
            (candidateBlocks, candidateIndex) =>
               candidateIndex > index && promptBlocksContain(candidateBlocks, blocks[index]),
         ),
   );
}
```

Complementarmente, `omp:packages/coding-agent/src/system-prompt.ts:848-877` protege a montagem do system prompt contra travamentos de I/O (rede/FUSE/mount lento ao carregar context files/skills/árvore) com um deadline de `5000 ms`.
- **Ancestralidade Pi**: ausente em `pi0.9.4` e `pibase`. Criação original do `omp`.

## Como o `nycode` faz

- `packages/coding-agent/src/core/system-prompt.ts:179-182` recebe `contextFiles` de `resource-loader.ts`, chama `withBuiltinInstructions(contextFiles)` (`packages/coding-agent/src/core/builtin-instructions.ts:1-75`) e renderiza todos via `renderProjectContext(projectContext)` sem deduplicar conteúdo contido entre ancestral e subdiretório (ou `~/.nycode/agent/AGENTS.md` duplicado no repo).
- `buildSystemPromptSections` é síncrono sobre arrays já carregados, mas a etapa de descoberta no carregamento de recursos/sessão não impõe um deadline defensivo explícito caso um filesystem remoto/lento trave o boot.

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Deduplicação de `AGENTS.md` por conteúdo contido | `dedupeContainedContextFiles` remove ancestral idêntico ou estritamente contido no filho (`omp:packages/coding-agent/src/system-prompt.ts:354-373`) | Renderiza todos os `contextFiles` listados (`packages/coding-agent/src/core/system-prompt.ts:181-182`) |
| Proteção contra travamento na leitura de contexto | Prazo de `5000 ms` (`omp:packages/coding-agent/src/system-prompt.ts:848-877`) | Sem prazo explícito no carregamento de arquivos de contexto |

## Benefício

- **Problema**: em monorepos, worktrees aninhados ou configurações globais em `~/.nycode/agent/AGENTS.md` copiadas para o repositório, o mesmo conteúdo de `AGENTS.md` pode ser carregado duas vezes seguidas em `<project_context>`, desperdiçando tokens fixos em todo turno da sessão. Além disso, diretórios montados sobre SSHFS/FUSE/NFS com travamento podem congelar o carregamento inicial sem diagnóstico.
- **Rastro**: sem `dedupeContainedContextFiles`, `renderProjectContext` emite ambos os arquivos `AGENTS.md` com o mesmo conteúdo; no caso comum (arquivos distintos), a função é um no-op completo.
- **Solução**: aplicar deduplicação exata por blocos normalizados mantendo precedência do arquivo mais próximo ao `cwd` em `withBuiltinInstructions` / `renderProjectContext` (preservando sempre os docs embutidos caso distintos) e adicionar guarda de timeout segura na leitura assíncrona de descoberta de arquivos de contexto se houver operações de I/O assíncronas.

## Custo

- **Tokens / turno**: **0** no caso comum; economia positiva quando houver arquivos `AGENTS.md` duplicados/contidos.
- **Latência**: **< 1 ms** (comparação em memória de poucos KB).
- **Manutenção**: ~40 LOC TS puro, zero dependências.

## Riscos

- **Ordem/precedência**: respeitar estritamente `blocksContain` exato pós-normalização de quebras de linha/whitespace (nunca fuzzy!) para jamais descartar um `AGENTS.md` que tenha sequer 1 linha nova útil, e jamais descartar contrato embutido de `builtin-instructions.ts` por acidente caso o usuário tenha algo parecido (aplicar só entre arquivos de usuário/repo carregados do disco).
- Docs: alinhado ao ADR-0003 (`docs/ADR.md:54-63`, cópia não rastreada no checkout principal) que combate desperdício em contexto sempre carregado.

## Licença

**MIT** (`omp:LICENSE:1-23`). Padrão algorítmico simples reescrito em TS idiomático.

## Proposta

- **`packages/coding-agent/src/core/system-prompt.ts`** (ou **`packages/coding-agent/src/core/resource-loader.ts`** onde os `contextFiles` do usuário/projeto são coletados): adicionar `dedupeContainedContextFiles` mantendo o arquivo mais específico/próximo ao `cwd` quando um ancestral está integralmente contido nele (comparação exata por blocos após normalização LF/trim).
- Verificar se a descoberta de contexto/skills no `resource-loader.ts` possui operações lentas sem timeout e aplicar guarda com log de aviso não fatal se passar de um teto razoável (ex.: 5s).

## Testes

- Adicionar casos em `packages/coding-agent/test/system-prompt.test.ts`:
  1. Dois `contextFiles` idênticos (ex.: `~/.nycode/agent/AGENTS.md` e `./AGENTS.md`): apenas o mais próximo de `cwd` permanece.
  2. Ancestral estritamente contido no filho (por parágrafos): apenas o filho permanece.
  3. Ancestral com 1 regra extra ausente no filho: **ambos** permanecem intactos.

## Plano de eval

Não aplicável (Classe A: no-op em qualquer repositório sem arquivos de contexto redundantes; apenas remove duplicatas exatas).

## Critérios de aceite

1. Arquivos `AGENTS.md` idênticos ou integralmente contidos são deduplicados preservando o mais específico.
2. Qualquer divergência de conteúdo mantém ambos intactos.
3. Testes de `system-prompt` e `resource-loader` passam.

## Rollback

Remover a chamada a `dedupeContainedContextFiles` em `system-prompt.ts` / `resource-loader.ts`.
