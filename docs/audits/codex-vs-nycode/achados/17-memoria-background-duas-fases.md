# Achado 17 — Extração e Consolidação de Memória em Background em 2 Fases

- **Classificação**: **Classe B** (consome tokens adicionais de LLM em background e muda disponibilidade automática de memórias entre sessões).
- **Prioridade no backlog**: #18 (Classe B — **P2**, estritamente **opt-in** por envolver gasto em background).

## 1. Como o Codex faz

Em `codex-rs/memories/write/src/phase1.rs:49-93`, o Codex executa um pipeline assíncrono em background ao iniciar/ocioso que não depende de o agente principal se lembrar de salvar notas:

```rust
// codex-rs/memories/write/src/phase1.rs:49-79
/// Runs memory phase 1 in strict step order:
/// 1) claim eligible rollout jobs
/// 2) build one stage-1 request context
/// 3) run stage-1 extraction jobs in parallel
/// 4) emit metrics and logs
pub async fn run(context: Arc<MemoryStartupContext>, config: Arc<Config>) {
    let stage_one_context = build_request_context(context.as_ref(), config.as_ref()).await;
    let _phase_one_e2e_timer = stage_one_context.start_timer(MEMORY_PHASE_ONE_E2E_MS);

    // 1. Claim startup job.
    let Some(claimed_candidates) = claim_startup_jobs(context.as_ref(), &config.memories).await
    else {
        return;
    };
    if claimed_candidates.is_empty() {
        ...
        return;
    }

    // 3. Run the parallel sampling.
    let outcomes = run_jobs(
        context,
        config,
        claimed_candidates,
        stage_one_context.clone(),
    )
    .await;
```

Seguido de uma **Fase 2** (`memories/write/src/phase2.rs`) que consolida extrações brutas em documentos de resumo estruturados em memória (`MEMORY.md` / notas por escopo), isolados dos turnos interativos e rastreados por estado (`codex-rs/state/src/migrations.rs:10`).

## 2. Como o `nycode` faz

Em `packages/coding-agent/src/extensions/memory/index.ts:150-195`, o `nycode` possui gerenciamento limpo e bem protegido do armazenamento de memória (stripping YAML/HTML comments, limite de leitura `200` linhas / `25 KB`, `indexWouldOverflow`, migração automática de slugs), exposto como ferramenta `memory`. Porém:
- A gravação de novas memórias depende **exclusivamente** de o modelo ativo decidir chamar `memory` durante uma tarefa ou do usuário instruir manualmente.
- Se uma sessão termina abruptamente ou foca apenas no código (especialmente em modelos focados na tarefa), aprendizados recorrentes do projeto não são capturados nem consolidados automaticamente entre sessões.

## 3. Diferença Concreta

Codex automatiza a destilação pós-sessão usando chamadas paralelas em background sobre rollouts fechados e consolida duplicatas antes de acumular ruído; o `nycode` já possui a camada de armazenamento enxuta sem SQLite complexo, faltando apenas o extrator assíncrono opcional.

## 4. Benefício e Custo

- **Benefício**: melhora retenção de convenções e descobertas do repositório entre sessões sem ocupar tokens de saída nem atenção do modelo durante a resolução ativa da tarefa.
- **Custo em tokens**: **alto se ligado incondicionalmente** (extração `stage-1` + consolidação `phase-2` consomem tokens extras sobre transcrições inteiras). Por isso só agrega no custo x benefício se **desligado por padrão ou restrito a modelo barato (`Haiku`) com orçamento próprio e desabilitado em `-p`**.
- **Custo em latência**: `0 ms` no turno ativo (roda assincronamente ou em startup de sessões interativas sobre sessões anteriores concluídas).
- **Custo de manutenção**: alto (controle de idempotência para não re-extrair o mesmo rollout duas vezes, lock sobre `memory/`, deduplicação semântica).

## 5. Riscos e Licença

- **Riscos**: alucinação ou gravação de fatos obsoletos contaminando o índice `MEMORY.md` de futuras sessões (por isso o próprio Codex alerta na doc oficial: memórias são recall auxiliar, regras obrigatórias ficam em `AGENTS.md`), e gasto silencioso inesperado de créditos sem consentimento do usuário. Mitigação: opt-in explícito (`memory.autoExtract: true`), teto diário/por sessão, e nunca rodar em `-p` / `NYCODE_OFFLINE=1` / projetos não confiáveis.
- **Licença**: Codex (`Apache-2.0`, `LICENSE:1-201`); pipeline limpo escrito em TypeScript reutilizando `extensions/memory/` e `modelRegistry.complete` com modelo pequeno.

## 6. Proposta Técnica e Plano de Eval (Obrigatório — Classe B)

- **Arquivos a tocar no `nycode`**:
  - Novo worker em `packages/coding-agent/src/extensions/memory/auto-extract.ts`: ao iniciar sessão interativa confiável (e apenas com opt-in), verifica últimas sessões concluídas no mesmo `cwd` sem marcador `extracted` e roda extração stage-1 com modelo barato + consolidação sobre `extensions/memory/index.ts` respeitando `INDEX_MAX_LINES` e `INDEX_MAX_BYTES`.
  - `packages/coding-agent/src/core/settings-nycode.ts`: `memory.autoExtract` (default `false`), `memory.extractModel`.
- **Testes unitários**:
  - Idempotência (sessão já extraída não re-processa), respeito a `NYCODE_OFFLINE=1`, respeito a projetos não confiáveis e respeito estrito aos limites de `indexWouldOverflow`.
- **Plano de Eval (Classe B — pareado)**:
  - **Suites**: eval longitudinal de duas sessões encadeadas em `packages/evals` (sessão A descobre convenção não trivial do repo -> pausa -> sessão B recebe tarefa dependente da convenção) comparando memória manual vs consolidação em 2 fases.
  - **Métricas**: ganho de acerto na sessão B (`>= +10 pp` para justificar custo extra) e custo total somando Fase 1+2 (`docs/bench/RUNBOOK.md`).
- **Critério de aceite**: zero alteração no custo em modo default (`autoExtract: false`) e benefício líquido comprovado na eval multi-sessão quando habilitado.
- **Rollback**: flag default `false`; remoção do hook `session_start` do extrator.
