# Achado 15 — Subagentes In-Process, `fork_turns` e Enxugamento do Schema de `subagent`

- **Classificação**: **Classe B** (altera significativamente o schema da ferramenta `subagent`, o modelo de execução/herança de contexto e a concorrência).
- **Prioridade no backlog**: #13 (Classe B — **P2**).

## 1. Como o Codex faz

O sistema `MultiAgentV2` / `agent-roles` do Codex tem três escolhas arquiteturais distintas:

1. **Roles declarativos em camadas (`codex-rs/agent-roles/src/loader.rs:23-117`)**: carrega perfis de subagente de `.toml`/diretório `agents/` com herança entre camadas e campos tipados de modelo, sandbox e descrição.
2. **Threads em processo no mesmo runtime (`codex-rs/core/src/config/mod.rs:279-290`)**: limita concorrência (`DEFAULT_AGENT_MAX_THREADS = Some(6)`, `DEFAULT_MULTI_AGENT_V2_MAX_CONCURRENT_THREADS_PER_SESSION = 4`, `DEFAULT_AGENT_MAX_DEPTH = 1`) executando filhos na mesma instância tokio sem spawnar um binário/Node inteiro por subagente.
3. **Herança limpa de histórico via `fork_turns` (`codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:203-239`)**: separa `agent_type`, `task_name` e `fork_turns` (`"none"` ou `"all"`, com strings numéricas legadas mapeando também para `SpawnAgentForkMode::FullHistory` na `rust-v0.172.0`):

```rust
// codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:203-239
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct SpawnAgentArgs {
    message: String,
    task_name: String,
    agent_type: Option<String>,
    model: Option<String>,
    reasoning_effort: Option<ReasoningEffort>,
    fork_turns: Option<String>,
    fork_context: Option<bool>,
}
...
        let fork_turns = self
            .fork_turns
            .as_deref()
            .map(str::trim)
            .filter(|fork_turns| !fork_turns.is_empty())
            .unwrap_or("all");

        if fork_turns.eq_ignore_ascii_case("none") {
            return Ok(None);
        }
        // Accept legacy turn counts without limiting the inherited history.
        if fork_turns.eq_ignore_ascii_case("all") || fork_turns.parse::<NonZeroUsize>().is_ok() {
            return Ok(Some(SpawnAgentForkMode::FullHistory));
        }
```

*(Observação de rigor: em `codex-rs/core/src/tools/handlers/multi_agents_spec.rs:14-65`, quando `MultiAgentV2` é usado, as ferramentas de delegação ficam separadas por operações explícitas como `spawn_agent`, `send_message`, `wait_agent`, em namespace dedicado).*

## 2. Como o `nycode` faz

Em `packages/coding-agent/src/extensions/subagent/core/params.ts:32-112`, o `nycode` unifica tudo em uma única ferramenta `subagent` polimórfica (`agent`+`task`, `tasks`, `chain`, `agentScope`, `confirmProjectAgents`, `cwd`, `background`, `status`, `cancel`, `resume`, `send`, mais `routingProps`), cujo schema compilado custa **`680` tokens** (`3,162` bytes em `o200k_base` — **mais caro que o quarteto inteiro** `read + bash + edit + write` somado, que custa **`619` tokens**!). Por esse motivo inclusive, `headless-lean` desabilita `subagent` no topo de runs `-p` (`extensions/headless-lean/index.ts:20-24`). Além disso, cada invocação de subagente lança um subprocesso separado, sem opção leve de forkar o contexto pai mantendo o prefixo de cache em memória.

## 3. Diferença Concreta

1. **Peso do schema `subagent`**: `680` tokens de schema no `nycode` pesam em **todo turno interativo** mesmo quando a sessão nunca usa subagentes; descrições verbosas em `background` e `tasks`/`chain` + `routingProps` inflacionam o prefixo.
2. **Boot e cache entre pai e filho**: subprocessos separados pagam inicialização Node/extensões (`~200–800 ms` por spawn) e começam sem histórico do pai (obrigando o modelo pai a reescrever o contexto no campo `task` em duplicidade). Um modo `in-process` opcional via `createAgentSession` com `fork_context`/`fork_turns` aproveitaria KV cache já aquecido no provedor.

## 4. Benefício e Custo

- **Benefício**:
  - Execução in-process reduz latência de spawn e economiza memória em execuções `parallel` / `tasks`.
  - Herança opcional de histórico (`forkContext` com corte explícito ou completo) economiza tokens de re-explicação do prompt pai quando o prefixo cacheado já existe.
  - Compacção de descrições do schema `subagent` pode recuperar `150–250` tokens por turno sem perder campos funcionais.
- **Custo em tokens**: redução esperada no schema (`-150` a `-250` tok) + trade-off controlado em `forkContext` (maior contexto inicial do filho, porém com alto cache hit se compartilhando prefixo exato).
- **Custo em latência**: `-200–800 ms` por spawn ao evitar processo OS separado para subagentes in-process (mantendo `isolation: "worktree"` em processo separado quando necessário).
- **Custo de manutenção**: médio a alto (`createAgentSession` reentrante + isolamento de `ExtensionAPI` / estado por subagente).

## 5. Riscos e Licença

- **Riscos**: isolamento de `process.cwd()` e variáveis mutáveis globais no Node se dois subagentes rodarem no mesmo processo com `cwd` diferentes — exigir explicitamente que toda ferramenta do filho receba `cwd` explícito (ou usar subprocesso apenas quando `cwd !== parentCwd` / worktree), e propagar `AbortSignal` por árvore.
- **Licença**: Codex (`Apache-2.0`, `LICENSE:1-201`); implementado inteiramente sobre `createAgentSession` (`packages/coding-agent/src/core/sdk.ts`) já existente no `nycode`.

## 6. Proposta Técnica e Plano de Eval (Obrigatório — Classe B)

- **Arquivos a tocar no `nycode`**:
  - `packages/coding-agent/src/extensions/subagent/core/params.ts`: enxugar descrições mantendo parâmetros idênticos + campo opt-in `forkContext?: boolean` (ou `forkTurns: "none" | "all"`).
  - `packages/coding-agent/src/extensions/subagent/core/run.ts`: caminho rápido in-process sobre `createAgentSession` quando mesmo `cwd` e sem isolamento de worktree, herdando mensagens iniciais apenas se solicitado, e compartilhando fila de mutação/permissões.
- **Testes unitários**:
  - Abort propagado do pai cancela filhos in-process imediatamente; `cwd` explícito diferente mantém fallback por processo; contagem regressiva de `o200k_base` no schema `subagentParams()` pós-edição.
- **Plano de Eval (Classe B — pareado)**:
  - **Suite**: `bench` **S5 (`suites/multi`)** comparando subagente atual (subprocesso + schema `680` tok) vs candidato (in-process + schema enxuto + `forkContext`).
  - **Métricas (`docs/bench/RUNBOOK.md`)**: acerto S5 (`>= -10 pp`), razão de custo (`<= 1.10`), razão de turnos (`<= 1.10`) e latência média por spawn em `bench/contract/speed.py`.
- **Critério de aceite**: redução mensurável de tempo de spawn + schema `subagent <= 480` tok + S5 PASS no gate.
- **Rollback**: fallback incondicional para executor subprocesso em `subagent/core/run.ts`.
