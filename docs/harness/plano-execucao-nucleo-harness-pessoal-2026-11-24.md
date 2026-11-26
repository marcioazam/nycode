# Plano de execução: Núcleo, Harness e Pessoal (2026-11-24)

Status: rascunho para aprovação. Nada foi executado.

Fonte das decisões: `decisoes-nucleo-harness-pessoal-2026-11-24.md` (A1–A9, B1–B12, C1–C11, D1–D4, E1–E3).
Dependências cruzadas: seção 6 de `auditoria-core-vs-harness-2026-11-23.md`.

## Objetivo e aceite

O binário `nycode` passa a ter três camadas:
- Núcleo genérico.
- Harness embutido, ligado por padrão (D0).
- Nada pessoal: o que é pessoal vive em `~/.nycode/agent`.

Aceite:
1. Nenhum recurso embutido cita uma skill, agente ou comando que o produto não embute, exceto em trechos condicionais. Um teste no build garante isso (C7).
2. O dono continua com todas as skills, agentes, comandos, regras, hooks e scripts que hoje usa, agora em `~/.nycode/agent`. Ao abrir uma sessão, `/skills` e `/agents` listam os mesmos nomes de antes.
3. O prompt fixo do núcleo cai de 11,6 KB (`contract.md`) para cerca de 1 KB: proteção genérica, a regra de escopo E1 e o `safety` enxuto.
4. O pacote publicado não leva testes nem `__pycache__` de `resources/` (`npm pack --dry-run`).
5. O gate completo do repositório passa uma única vez, no head final.

## Achado que muda a ordem

Nenhum dos 25 itens Pessoal de skills, dos 10 agentes, nem dos comandos e regras existe hoje em `~/.nycode/agent`. Verificado em 2026-11-24: só há `AGENTS.md`. O dono usa todos eles a partir dos recursos embutidos. Por isso a cópia para Pessoal (F1) precisa vir antes de qualquer remoção do repositório (F3).

## Fases

Há um único branch de integração no `~/source/nycode`, chamado `harness/nucleo-pessoal`. Commits locais de checkpoint são permitidos; push, PR e merge só acontecem depois de F7.

### F0. Linha de base
- Criar o branch.
- Registrar a contagem de testes e o estado do gate atual no head de partida. Isso é a medição "antes" dos refactors, exigida pelo contrato.
- Fotografar a lista de skills, agentes e comandos que uma sessão do dono enxerga hoje (`/skills`, `/agents`). É a referência do aceite 2.

### F1. Cópia para Pessoal (aditiva, fora do repositório)
Destino: `~/.nycode/agent/{skills,agents,commands,rules,hooks,bin}`.
- Skills (25): as listadas em C4–C6.
- Agentes (10): os listados em C3. Os pins `anthropic/*` viram alias de tier.
- Comandos (9): os listados em C8.
- Regras: `research-and-tools`, `docs-and-knowledge`, `harness-economy` (C2) e a parte de política do `contract.md` (C1). As duas entram no `~/.nycode/agent/AGENTS.md` como um índice curto mais arquivos.
- Hooks: a parte pessoal do `hook-dispatch.sh` (C9), mais `claims/` e `impeccable_gate.sh`. O `settings.json` do dono passa a apontar para eles.
- Scripts: `git-deliver`, `telemetry/`, `structure/`, `checks/`, `mcp-header.sh` e `nycode-image.mjs` (C10).
- Reescrever `${NYCODE_RESOURCES}/…` para os caminhos pessoais nos itens copiados.
- Checagem: uma sessão nova do binário atual lista os mesmos nomes da foto de F0, sem duplicata ou com a precedência documentada.

### F2. Remoções sem dependência de F1
- A1: hook `graph-context`, auto-index, settings `codegraph` (`settings-nycode-schema.ts:103`, `settings-nycode.ts:176`, `local-env.ts:20`) e a skill `codegraph`.
- A2: settings `knowledge.*`, `hooks/internal/knowledge.ts`, o lembrete e o lint do vault no dispatch, e as menções a Obsidian.
- B11: extensão `import-claude-session` e `resources/bin/puxar/`.
- D2/D3: `src/migrations/from-pi*.ts` e a entrada em `main.ts:671`.
- C9: `guard.py`, `hooks/permissions/*.py` (motor `script`), `diag.py`, e as menções em `doctor.ts` e no `claude-compat`.
- B12: `services/public.ts`, `services/mobile-qr.ts` e os comandos `/mobile`, `/stickers`, `/upgrade`.
- C8 e C11: `/review-pr`, `/ralph-help`. B12: comando `/vim`, mas o motor fica.
- Os testes desses itens saem junto. A seção 6 da auditoria lista `test/harness/**`.

### F3. Retirada do Pessoal do repositório (depende de F1)
- Apagar de `resources/` os itens copiados em F1.
- C7: limpar as cerca de 100 citações restantes em 25 arquivos: remover, generalizar ("um revisor", "busca web") ou condicionar ("se `X` estiver instalado").
- C7: criar o teste de build que extrai os nomes citados nos recursos embutidos e falha se algum não existir.

### F4. Mudanças no núcleo e no harness
Lanes com arquivos disjuntos, no máximo 4 escritores ao mesmo tempo.
- **L1, prompt e regras:**
  - C1 e C2: `safety` com menos de 1 KB, fundido com a proteção genérica.
  - E1: regra de escopo em `src/core/system-prompt.ts`.
  - E2: `/init` sem visão geral do repositório.
  - `delivery-and-orchestration`: 2 a 3 linhas no prompt do harness.
  - `headless.md` e `lite.md` coerentes com o novo texto.
- **L2, permissões:**
  - C2: o guard TS nega `--no-verify` e `gh pr merge --admin`.
  - A4: sai `claude-home/.credentials.json`.
  - A5: plan mode por `readOnlyHint` + `plan.readOnlyTools`; agentes só-leitura derivados de `tools:`. Saem `READ_ONLY_MCP`, `READ_ONLY_AGENTS` e o regex do `kb.py`.
- **L3, extensões:**
  - B6: `auto-resume` importa os padrões de `@nycode/ai`.
  - B7: setting `bash.mainGuard`.
  - B9: `notify` única com `/notifications` e alias `/avisos`.
  - B10: setting `footer.stats`; `hook-msgs` sem o parser do impeccable.
  - C11: hook Stop do ralph só ao iniciar, `--max-iterations` padrão 20.
  - B12: setting `editorMode`.
  - C9: hook interno TS com as partes genéricas do dispatch, sem `bash` nem `jq`.
- **L4, agentes, comandos e config:**
  - C3: 4 agentes no núcleo e 3 no harness, com alias de tier.
  - C8: `/batch` com `general-purpose`; `/code-review` usa `pr-review` + `code-reviewer`.
  - A6: `PONYTAIL_SUBAGENT_MATCHER` derivado de `tools:`, e a lista de nomes sai dos defaults.
  - D1: `resources/.npmignore`.
  - A7: IDs `nycode:`.
  - A8: comentários de autoria viram razão técnica.

### F5. Ponytail 5 (B1)
Portar a v5.3.3 para `src/extensions/ponytail/{instructions,config}.ts` e para as 6 skills `ponytail*`, com o marcador `shortcut:`. Licença MIT mantida no `NOTICE`.

### F6. Idiomas (A9): plano próprio
Catálogo `en`/`pt-BR`, comandos em inglês com alias em português. Fica fora deste branch por ser grande; só começa depois do merge deste.

### F7. Verificação única e entrega
1. `ripple-hunt` estático e diff de antes e depois.
2. Gate completo uma vez no head final (`gate-runner`): build, typecheck, lint, todos os testes, o teste de C7, cobertura e `npm pack --dry-run`. Mais `structure.py` e `check-instructions`, agora a partir de `~/.nycode/agent/bin`.
3. Smoke ao vivo: sessão nova, `/skills`, `/agents`, um subagente `Explore`, `/code-review` num diff pequeno, plan mode com um MCP `readOnlyHint`.
4. `plan-reviewer` até `PLAN_REVIEW: complete`.
5. Entrega pelo `git-delivery`: commit, push, PR, CI e merge quando estiver verde.

### F8. Re-medir o ponytail (B1, depois do merge)
Um braço com e sem ponytail no bench do binário novo, dentro do teto de US$ 30 por noite. Só pede aprovação se passar de US$ 15.

## Riscos e rollback
- **Perder recursos do dono:** F1 é só aditiva e é checada contra a foto de F0 antes de F3.
- **Regressão de segurança ao tirar o `guard.py`:** o motor nativo já é o padrão. F7 roda os testes do guard nativo e os novos casos `--no-verify` e `--admin`.
- **Prompt menor com efeito no comportamento:** E1 e a nova `safety` têm evidência de custo zero. O bench de F8 mede junto.
- **Rollback:** reverter o merge do branch. As cópias pessoais de F1 continuam válidas com o binário antigo, que também lê `~/.nycode/agent`.

## Fora deste plano
- E3 (`nycode import claude-code|codex`).
- Retenção automática de sessões por setting.
- D4.
