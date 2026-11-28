# Inventario `dsh`: `packages-fs`

Total: **79** arquivos (`codigo`: 43, `teste`: 36, `gerado`: 0; `sem equivalente`: 3).

| Arquivo `dsh` | Categoria | Equivalente `nycode` | Nota |
|---|---|---|---|
| `packages/fs/fs-local/src/fsio.ts` | codigo | `packages/coding-agent/src/core/tools/` | seam de filesystem |
| `packages/fs/fs-local/src/index.ts` | codigo | `packages/coding-agent/src/core/tools/` | seam de filesystem |
| `packages/fs/fs-local/src/win32.ts` | codigo | `packages/coding-agent/src/core/tools/` | seam de filesystem |
| `packages/fs/fs-local/tests/filesystem.spec.ts` | teste | `packages/coding-agent/src/core/tools/` | seam de filesystem |
| `packages/fs/fs-local/tests/fsio.spec.ts` | teste | `packages/coding-agent/src/core/tools/` | seam de filesystem |
| `packages/fs/fs-local/tests/patch-mutations.spec.ts` | teste | `packages/coding-agent/src/core/tools/` | seam de filesystem |
| `packages/fs/fs-local/tests/watch.spec.ts` | teste | `packages/coding-agent/src/core/tools/` | seam de filesystem |
| `packages/fs/fs-local/tests/win32.spec.ts` | teste | `packages/coding-agent/src/core/tools/` | seam de filesystem |
| `packages/fs/fs-observation-policy/src/index.ts` | codigo | `sem equivalente` | gate read-before-write/edit |
| `packages/fs/fs-observation-policy/src/types.ts` | codigo | `sem equivalente` | gate read-before-write/edit |
| `packages/fs/fs-observation-policy/tests/policy.spec.ts` | teste | `sem equivalente` | gate read-before-write/edit |
| `packages/fs/fs-patch/src/apply.ts` | codigo | `packages/coding-agent/src/core/tools/edit.ts` | aplicacao de patch estilo apply_patch |
| `packages/fs/fs-patch/src/index.ts` | codigo | `packages/coding-agent/src/core/tools/edit.ts` | aplicacao de patch estilo apply_patch |
| `packages/fs/fs-patch/src/parse.ts` | codigo | `packages/coding-agent/src/core/tools/edit.ts` | aplicacao de patch estilo apply_patch |
| `packages/fs/fs-patch/src/types.ts` | codigo | `packages/coding-agent/src/core/tools/edit.ts` | aplicacao de patch estilo apply_patch |
| `packages/fs/fs-patch/tests/apply.spec.ts` | teste | `packages/coding-agent/src/core/tools/edit.ts` | aplicacao de patch estilo apply_patch |
| `packages/fs/fs-patch/tests/parse.spec.ts` | teste | `packages/coding-agent/src/core/tools/edit.ts` | aplicacao de patch estilo apply_patch |
| `packages/fs/fs-sandbox/src/containment.ts` | codigo | `packages/coding-agent/src/core/permissions/` | policy de FS por sandbox |
| `packages/fs/fs-sandbox/src/index.ts` | codigo | `packages/coding-agent/src/core/permissions/` | policy de FS por sandbox |
| `packages/fs/fs-sandbox/tests/containment.spec.ts` | teste | `packages/coding-agent/src/core/permissions/` | policy de FS por sandbox |
| `packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts` | teste | `packages/coding-agent/src/core/permissions/` | policy de FS por sandbox |
| `packages/fs/fs/src/errno.ts` | codigo | `packages/coding-agent/src/core/tools/` | seam de filesystem |
| `packages/fs/fs/src/index.ts` | codigo | `packages/coding-agent/src/core/tools/` | seam de filesystem |
| `packages/fs/fs/src/types.ts` | codigo | `packages/coding-agent/src/core/tools/` | seam de filesystem |
| `packages/fs/fs/tests/errno.spec.ts` | teste | `packages/coding-agent/src/core/tools/` | seam de filesystem |
| `packages/fs/fs/tests/service.spec.ts` | teste | `packages/coding-agent/src/core/tools/` | seam de filesystem |
| `packages/fs/tool-fs-search/src/direct-call.ts` | codigo | `packages/coding-agent/src/core/tools/grep.ts` | glob/grep via ripgrep |
| `packages/fs/tool-fs-search/src/glob.ts` | codigo | `packages/coding-agent/src/core/tools/grep.ts` | glob/grep via ripgrep |
| `packages/fs/tool-fs-search/src/grep.ts` | codigo | `packages/coding-agent/src/core/tools/grep.ts` | glob/grep via ripgrep |
| `packages/fs/tool-fs-search/src/index.ts` | codigo | `packages/coding-agent/src/core/tools/grep.ts` | glob/grep via ripgrep |
| `packages/fs/tool-fs-search/src/presentation.ts` | codigo | `packages/coding-agent/src/core/tools/grep.ts` | glob/grep via ripgrep |
| `packages/fs/tool-fs-search/src/ripgrep.d.ts` | codigo | `packages/coding-agent/src/core/tools/grep.ts` | glob/grep via ripgrep |
| `packages/fs/tool-fs-search/src/search-core.ts` | codigo | `packages/coding-agent/src/core/tools/grep.ts` | glob/grep via ripgrep |
| `packages/fs/tool-fs-search/tests/glob-native.perf.ts` | teste | `packages/coding-agent/src/core/tools/grep.ts` | glob/grep via ripgrep |
| `packages/fs/tool-fs-search/tests/integration.spec.ts` | teste | `packages/coding-agent/src/core/tools/grep.ts` | glob/grep via ripgrep |
| `packages/fs/tool-fs-search/tests/load-path.spec.ts` | teste | `packages/coding-agent/src/core/tools/grep.ts` | glob/grep via ripgrep |
| `packages/fs/tool-fs-search/tests/presentation-retention.spec.ts` | teste | `packages/coding-agent/src/core/tools/grep.ts` | glob/grep via ripgrep |
| `packages/fs/tool-fs-search/tests/presentation.spec.ts` | teste | `packages/coding-agent/src/core/tools/grep.ts` | glob/grep via ripgrep |
| `packages/fs/tool-fs-search/tests/rg-path.spec.ts` | teste | `packages/coding-agent/src/core/tools/grep.ts` | glob/grep via ripgrep |
| `packages/fs/tool-fs-search/tests/tools.spec.ts` | teste | `packages/coding-agent/src/core/tools/grep.ts` | glob/grep via ripgrep |
| `packages/fs/tool-fs/src/apply-patch-output.ts` | codigo | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/src/apply-patch-presentation.ts` | codigo | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/src/apply-patch.ts` | codigo | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/src/diff.ts` | codigo | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/src/edit.ts` | codigo | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/src/error.ts` | codigo | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/src/image-error.ts` | codigo | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/src/index.ts` | codigo | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/src/mutation-result.ts` | codigo | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/src/patch/execute.ts` | codigo | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/src/patch/index.ts` | codigo | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/src/patch/plan.ts` | codigo | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/src/patch/preflight.ts` | codigo | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/src/patch/types.ts` | codigo | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/src/read-image.ts` | codigo | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/src/read-render.ts` | codigo | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/src/read-target.ts` | codigo | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/src/read.ts` | codigo | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/src/sandbox.ts` | codigo | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/src/session-cwd.ts` | codigo | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/src/write.ts` | codigo | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/tests/apply-patch-presentation.spec.ts` | teste | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/tests/apply-patch.spec.ts` | teste | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/tests/diff.spec.ts` | teste | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/tests/error.spec.ts` | teste | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/tests/fs-tools.e2e.ts` | teste | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/tests/harness.ts` | teste | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/tests/integration.spec.ts` | teste | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/tests/patch/commit.spec.ts` | teste | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/tests/patch/harness.ts` | teste | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/tests/patch/preflight.spec.ts` | teste | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/tests/patch/resolution.spec.ts` | teste | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/tests/patch/success.spec.ts` | teste | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/tests/read-image.spec.ts` | teste | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/tests/read-render-retention.spec.ts` | teste | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/tests/read-render.spec.ts` | teste | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-fs/tests/tools.spec.ts` | teste | `packages/coding-agent/src/core/tools/` | read/write/edit/apply_patch/read_image |
| `packages/fs/tool-str-replace-editor/src/index.ts` | codigo | `packages/coding-agent/src/core/tools/edit.ts` | editor unificado minimal view/create/str_replace |
| `packages/fs/tool-str-replace-editor/tests/tools.spec.ts` | teste | `packages/coding-agent/src/core/tools/edit.ts` | editor unificado minimal view/create/str_replace |
