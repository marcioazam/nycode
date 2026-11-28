# Inventario `dsh`: `packages-shell`

Total: **54** arquivos (`codigo`: 20, `teste`: 34, `gerado`: 0; `sem equivalente`: 0).

| Arquivo `dsh` | Categoria | Equivalente `nycode` | Nota |
|---|---|---|---|
| `packages/shell/bash-local/src/index.ts` | codigo | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/bash-local/tests/executor.spec.ts` | teste | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/bash-local/tests/settings.spec.ts` | teste | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/bash-sandbox/src/helpers.ts` | codigo | `packages/coding-agent/src/core/permissions/` | execucao bash sob sandbox |
| `packages/shell/bash-sandbox/src/index.ts` | codigo | `packages/coding-agent/src/core/permissions/` | execucao bash sob sandbox |
| `packages/shell/bash-sandbox/tests/bwrap.e2e.ts` | teste | `packages/coding-agent/src/core/permissions/` | execucao bash sob sandbox |
| `packages/shell/bash-sandbox/tests/fixtures/async-confinement-failure.ts` | teste | `packages/coding-agent/src/core/permissions/` | execucao bash sob sandbox |
| `packages/shell/bash-sandbox/tests/fixtures/pending-confinement.ts` | teste | `packages/coding-agent/src/core/permissions/` | execucao bash sob sandbox |
| `packages/shell/bash-sandbox/tests/foreground-timeout.spec.ts` | teste | `packages/coding-agent/src/core/permissions/` | execucao bash sob sandbox |
| `packages/shell/bash-sandbox/tests/landlock.e2e.ts` | teste | `packages/coding-agent/src/core/permissions/` | execucao bash sob sandbox |
| `packages/shell/bash-sandbox/tests/partial-landlock.spec.ts` | teste | `packages/coding-agent/src/core/permissions/` | execucao bash sob sandbox |
| `packages/shell/bash-sandbox/tests/sandbox.spec.ts` | teste | `packages/coding-agent/src/core/permissions/` | execucao bash sob sandbox |
| `packages/shell/bash-sandbox/tests/seatbelt.e2e.ts` | teste | `packages/coding-agent/src/core/permissions/` | execucao bash sob sandbox |
| `packages/shell/pwsh-local/src/index.ts` | codigo | `packages/coding-agent/src/core/tools/powershell.ts` | execucao PowerShell |
| `packages/shell/pwsh-local/src/resolve.ts` | codigo | `packages/coding-agent/src/core/tools/powershell.ts` | execucao PowerShell |
| `packages/shell/pwsh-local/tests/executor.spec.ts` | teste | `packages/coding-agent/src/core/tools/powershell.ts` | execucao PowerShell |
| `packages/shell/pwsh-local/tests/settings.spec.ts` | teste | `packages/coding-agent/src/core/tools/powershell.ts` | execucao PowerShell |
| `packages/shell/pwsh-sandbox/src/helpers.ts` | codigo | `packages/coding-agent/src/core/tools/powershell.ts` | execucao PowerShell |
| `packages/shell/pwsh-sandbox/src/index.ts` | codigo | `packages/coding-agent/src/core/tools/powershell.ts` | execucao PowerShell |
| `packages/shell/pwsh-sandbox/tests/acl.e2e.ts` | teste | `packages/coding-agent/src/core/tools/powershell.ts` | execucao PowerShell |
| `packages/shell/pwsh-sandbox/tests/foreground-timeout.spec.ts` | teste | `packages/coding-agent/src/core/tools/powershell.ts` | execucao PowerShell |
| `packages/shell/pwsh-sandbox/tests/sandbox.spec.ts` | teste | `packages/coding-agent/src/core/tools/powershell.ts` | execucao PowerShell |
| `packages/shell/shell-env/src/error.ts` | codigo | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/shell-env/src/index.ts` | codigo | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/shell-env/tests/shell-env.spec.ts` | teste | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/shell/src/index.ts` | codigo | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/shell/src/render.ts` | codigo | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/shell/src/types.ts` | codigo | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/shell/tests/render.spec.ts` | teste | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/shell/tests/service.spec.ts` | teste | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/tool-bash-persistent/src/index.ts` | codigo | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/tool-bash-persistent/tests/loader-composition.spec.ts` | teste | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/tool-bash-persistent/tests/tools.spec.ts` | teste | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/tool-bash/src/background.ts` | codigo | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/tool-bash/src/index.ts` | codigo | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/tool-bash/src/render.ts` | codigo | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/tool-bash/tests/background-start.spec.ts` | teste | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/tool-bash/tests/background.spec.ts` | teste | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/tool-bash/tests/integration.spec.ts` | teste | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/tool-bash/tests/tools.spec.ts` | teste | `packages/coding-agent/src/core/bash-executor.ts` | executor e tools shell |
| `packages/shell/tool-pwsh-persistent/src/index.ts` | codigo | `packages/coding-agent/src/core/tools/powershell.ts` | tool pwsh |
| `packages/shell/tool-pwsh-persistent/tests/loader-composition.spec.ts` | teste | `packages/coding-agent/src/core/tools/powershell.ts` | tool pwsh |
| `packages/shell/tool-pwsh-persistent/tests/readiness-timeline.spec.ts` | teste | `packages/coding-agent/src/core/tools/powershell.ts` | tool pwsh |
| `packages/shell/tool-pwsh-persistent/tests/readiness-timeline.ts` | teste | `packages/coding-agent/src/core/tools/powershell.ts` | tool pwsh |
| `packages/shell/tool-pwsh-persistent/tests/tools.spec.ts` | teste | `packages/coding-agent/src/core/tools/powershell.ts` | tool pwsh |
| `packages/shell/tool-pwsh/src/background.ts` | codigo | `packages/coding-agent/src/core/tools/powershell.ts` | tool pwsh |
| `packages/shell/tool-pwsh/src/index.ts` | codigo | `packages/coding-agent/src/core/tools/powershell.ts` | tool pwsh |
| `packages/shell/tool-pwsh/src/render.ts` | codigo | `packages/coding-agent/src/core/tools/powershell.ts` | tool pwsh |
| `packages/shell/tool-pwsh/tests/background-start.spec.ts` | teste | `packages/coding-agent/src/core/tools/powershell.ts` | tool pwsh |
| `packages/shell/tool-pwsh/tests/background.spec.ts` | teste | `packages/coding-agent/src/core/tools/powershell.ts` | tool pwsh |
| `packages/shell/tool-pwsh/tests/fixtures/loader/driver.ts` | teste | `packages/coding-agent/src/core/tools/powershell.ts` | tool pwsh |
| `packages/shell/tool-pwsh/tests/integration.spec.ts` | teste | `packages/coding-agent/src/core/tools/powershell.ts` | tool pwsh |
| `packages/shell/tool-pwsh/tests/loader.spec.ts` | teste | `packages/coding-agent/src/core/tools/powershell.ts` | tool pwsh |
| `packages/shell/tool-pwsh/tests/tools.spec.ts` | teste | `packages/coding-agent/src/core/tools/powershell.ts` | tool pwsh |
