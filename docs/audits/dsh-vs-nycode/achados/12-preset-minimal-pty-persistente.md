# Achado 12: Preset minimalista (`2` tools: PTY `bash` persistente + `read_image`, `305` tokens Turno 1) para benchmark/headless extremo

## O que o `dsh` faz

O `dsh` mantém dois artefatos de composição focados em overhead mínimo de prefixo: `dsh-sdk-minimal` (`packages/bundle/sdk-minimal/cordis.patch.yml:47-179`) e o preset web `minimal` (`packages/bundle/web-app/presets/minimal.patch.yml:1-78`). Ambos reduzem o harness a apenas **2 ferramentas** e uma persona única sem contexto de runtime extra (`includeRuntimeContext: false`, `personaPrefix` com `complete: true`):

```yaml
# packages/bundle/web-app/presets/minimal.patch.yml:11-23,48
- id: persona
  name: '@deepseek-ai/dsh-persona'
  config:
    prefix: You are a helpful software engineer assistant.
    complete: true
    includeRuntimeContext: false
- id: tool-fs
  name: '@deepseek-ai/dsh-tool-fs'
  config:
    read: false
    readImage: true
    write: false
    edit: false
```

No mesmo grupo isolado (`isolate: { terminals: true }`), monta `@deepseek-ai/dsh-terminal-bash` (PTY persistente com marcadores OSC `133;D` mantendo `cwd` e variáveis exportadas entre chamadas) + `@deepseek-ai/dsh-tool-bash-persistent` (`packages/shell/tool-bash-persistent/src/index.ts:30-488`). Nas nossas medições com `tiktoken` (`o200k_base`, ver [censo.md](../censo.md)), esse preset completo pesa exatos **305 tokens no Turno 1** (`8` tokens de system prompt + `297` tokens para `bash` e `read_image`), cerca de **12,5× menor** que o `nycode` headless atual (`3.802` tokens) e **28,4× menor** que o preset `standard` do próprio `dsh` (`8.676` tokens).

## Como o `nycode` faz hoje

O `nycode` ataca o custo de headless via extensão `headless-lean` (`packages/coding-agent/src/extensions/headless-lean/index.ts:1-214`):
- Desativa 10 tools interativas em sessão `print` de topo (`question`, `plan_mode_complete`, `subagent`, `memory`, `lsp_*`, `todo`), caindo de `18` tools (`4.121` tokens) para `8` tools (`1.619` tokens);
- Substitui `contract.md` (`250` tokens) por `headless.md` (`171` tokens), remove `<skills>` e `<docs>`, e move `<cwd>` para fora do bloco em cache;
- Total medido em diretório limpo: **`3.802` tokens** (`2.183` prompt + `1.619` schemas, economia de `-41,6%` sobre o modo interativo padrão de `6.508` tokens), enquanto o núcleo puro sem extensões (`read`, `bash`, `edit`, `write`) mede **`1.261` tokens** (`547` + `714`).
- Além disso, o `bash` do `nycode` (`packages/coding-agent/src/core/tools/bash.ts`) abre um subprocesso novo a cada chamada: não há um preset embutido de shell PTY persistente com 2 tools (`bash` + leitura de imagem).

## Diferença concreta

- `dsh` `minimal`/`sdk-minimal`: abre mão de `edit`, `write`, `grep`, `glob`, `run`, `monitor`, `web_fetch` e do contrato de working rules, apostando em shell PTY persistente + `read_image` com `305` tokens de piso.
- `nycode`: mantém `read`/`edit`/`write`/`run`/`monitor`/`task_stop`/`web_fetch` e o contrato de segurança (`headless.md`) em `3.802` tokens (ou `--tools read,bash,edit,write --no-extensions` em `1.261` tokens), priorizando segurança operacional e precisão de edição literal (`edit-diff.ts`).

## Classificação

**Classe B** — Alteração radical no conjunto de ferramentas, ausência de `edit` estruturado e troca de shell por execução para shell PTY com estado persistente impactam diretamente assertividade, taxa de erros de edição e consumo total de tokens em tarefas de terminal. Exige eval comparativo rigoroso em `bench/` (Terminal-Bench).

## Benefício esperado

- Economia potencial extrema de tokens de prefixo (~`-3.497` tokens fixos no Turno 1 vs headless atual, ou `-956` tokens vs núcleo 4-tools) em cenários de pesquisa/benchmark puramente baseados em shell ou modelos fracos em JSON schemas longos.
- Estado persistente de diretório e ambiente (`cd`, `source .venv/bin/activate`, variáveis exportadas) entre chamadas de `bash` sem o modelo precisar repetir preâmbulos.

## Custo

- **Tokens/turno**: **`-3.497` tokens** no Turno 1 (`3.802 -> 305` em `o200k_base`) se replicado integralmente, embora possa gastar *mais* output tokens se o modelo gerar scripts `python - <<'EOF'` / `sed` / `cat` maiores para editar arquivos sem `edit`/`read`.
- **Manutenção**: alta — manter PTY persistente (pseudo-terminal `node-pty` ou equivalentes cross-platform + protocolo OSC `133;D` para detectar fim de comando, exit code e timeouts sem corromper o buffer quando comandos background escrevem na TTY) exige código não trivial (~1.369 LOC só em `terminal-bash` do `dsh`).

## Riscos e modos de falha

- **Degradação de segurança e edição**: remover `headless.md` (`Nunca usar rm -rf`, tratamento de segredos, prompt injection) e tirar `edit` (`edit-diff.ts` com match fuzzy e preservação de CRLF) aumenta o risco de corrupção de arquivo via `sed`/`awk` e viola as travas operacionais do `docs/PRD.md` se virar padrão. Deve ser estritamente um modo opt-in para experimentação/eval (`--preset minimal`).
- **Hang em PTY persistente**: comando que lê stdin interativamente ou muda `PS1` / `PROMPT_COMMAND` dentro do shell pode dessincronizar o parser de saída do `bash` persistente.

## Licença

Código-fonte de referência `dsh` sob licença **MIT** (`LICENSE:1-21`).

## Proposta para o `nycode`

1. Avaliar **separadamente** duas hipóteses sem substituir o preset padrão do usuário:
   - **H1 (zero PTY novo)**: criar modo opt-in experimental `--tools read_bash_minimal` ou configuração `defaultTools: ["bash", "read"]` + flag que omite `<docs>`/`<skills>` mantendo apenas regras curtas de segurança (`lite.md`: `168` tokens em `packages/coding-agent/resources/instructions/lite.md:1-6`), medindo `~500–650` tokens de prefixo.
   - **H2 (PTY persistente)**: testar apenas após H1 provar que `edit` não faz falta nos benchmarks alvo; caso contrário, rejeitar PTY persistente por custo de manutenção.

## Testes necessários

- Em `packages/coding-agent/test/`: verificar composição opt-in mínima carregando apenas tools configuradas + `lite.md`, mantendo `core/permissions` ativo na guarda `PreToolUse`.

## Plano de eval

- **Baseline**: `nycode -p` com `headless-lean` (`3.802` tokens).
- **Candidato**: `nycode -p` com preset mínimo opt-in (`bash` + `read` ou `bash` + `read_image` + `lite.md`).
- **Onde rodar**: `bench/` no conjunto completo de Terminal-Bench 2.0 (medindo taxa de aprovação, turns totais, output tokens extras de edição via shell vs economia de `input`). Nunca re-executar `cc-vanilla` nem `pi-vanilla`; usar as referências guardadas descritas em `docs/bench/RUNBOOK.md:660`.
- **Critérios**: IC pareado BCa 90% >= `-0.10` na taxa de sucesso e mediana da razão de custo total USD <= `1.10` (aceitar somente se redução real de custo vier sem queda de taxa de sucesso).

## Critérios de aceite e rollback

- **Aceite**: ganho comprovado em custo/assertividade no Terminal-Bench 2.0 antes de considerar exposição como flag experimental documentada.
- **Rollback**: trivial — manter `headless-lean` atual e descartar a flag experimental caso H1 perca assertividade por ausência de `edit`/`read`.

## Prioridade

**Baixa-Média (P4 entre itens Classe B)** — experimento interessante de ablação para `bench/`, mas o `nycode` já possui `headless-lean` (`-41,6%`) preservando `edit` seguro.
