# Inventario: dot-omp

Cada linha cobre 1 arquivo rastreado em `~/source/oh-my-pi-ref` (`git ls-files`), com categoria, origem em relação ao Pi `v0.9.4`, dono equivalente no `nycode` (ou `sem equivalente`) e nota resumida verificada nos shards. Regras e totais em [../inventario.md](../inventario.md).

| Arquivo | Categoria | Origem | Dono no nycode | Nota |
|---|---|---|---|---|
| `.omp/commands/cleanup.md` | doc | omp-novo | `.nycode` | 103L; Comando autônomo de limpeza TS guiado por `scripts/cleanup-scan.ts`: seleciona 1 cluster preservando comportamento e superfície... |
| `.omp/commands/fix-issues.md` | doc | omp-novo | `.nycode` | 136L; Comando para corrigir issues do GitHub em paralelo via subagentes: exige reprodução local em `main` antes de criar worktree em ... |
| `.omp/commands/release.md` | doc | omp-novo | `.nycode` | 41L; Comando de release que delega bump de versões, `bun.lock`, CHANGELOGs, commit/tag, push e monitoramento do CI para `scripts/rel... |
| `.omp/commands/review-prs.md` | doc | omp-novo | `.nycode` | 128L; Comando de triagem e revisão paralela de PRs via subagentes: classifica como `slop`/`superseded`/`worthy`, usa `pr_checkout` + ... |
| `.omp/commands/triage.md` | doc | omp-novo | `.nycode` | 111L; Comando de triagem automática de issues recentes sem rótulo, aplicando taxonomia estrita (1 primário, `prio:p0..p3` para bugs, ... |
| `.omp/skills/semantic-compression/SKILL.md` | doc | omp-novo | `.nycode` | 142L; Skill detalhada para re-codificar prompts e docs em registro telegráfico baseado em frames e pontuação mantendo normatividade, ... |
| `.omp/skills/system-prompts/SKILL.md` | doc | omp-novo | `.nycode` | 182L; Guia editorial dos system prompts e tool prompts do omp: tags estruturais sem ornamentação, keywords RFC 2119 em caixa alta (`N... |
| `.omp/skills/system-prompts/small-models.md` | doc | omp-novo | `.nycode` | 65L; Guia específico para prompts de modelos pequenos (<=2B, ex. LFM2): máximo 3-5 regras positivas sem negações nem CoT ou exemplos... |
| `.omp/skills/tool-prompt-optimization/SKILL.md` | doc | omp-novo | `.nycode` | 116L; Skill que combina sonda empírica de inferência schema->prompt (com `git blame` obrigatório antes de podar scar tissue e control... |
| `.omp/skills/tool-prompt-optimization/scripts/probe-builtin.ts` | config_ou_dado | omp-novo | `.nycode` | 158L; Atalho CLI para `probe.ts` que instancia ferramentas built-in reais (incluindo `HIDDEN_TOOLS` e `GithubTool`), extrai o `toolWi... |
| `.omp/skills/tool-prompt-optimization/scripts/probe.ts` | config_ou_dado | omp-novo | `.nycode` | 225L; Script/API usando `@oh-my-pi/pi-ai` (`completeSimple`) para sondar um painel de 3 modelos em múltiplas amostras pedindo a recon... |
| `.omp/tests/tui.test.ts` | teste | omp-novo | `.nycode` | 228L; Testes de regressão da tool de debug TUI via PTY real, cobrindo args, resize, resposta DSR, validação UTF-8 no Windows, dimensõ... |
| `.omp/tools/bun.lock` | gerado | omp-novo | `.nycode` | 40L; Lockfile ou artefato gerado automaticamente (excluido) |
| `.omp/tools/package.json` | config_ou_dado | omp-novo | `.nycode` | 8L; Manifesto das dependências exclusivas das ferramentas locais do projeto (`.omp/tools`): `@napi-rs/canvas` para rasterização PNG... |
| `.omp/tools/tui.ts` | config_ou_dado | omp-novo | `.nycode` | 1565L; Parte 1 da ferramenta local `tui`: define a interface `TuiParams`, emulador `Screen` sobre `kitty-vt-wasm` (com tratamento de i... |
