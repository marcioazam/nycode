# Inventario: packages-core

OpenCode v2.4.2 (`fc31a485`) -> nycode (`00fed2ae`). 1010 arquivos de codigo. Gerado por regras de dono (ver `../inventario.md`, Metodo). Linhas = contagem de `\n`.

| Arquivo OpenCode | Linhas | Categoria | Equivalente nycode | Nota |
|---|---:|---|---|---|
| `packages/core/drizzle.config.ts` | 10 | codigo | `packages/coding-agent/src/core/` | core (fora de src) |
| `packages/core/perf/location.bench.ts` | 44 | codigo | `packages/coding-agent/src/core/` | core (fora de src) |
| `packages/core/perf/location.ts` | 140 | codigo | `packages/coding-agent/src/core/` | core (fora de src) |
| `packages/core/perf/session.bench.ts` | 22 | codigo | `packages/coding-agent/src/core/` | core (fora de src) |
| `packages/core/perf/snapshot.bench.ts` | 67 | codigo | `packages/coding-agent/src/core/` | core (fora de src) |
| `packages/core/perf/snapshot.ts` | 423 | codigo | `packages/coding-agent/src/core/` | core (fora de src) |
| `packages/core/script/build.ts` | 44 | codigo | `scripts/` | scripts do core |
| `packages/core/script/fix-node-pty.ts` | 28 | codigo | `scripts/` | scripts do core |
| `packages/core/script/generate-api-skill.ts` | 361 | codigo | `scripts/` | scripts do core |
| `packages/core/script/migration.ts` | 216 | codigo | `scripts/` | scripts do core |
| `packages/core/script/models-snapshot.ts` | 82 | codigo | `scripts/` | scripts do core |
| `packages/core/script/pack.ts` | 5 | codigo | `scripts/` | scripts do core |
| `packages/core/script/snapshot-parity-compare.ts` | 22 | codigo | `scripts/` | scripts do core |
| `packages/core/script/snapshot-parity-run.sh` | 20 | codigo | `scripts/` | scripts do core |
| `packages/core/script/snapshot-parity.ts` | 710 | codigo | `scripts/` | scripts do core |
| `packages/core/script/test.ts` | 53 | codigo | `scripts/` | scripts do core |
| `packages/core/script/update-models-snapshot.ts` | 14 | codigo | `scripts/` | scripts do core |
| `packages/core/script/wellknown-server.ts` | 112 | codigo | `scripts/` | scripts do core |
| `packages/core/src/account/sql.ts` | 36 | codigo | `packages/coding-agent/src/core/auth-storage.ts` | contas/credenciais |
| `packages/core/src/agent.ts` | 115 | codigo | `packages/coding-agent/src/extensions/subagent/` | definicao de agentes |
| `packages/core/src/aisdk-native.ts` | 397 | codigo | `packages/ai/src/api/` | adaptador AI SDK nativo |
| `packages/core/src/aisdk.ts` | 1063 | codigo | `packages/ai/src/api/` | adaptador AI SDK vs API propria |
| `packages/core/src/app.ts` | 31 | codigo | `packages/coding-agent/src/core/sdk.ts` | composicao do app |
| `packages/core/src/artifact.ts` | 617 | codigo | sem equivalente | artefatos de sessao |
| `packages/core/src/automation.ts` | 1292 | codigo | sem equivalente | automacoes (timer/cron/evento MCP); parcial: extensions/run, extensions/monitor |
| `packages/core/src/automation/author.ts` | 10 | codigo | sem equivalente | automacoes (timer/cron/evento MCP); parcial: extensions/run, extensions/monitor |
| `packages/core/src/automation/code.ts` | 262 | codigo | sem equivalente | automacoes (timer/cron/evento MCP); parcial: extensions/run, extensions/monitor |
| `packages/core/src/automation/event.ts` | 35 | codigo | sem equivalente | automacoes (timer/cron/evento MCP); parcial: extensions/run, extensions/monitor |
| `packages/core/src/automation/shell.ts` | 82 | codigo | sem equivalente | automacoes (timer/cron/evento MCP); parcial: extensions/run, extensions/monitor |
| `packages/core/src/automation/sql.ts` | 50 | codigo | sem equivalente | automacoes (timer/cron/evento MCP); parcial: extensions/run, extensions/monitor |
| `packages/core/src/blob-store.ts` | 115 | codigo | `packages/coding-agent/src/core/session-manager.ts` | blobs em SQLite vs JSONL |
| `packages/core/src/bus.ts` | 909 | codigo | `packages/coding-agent/src/core/event-bus.ts` | barramento de eventos |
| `packages/core/src/codemode/api.ts` | 40 | codigo | `packages/coding-agent/src/extensions/codemode/` | Code Mode no core |
| `packages/core/src/codemode/bun.ts` | 552 | codigo | `packages/coding-agent/src/extensions/codemode/` | Code Mode no core |
| `packages/core/src/codemode/catalog.ts` | 177 | codigo | `packages/coding-agent/src/extensions/codemode/` | Code Mode no core |
| `packages/core/src/codemode/diffs.ts` | 134 | codigo | `packages/coding-agent/src/extensions/codemode/` | Code Mode no core |
| `packages/core/src/codemode/execution.ts` | 9 | codigo | `packages/coding-agent/src/extensions/codemode/` | Code Mode no core |
| `packages/core/src/codemode/fetch.ts` | 172 | codigo | `packages/coding-agent/src/extensions/codemode/` | Code Mode no core |
| `packages/core/src/codemode/instructions.ts` | 169 | codigo | `packages/coding-agent/src/extensions/codemode/` | Code Mode no core |
| `packages/core/src/codemode/job.ts` | 144 | codigo | `packages/coding-agent/src/extensions/codemode/` | Code Mode no core |
| `packages/core/src/codemode/path.ts` | 45 | codigo | `packages/coding-agent/src/extensions/codemode/` | Code Mode no core |
| `packages/core/src/codemode/tool.ts` | 570 | codigo | `packages/coding-agent/src/extensions/codemode/` | Code Mode no core |
| `packages/core/src/command.ts` | 109 | codigo | `packages/coding-agent/src/core/prompt-templates.ts` | comandos markdown |
| `packages/core/src/config.ts` | 574 | codigo | `packages/coding-agent/src/core/settings-manager.ts` | configuracao |
| `packages/core/src/config/discovery.ts` | 179 | codigo | `packages/coding-agent/src/core/settings-manager.ts` | configuracao |
| `packages/core/src/config/integration.ts` | 134 | codigo | `packages/coding-agent/src/core/settings-manager.ts` | configuracao |
| `packages/core/src/config/managed.ts` | 6 | codigo | `packages/coding-agent/src/core/settings-manager.ts` | configuracao |
| `packages/core/src/config/markdown.ts` | 123 | codigo | `packages/coding-agent/src/core/settings-manager.ts` | configuracao |
| `packages/core/src/config/normalize.ts` | 870 | codigo | `packages/coding-agent/src/core/settings-manager.ts` | configuracao |
| `packages/core/src/config/plugin/agent.ts` | 192 | codigo | `packages/coding-agent/src/extensions/subagent/` | config de agentes |
| `packages/core/src/config/plugin/command.ts` | 229 | codigo | `packages/coding-agent/src/core/prompt-templates.ts` | config de comandos |
| `packages/core/src/config/plugin/compaction.ts` | 27 | codigo | `packages/coding-agent/src/core/compaction/` | config de compactacao |
| `packages/core/src/config/plugin/compatibility.ts` | 94 | codigo | `packages/coding-agent/src/core/settings-manager.ts` | configuracao |
| `packages/core/src/config/plugin/entry-observer.ts` | 79 | codigo | `packages/coding-agent/src/core/settings-manager.ts` | configuracao |
| `packages/core/src/config/plugin/formatter.ts` | 76 | codigo | sem equivalente | formatadores |
| `packages/core/src/config/plugin/image.ts` | 29 | codigo | `packages/coding-agent/src/core/settings-manager.ts` | configuracao |
| `packages/core/src/config/plugin/instruction.ts` | 260 | codigo | `packages/coding-agent/src/core/resource-loader.ts` | instrucoes |
| `packages/core/src/config/plugin/location-watcher.ts` | 22 | codigo | `packages/coding-agent/src/core/settings-manager.ts` | configuracao |
| `packages/core/src/config/plugin/mcp.ts` | 57 | codigo | `packages/coding-agent/src/core/mcp-servers.ts` | config MCP |
| `packages/core/src/config/plugin/policy.ts` | 117 | codigo | `packages/coding-agent/src/core/permissions/` | politica |
| `packages/core/src/config/plugin/provider.ts` | 274 | codigo | `packages/coding-agent/src/core/model-registry.ts` | provedores |
| `packages/core/src/config/plugin/reference.ts` | 67 | codigo | `packages/coding-agent/src/core/settings-manager.ts` | configuracao |
| `packages/core/src/config/plugin/session-search.ts` | 21 | codigo | `packages/coding-agent/src/core/settings-manager.ts` | configuracao |
| `packages/core/src/config/plugin/shell.ts` | 20 | codigo | `packages/coding-agent/src/core/settings-manager.ts` | configuracao |
| `packages/core/src/config/plugin/skill-file.ts` | 62 | codigo | `packages/coding-agent/src/core/skills.ts` | config de skills |
| `packages/core/src/config/plugin/skill-scan.ts` | 46 | codigo | `packages/coding-agent/src/core/skills.ts` | config de skills |
| `packages/core/src/config/plugin/skill.ts` | 202 | codigo | `packages/coding-agent/src/core/skills.ts` | config de skills |
| `packages/core/src/config/plugin/snapshot.ts` | 21 | codigo | `packages/coding-agent/src/extensions/git-checkpoint/` | config de snapshots |
| `packages/core/src/config/plugin/source.ts` | 194 | codigo | `packages/coding-agent/src/core/settings-manager.ts` | configuracao |
| `packages/core/src/config/plugin/tool-output.ts` | 24 | codigo | `packages/coding-agent/src/core/tools/truncate.ts` | config de truncamento |
| `packages/core/src/config/plugin/websearch.ts` | 19 | codigo | `packages/coding-agent/src/extensions/web/` | busca web |
| `packages/core/src/config/plugin/worktree.ts` | 35 | codigo | sem equivalente | worktrees |
| `packages/core/src/config/variable.ts` | 84 | codigo | `packages/coding-agent/src/core/settings-manager.ts` | configuracao |
| `packages/core/src/config/watch.ts` | 73 | codigo | `packages/coding-agent/src/core/settings-manager.ts` | configuracao |
| `packages/core/src/console-access.ts` | 22 | codigo | sem equivalente | console opencode.ai |
| `packages/core/src/credential.ts` | 350 | codigo | `packages/coding-agent/src/core/auth-storage.ts` | credenciais em SQLite vs auth.json |
| `packages/core/src/credential/sql.ts` | 14 | codigo | `packages/coding-agent/src/core/auth-storage.ts` | credenciais em SQLite vs auth.json |
| `packages/core/src/database/batch.ts` | 21 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/database.ts` | 126 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/drizzle.ts` | 1 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/drizzle/effect-sqlite/driver.ts` | 78 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/drizzle/effect-sqlite/index.ts` | 4 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/drizzle/effect-sqlite/session.ts` | 156 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/drizzle/index.ts` | 5 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/drizzle/internal/drizzle-utils.ts` | 147 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/drizzle/sqlite-core/effect/count.ts` | 58 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/drizzle/sqlite-core/effect/db.ts` | 243 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/drizzle/sqlite-core/effect/delete.ts` | 261 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/drizzle/sqlite-core/effect/index.ts` | 10 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/drizzle/sqlite-core/effect/insert.ts` | 340 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/drizzle/sqlite-core/effect/query.ts` | 198 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/drizzle/sqlite-core/effect/raw.ts` | 49 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/drizzle/sqlite-core/effect/select.ts` | 278 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/drizzle/sqlite-core/effect/session.ts` | 421 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/drizzle/sqlite-core/effect/update.ts` | 402 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration.gen.ts` | 132 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration.ts` | 155 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260127222353_familiar_lady_ursula.ts` | 109 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260211171708_add_project_commands.ts` | 13 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260213144116_wakeful_the_professor.ts` | 25 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260225215848_workspace.ts` | 21 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260227213759_add_session_workspace_id.ts` | 14 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260228203230_blue_harpoon.ts` | 32 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260303231226_add_workspace_fields.ts` | 17 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260309230000_move_org_to_state.ts` | 17 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260312043431_session_message_cursor.ts` | 18 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260323234822_events.ts` | 28 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260410174513_workspace-name.ts` | 34 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260413175956_chief_energizer.ts` | 26 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260423070820_add_icon_url_override.ts` | 16 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260427172553_slow_nightmare.ts` | 32 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260428004200_add_session_path.ts` | 13 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260501142318_next_venus.ts` | 14 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260504145000_add_sync_owner.ts` | 13 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260507164347_add_workspace_time.ts` | 13 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260510033149_session_usage.ts` | 58 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260511000411_data_migration_state.ts` | 18 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260511173437_session-metadata.ts` | 18 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260601010001_normalize_storage_paths.ts` | 24 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260601202201_amazing_prowler.ts` | 13 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260602002951_lowly_union_jack.ts` | 26 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260602182828_add_project_directories.ts` | 22 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260603001617_session_message_projection_indexes.ts` | 21 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260603040000_session_message_projection_order.ts` | 21 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260603141458_session_input_inbox.ts` | 27 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260603160727_jittery_ezekiel_stane.ts` | 22 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260604172448_event_sourced_session_input.ts` | 49 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260605003541_add_session_context_snapshot.ts` | 23 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260605042240_add_context_epoch_agent.ts` | 13 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260611035744_credential.ts` | 27 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260611192811_lush_chimera.ts` | 27 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260612174303_project_dir_strategy.ts` | 31 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260622142730_simplify_session_context_epoch.ts` | 15 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260622170816_reset_v2_session_state.ts` | 17 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260622202450_simplify_session_input.ts` | 19 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260804233008_loose_psylocke.ts` | 173 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260805200742_import_legacy_credentials.ts` | 109 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260808023530_workspace_domain.ts` | 22 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260811161259_execution_claim_attempts.ts` | 13 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260812181746_session_inbox.ts` | 30 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260812213948_worktree.ts` | 35 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260819222447_session_viewed_state.ts` | 15 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260823191254_nullable_workspace_binding.ts` | 27 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260910120000_clear_v1_session_permission.ts` | 13 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20260923013825_project_time_active.ts` | 14 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20261007190000_azure_cli_external_credential.ts` | 21 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20261010180456_project_time_archived.ts` | 13 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20261024002554_session_allowance.ts` | 13 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20261024175301_drop_session_allowance.ts` | 13 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20261025123711_blob.ts` | 36 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20261025154125_drop_session_pending.ts` | 16 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20261026223005_schedule.ts` | 38 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20261029002625_session_part.ts` | 30 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20261029073502_session_time_busy.ts` | 13 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20261029165540_schedule_checks.ts` | 16 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20261030054400_job.ts` | 60 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20261116043204_automation.ts` | 83 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20261116181958_automation_event_position.ts` | 13 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20261116213417_automation_active_index.ts` | 16 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20261119211416_machine.ts` | 18 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/migration/20261120004954_machine-key.ts` | 14 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/path.ts` | 98 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/schema.gen.ts` | 363 | gerado | sem equivalente | gerado: excluido da analise; SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/schema.sql.ts` | 10 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/sqlite.bun.ts` | 17 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/sqlite.node.ts` | 25 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/sqlite.workerd.ts` | 227 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/storage-failure.ts` | 45 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/v1-migration.bun.ts` | 1234 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/v1-migration.noop.ts` | 11 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/database/v1-migration.ts` | 2 | codigo | sem equivalente | SQLite/drizzle; nycode persiste em JSONL (core/session-manager.ts) |
| `packages/core/src/effect/app-node-builder.ts` | 30 | codigo | sem equivalente | runtime Effect; nycode nao usa Effect |
| `packages/core/src/effect/app-node-platform.ts` | 71 | codigo | sem equivalente | runtime Effect; nycode nao usa Effect |
| `packages/core/src/effect/client-tls/client-tls.bun.ts` | 8 | codigo | sem equivalente | runtime Effect; nycode nao usa Effect |
| `packages/core/src/effect/client-tls/client-tls.node.ts` | 17 | codigo | sem equivalente | runtime Effect; nycode nao usa Effect |
| `packages/core/src/effect/client-tls/client-tls.ts` | 12 | codigo | sem equivalente | runtime Effect; nycode nao usa Effect |
| `packages/core/src/effect/client-tls/client-tls.workerd.ts` | 8 | codigo | sem equivalente | runtime Effect; nycode nao usa Effect |
| `packages/core/src/effect/keyed-mutex.ts` | 45 | codigo | sem equivalente | runtime Effect; nycode nao usa Effect |
| `packages/core/src/effect/websocket-constructor.ts` | 81 | codigo | sem equivalente | runtime Effect; nycode nao usa Effect |
| `packages/core/src/environment/driver.ts` | 68 | codigo | `packages/env/src/` | ambiente de execucao |
| `packages/core/src/environment/environment.ts` | 152 | codigo | `packages/env/src/` | ambiente de execucao |
| `packages/core/src/environment/environments.ts` | 78 | codigo | `packages/env/src/` | ambiente de execucao |
| `packages/core/src/environment/exec-defaults.ts` | 200 | codigo | `packages/env/src/` | ambiente de execucao |
| `packages/core/src/environment/files.ts` | 79 | codigo | `packages/env/src/` | ambiente de execucao |
| `packages/core/src/environment/index.ts` | 34 | codigo | `packages/env/src/` | ambiente de execucao |
| `packages/core/src/environment/local.ts` | 101 | codigo | `packages/env/src/` | ambiente de execucao |
| `packages/core/src/environment/memory.ts` | 186 | codigo | `packages/env/src/` | ambiente de execucao |
| `packages/core/src/environment/path.ts` | 68 | codigo | `packages/env/src/` | ambiente de execucao |
| `packages/core/src/environment/unavailable.ts` | 17 | codigo | `packages/env/src/` | ambiente de execucao |
| `packages/core/src/event-logger.ts` | 19 | codigo | `packages/coding-agent/src/core/telemetry.ts` | log de eventos |
| `packages/core/src/event/sql.ts` | 26 | codigo | sem equivalente | tabela de eventos SQLite |
| `packages/core/src/file-access.ts` | 352 | codigo | `packages/coding-agent/src/core/tools/path-utils.ts` | controle de acesso a arquivos |
| `packages/core/src/file-mutation.ts` | 194 | codigo | `packages/coding-agent/src/core/tools/file-mutation-queue.ts` | fila de mutacao |
| `packages/core/src/file-retention.ts` | 23 | codigo | sem equivalente | retencao de arquivos |
| `packages/core/src/file-write.ts` | 110 | codigo | `packages/coding-agent/src/core/tools/write.ts` | escrita |
| `packages/core/src/filesystem.ts` | 270 | codigo | `packages/coding-agent/src/core/tools/find.ts` | busca/watch de FS; grep em core/tools/grep.ts |
| `packages/core/src/filesystem/fff.bun.ts` | 15 | codigo | `packages/coding-agent/src/core/tools/find.ts` | busca/watch de FS; grep em core/tools/grep.ts |
| `packages/core/src/filesystem/fff.node.ts` | 12 | codigo | `packages/coding-agent/src/core/tools/find.ts` | busca/watch de FS; grep em core/tools/grep.ts |
| `packages/core/src/filesystem/fff.ts` | 67 | codigo | `packages/coding-agent/src/core/tools/find.ts` | busca/watch de FS; grep em core/tools/grep.ts |
| `packages/core/src/filesystem/fff.workerd.ts` | 12 | codigo | `packages/coding-agent/src/core/tools/find.ts` | busca/watch de FS; grep em core/tools/grep.ts |
| `packages/core/src/filesystem/file-watch.ts` | 164 | codigo | `packages/coding-agent/src/core/tools/find.ts` | busca/watch de FS; grep em core/tools/grep.ts |
| `packages/core/src/filesystem/location-watcher-policy.ts` | 64 | codigo | `packages/coding-agent/src/core/tools/find.ts` | busca/watch de FS; grep em core/tools/grep.ts |
| `packages/core/src/filesystem/location-watcher.ts` | 108 | codigo | `packages/coding-agent/src/core/tools/find.ts` | busca/watch de FS; grep em core/tools/grep.ts |
| `packages/core/src/filesystem/protected.ts` | 31 | codigo | `packages/coding-agent/src/core/tools/find.ts` | busca/watch de FS; grep em core/tools/grep.ts |
| `packages/core/src/filesystem/search.ts` | 251 | codigo | `packages/coding-agent/src/core/tools/find.ts` | busca/watch de FS; grep em core/tools/grep.ts |
| `packages/core/src/filesystem/watcher-binding.ts` | 14 | codigo | `packages/coding-agent/src/core/tools/find.ts` | busca/watch de FS; grep em core/tools/grep.ts |
| `packages/core/src/filesystem/watcher.ts` | 282 | codigo | `packages/coding-agent/src/core/tools/find.ts` | busca/watch de FS; grep em core/tools/grep.ts |
| `packages/core/src/flag.ts` | 64 | codigo | `packages/coding-agent/src/core/experimental.ts` | flags |
| `packages/core/src/flag/resolve.ts` | 66 | codigo | `packages/coding-agent/src/core/experimental.ts` | flags |
| `packages/core/src/form.ts` | 370 | codigo | `packages/coding-agent/src/extensions/question/` | formularios ao usuario |
| `packages/core/src/formatter.ts` | 108 | codigo | sem equivalente | formatador pos-edicao; proximo: extensions/syntax-check |
| `packages/core/src/formatter/builtins.ts` | 294 | codigo | sem equivalente | formatador pos-edicao; proximo: extensions/syntax-check |
| `packages/core/src/generate.ts` | 397 | codigo | sem equivalente | geracao (imagem/video/voz) |
| `packages/core/src/git.ts` | 1609 | codigo | `packages/coding-agent/src/extensions/git-checkpoint/` | git |
| `packages/core/src/github-copilot/models.ts` | 289 | codigo | `packages/ai/src/providers/github-copilot.ts` | modelos Copilot |
| `packages/core/src/image.ts` | 95 | codigo | `packages/coding-agent/src/utils/image-process.ts` | processamento de imagem |
| `packages/core/src/image/notice.ts` | 8 | codigo | `packages/coding-agent/src/utils/image-process.ts` | processamento de imagem |
| `packages/core/src/image/photon-normalize.ts` | 148 | codigo | `packages/coding-agent/src/utils/image-process.ts` | processamento de imagem |
| `packages/core/src/image/photon-wasm.bun.ts` | 4 | codigo | `packages/coding-agent/src/utils/image-process.ts` | processamento de imagem |
| `packages/core/src/image/photon-wasm.node.ts` | 4 | codigo | `packages/coding-agent/src/utils/image-process.ts` | processamento de imagem |
| `packages/core/src/image/photon-wasm.workerd.ts` | 4 | codigo | `packages/coding-agent/src/utils/image-process.ts` | processamento de imagem |
| `packages/core/src/image/photon-worker.ts` | 26 | codigo | `packages/coding-agent/src/utils/image-process.ts` | processamento de imagem |
| `packages/core/src/image/photon.ts` | 156 | codigo | `packages/coding-agent/src/utils/image-process.ts` | processamento de imagem |
| `packages/core/src/instance.ts` | 191 | codigo | `packages/coding-agent/src/core/agent-session-runtime.ts` | instancia por projeto |
| `packages/core/src/instance/service.ts` | 21 | codigo | `packages/coding-agent/src/core/agent-session-runtime.ts` | instancia por projeto |
| `packages/core/src/instruction-discovery.ts` | 165 | codigo | `packages/coding-agent/src/core/resource-loader.ts` | AGENTS.md/instrucoes |
| `packages/core/src/instructions/agent.ts` | 50 | codigo | `packages/coding-agent/src/core/resource-loader.ts` | instrucoes |
| `packages/core/src/instructions/builtins.ts` | 103 | codigo | `packages/coding-agent/src/core/resource-loader.ts` | instrucoes |
| `packages/core/src/instructions/index.ts` | 287 | codigo | `packages/coding-agent/src/core/resource-loader.ts` | instrucoes |
| `packages/core/src/integration.ts` | 869 | codigo | sem equivalente | integracoes gerenciadas |
| `packages/core/src/integration/connection.ts` | 26 | codigo | sem equivalente | integracoes gerenciadas |
| `packages/core/src/job.ts` | 767 | codigo | `packages/coding-agent/src/extensions/subagent/` | jobs em background; shell em extensions/run |
| `packages/core/src/job/list.ts` | 160 | codigo | `packages/coding-agent/src/extensions/subagent/` | jobs em background; shell em extensions/run |
| `packages/core/src/job/recovery.ts` | 51 | codigo | `packages/coding-agent/src/extensions/subagent/` | jobs em background; shell em extensions/run |
| `packages/core/src/job/sql.ts` | 27 | codigo | `packages/coding-agent/src/extensions/subagent/` | jobs em background; shell em extensions/run |
| `packages/core/src/kv.ts` | 92 | codigo | sem equivalente | kv store |
| `packages/core/src/kv/sql.ts` | 9 | codigo | sem equivalente | kv store |
| `packages/core/src/location-activity.ts` | 130 | codigo | `packages/coding-agent/src/core/session-cwd.ts` | localizacao/cwd |
| `packages/core/src/location-lifecycle.ts` | 97 | codigo | `packages/coding-agent/src/core/session-cwd.ts` | localizacao/cwd |
| `packages/core/src/location-service-map.ts` | 50 | codigo | `packages/coding-agent/src/core/session-cwd.ts` | localizacao/cwd |
| `packages/core/src/location-services.ts` | 125 | codigo | `packages/coding-agent/src/core/session-cwd.ts` | localizacao/cwd |
| `packages/core/src/location.ts` | 44 | codigo | `packages/coding-agent/src/core/session-cwd.ts` | localizacao/cwd |
| `packages/core/src/machine/driver.ts` | 553 | codigo | sem equivalente | maquinas remotas (iroh/noise); nycode tem apps/p3 fora de packages/* |
| `packages/core/src/machine/frames.ts` | 133 | codigo | sem equivalente | maquinas remotas (iroh/noise); nycode tem apps/p3 fora de packages/* |
| `packages/core/src/machine/identity.ts` | 187 | codigo | sem equivalente | maquinas remotas (iroh/noise); nycode tem apps/p3 fora de packages/* |
| `packages/core/src/machine/index.ts` | 14 | codigo | sem equivalente | maquinas remotas (iroh/noise); nycode tem apps/p3 fora de packages/* |
| `packages/core/src/machine/instructions.ts` | 61 | codigo | sem equivalente | maquinas remotas (iroh/noise); nycode tem apps/p3 fora de packages/* |
| `packages/core/src/machine/iroh-binding.ts` | 18 | codigo | sem equivalente | maquinas remotas (iroh/noise); nycode tem apps/p3 fora de packages/* |
| `packages/core/src/machine/iroh.ts` | 157 | codigo | sem equivalente | maquinas remotas (iroh/noise); nycode tem apps/p3 fora de packages/* |
| `packages/core/src/machine/join.ts` | 54 | codigo | sem equivalente | maquinas remotas (iroh/noise); nycode tem apps/p3 fora de packages/* |
| `packages/core/src/machine/link.ts` | 313 | codigo | sem equivalente | maquinas remotas (iroh/noise); nycode tem apps/p3 fora de packages/* |
| `packages/core/src/machine/machines.ts` | 400 | codigo | sem equivalente | maquinas remotas (iroh/noise); nycode tem apps/p3 fora de packages/* |
| `packages/core/src/machine/noise.ts` | 326 | codigo | sem equivalente | maquinas remotas (iroh/noise); nycode tem apps/p3 fora de packages/* |
| `packages/core/src/machine/sql.ts` | 13 | codigo | sem equivalente | maquinas remotas (iroh/noise); nycode tem apps/p3 fora de packages/* |
| `packages/core/src/machine/wire.ts` | 180 | codigo | sem equivalente | maquinas remotas (iroh/noise); nycode tem apps/p3 fora de packages/* |
| `packages/core/src/machine/worker-client.ts` | 276 | codigo | sem equivalente | maquinas remotas (iroh/noise); nycode tem apps/p3 fora de packages/* |
| `packages/core/src/managed-policy.ts` | 65 | codigo | `packages/coding-agent/src/core/permissions/global-settings.ts` | politica gerenciada |
| `packages/core/src/markdown.d.ts` | 4 | codigo | sem equivalente | declaracao de tipos |
| `packages/core/src/mcp/client.ts` | 1194 | codigo | `packages/mcp/src/` | cliente MCP |
| `packages/core/src/mcp/connection.ts` | 294 | codigo | `packages/mcp/src/` | cliente MCP |
| `packages/core/src/mcp/event-stream.ts` | 34 | codigo | `packages/mcp/src/` | cliente MCP |
| `packages/core/src/mcp/index.ts` | 1350 | codigo | `packages/mcp/src/` | cliente MCP |
| `packages/core/src/mcp/instructions.ts` | 108 | codigo | `packages/mcp/src/` | cliente MCP |
| `packages/core/src/mcp/oauth.ts` | 665 | codigo | `packages/mcp/src/` | cliente MCP |
| `packages/core/src/mcp/pool.ts` | 392 | codigo | `packages/mcp/src/` | cliente MCP |
| `packages/core/src/mcp/socket-client.ts` | 86 | codigo | `packages/mcp/src/` | cliente MCP |
| `packages/core/src/mcp/stdio.ts` | 227 | codigo | `packages/mcp/src/` | cliente MCP |
| `packages/core/src/mime.ts` | 75 | codigo | `packages/coding-agent/src/utils/mime.ts` | mime |
| `packages/core/src/modal/models.ts` | 150 | codigo | sem equivalente | modelos Modal |
| `packages/core/src/model-resolver.ts` | 639 | codigo | `packages/coding-agent/src/core/model-resolver.ts` | resolucao de modelo |
| `packages/core/src/model-retry.ts` | 134 | codigo | `packages/agent/src/agent-loop.ts` | retry de modelo; ver matriz |
| `packages/core/src/model.ts` | 373 | codigo | `packages/coding-agent/src/core/model-registry.ts` | registro de modelos |
| `packages/core/src/models-dev.ts` | 899 | codigo | `packages/ai/src/model-catalog.ts` | catalogo models.dev |
| `packages/core/src/models-dev/v1.ts` | 203 | codigo | `packages/ai/src/model-catalog.ts` | catalogo models.dev |
| `packages/core/src/node-ffi.d.ts` | 18 | codigo | sem equivalente | declaracao de tipos |
| `packages/core/src/oauth/page.ts` | 276 | codigo | `packages/ai/src/oauth.ts` | pagina/redirect OAuth |
| `packages/core/src/oauth/redirect.ts` | 42 | codigo | `packages/ai/src/oauth.ts` | pagina/redirect OAuth |
| `packages/core/src/permission.ts` | 419 | codigo | `packages/coding-agent/src/core/permissions/` | permissoes |
| `packages/core/src/permission/policy.ts` | 240 | codigo | `packages/coding-agent/src/core/permissions/` | permissoes |
| `packages/core/src/permission/saved.ts` | 140 | codigo | `packages/coding-agent/src/core/permissions/` | permissoes |
| `packages/core/src/permission/sql.ts` | 20 | codigo | `packages/coding-agent/src/core/permissions/` | permissoes |
| `packages/core/src/persistent-pty.ts` | 1 | codigo | sem equivalente | PTY persistente |
| `packages/core/src/persistent-pty/binary.bun.ts` | 85 | codigo | sem equivalente | PTY persistente |
| `packages/core/src/persistent-pty/binary.node.ts` | 5 | codigo | sem equivalente | PTY persistente |
| `packages/core/src/persistent-pty/binary.workerd.ts` | 5 | codigo | sem equivalente | PTY persistente |
| `packages/core/src/persistent-pty/daemon.ts` | 750 | codigo | sem equivalente | PTY persistente |
| `packages/core/src/persistent-pty/index.ts` | 661 | codigo | sem equivalente | PTY persistente |
| `packages/core/src/persistent-pty/pty-binding.ts` | 6 | codigo | sem equivalente | PTY persistente |
| `packages/core/src/plugin.ts` | 320 | codigo | `packages/coding-agent/src/core/extensions/` | sistema de plugins |
| `packages/core/src/plugin/agent.ts` | 119 | codigo | `packages/coding-agent/src/extensions/subagent/` | agentes |
| `packages/core/src/plugin/command.ts` | 113 | codigo | `packages/coding-agent/src/core/slash-commands.ts` | comandos |
| `packages/core/src/plugin/fork-notice.ts` | 30 | codigo | `packages/coding-agent/src/core/extensions/` | sistema de plugins |
| `packages/core/src/plugin/goal.ts` | 501 | codigo | `packages/coding-agent/src/extensions/goal/` | /goal |
| `packages/core/src/plugin/home-memory.ts` | 155 | codigo | `packages/coding-agent/src/extensions/memory/` | memoria |
| `packages/core/src/plugin/hooks.ts` | 108 | codigo | `packages/coding-agent/src/core/extensions/` | sistema de plugins |
| `packages/core/src/plugin/host.ts` | 770 | codigo | `packages/coding-agent/src/core/extensions/` | sistema de plugins |
| `packages/core/src/plugin/identity.ts` | 31 | codigo | `packages/coding-agent/src/core/extensions/` | sistema de plugins |
| `packages/core/src/plugin/instance.ts` | 45 | codigo | `packages/coding-agent/src/core/extensions/` | sistema de plugins |
| `packages/core/src/plugin/internal.ts` | 360 | codigo | `packages/coding-agent/src/core/extensions/` | sistema de plugins |
| `packages/core/src/plugin/mcp-codemode-defaults.ts` | 41 | codigo | `packages/coding-agent/src/extensions/mcp/` | MCP |
| `packages/core/src/plugin/mcp-skill.ts` | 171 | codigo | `packages/coding-agent/src/extensions/mcp/` | MCP |
| `packages/core/src/plugin/models-dev.ts` | 119 | codigo | `packages/ai/src/model-catalog.ts` | models.dev |
| `packages/core/src/plugin/module.ts` | 186 | codigo | `packages/coding-agent/src/core/extensions/` | sistema de plugins |
| `packages/core/src/plugin/optimize.ts` | 97 | codigo | `packages/coding-agent/src/core/extensions/` | sistema de plugins |
| `packages/core/src/plugin/plan.ts` | 50 | codigo | `packages/coding-agent/src/extensions/plan-mode/` | modo plano |
| `packages/core/src/plugin/promise.ts` | 3 | codigo | `packages/coding-agent/src/core/extensions/` | sistema de plugins |
| `packages/core/src/plugin/provider.ts` | 64 | codigo | `packages/coding-agent/src/core/extensions/` | sistema de plugins |
| `packages/core/src/plugin/provider/amazon-bedrock.ts` | 121 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/azure.ts` | 568 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/cerebras.ts` | 16 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/chatgpt.ts` | 594 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/aisdk.ts` | 36 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/claude/accounts.ts` | 104 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/claude/agent-sdk.ts` | 1 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/claude/agent-sdk.workerd.ts` | 4 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/claude/claude-folder-worker.ts` | 10 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/claude/fork.ts` | 34 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/claude/io.ts` | 88 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/claude/probe.ts` | 124 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/claude/query-options.ts` | 143 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/claude/sdk.ts` | 17 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/claude/session.ts` | 162 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/claude/sessions.ts` | 508 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/claude/status.ts` | 66 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/claude/websearch.ts` | 96 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/index.ts` | 63 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/instructions.ts` | 54 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/integration.ts` | 62 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/language-model/claude-agent-error.ts` | 49 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/language-model/claude-agent-language-model.ts` | 112 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/language-model/convert-claude-stream.ts` | 139 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/language-model/convert-to-claude-message.ts` | 55 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/language-model/request-kind.ts` | 5 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/language-model/system-prompt.ts` | 28 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/language-model/usage.ts` | 58 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/provider.ts` | 178 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/session.ts` | 61 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/sync/catch-up.ts` | 21 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/sync/checkpoints.ts` | 41 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/sync/decide.ts` | 58 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/sync/fingerprint.ts` | 117 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/sync/record.ts` | 42 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/tools/hooks.ts` | 23 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/tools/names.ts` | 30 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/tools/pending.ts` | 72 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/tools/result.ts` | 110 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/tools/server.ts` | 34 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/claude-agent/websearch.ts` | 57 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/cloudflare-ai-gateway.ts` | 68 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/cloudflare-workers-ai.ts` | 70 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/configured.ts` | 18 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/credential-settings.ts` | 77 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/databricks.ts` | 31 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/digitalocean.ts` | 197 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/dynamic.ts` | 19 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/github-copilot.ts` | 646 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/gitlab.ts` | 496 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/google-vertex.ts` | 231 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/kilo.ts` | 17 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/llmgateway.ts` | 27 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/lmstudio.ts` | 52 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/local.ts` | 240 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/modal.ts` | 72 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/neon.ts` | 12 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/nvidia.ts` | 22 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/ollama.ts` | 92 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/openai-context-caps.ts` | 52 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/openai-subscription-models.ts` | 59 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/openai.ts` | 447 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/opencode-artifacts.ts` | 221 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/opencode-watches.ts` | 784 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/opencode.ts` | 883 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/openrouter.ts` | 30 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/poe.ts` | 176 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/prompt-cache-key.ts` | 37 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/refresh.ts` | 80 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/sap-ai-core.ts` | 39 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/sdk-factory.ts` | 24 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/snowflake-cortex.ts` | 266 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/vllm.ts` | 34 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/xai.ts` | 236 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/provider/zenmux.ts` | 21 | codigo | `packages/ai/src/providers/` | provedores como plugins |
| `packages/core/src/plugin/sdk.ts` | 44 | codigo | `packages/coding-agent/src/core/extensions/` | sistema de plugins |
| `packages/core/src/plugin/service.ts` | 42 | codigo | `packages/coding-agent/src/core/extensions/` | sistema de plugins |
| `packages/core/src/plugin/skill.ts` | 111 | codigo | `packages/coding-agent/src/core/skills.ts` | skills |
| `packages/core/src/plugin/skill/opencode/api.ts` | 40 | codigo | `packages/coding-agent/src/core/skills.ts` | skills |
| `packages/core/src/plugin/source-directory.ts` | 33 | codigo | `packages/coding-agent/src/core/extensions/` | sistema de plugins |
| `packages/core/src/plugin/supervisor.ts` | 288 | codigo | `packages/coding-agent/src/core/extensions/` | sistema de plugins |
| `packages/core/src/plugin/tool-input-repair.ts` | 232 | codigo | sem equivalente | reparo de input de tool |
| `packages/core/src/plugin/update.ts` | 87 | codigo | `packages/coding-agent/src/core/extensions/` | sistema de plugins |
| `packages/core/src/plugin/vcs/git.ts` | 802 | codigo | `packages/coding-agent/src/extensions/git-checkpoint/` | VCS git/hg |
| `packages/core/src/plugin/vcs/hg.ts` | 234 | codigo | `packages/coding-agent/src/extensions/git-checkpoint/` | VCS git/hg |
| `packages/core/src/plugin/verbosity.ts` | 58 | codigo | sem equivalente | verbosidade da TUI |
| `packages/core/src/plugin/warming.ts` | 224 | codigo | `packages/ai/src/cache-warming.ts` | aquecimento de cache |
| `packages/core/src/plugin/websearch/exa.ts` | 69 | codigo | `packages/coding-agent/src/extensions/web/` | provedores de busca web |
| `packages/core/src/plugin/websearch/firecrawl.ts` | 71 | codigo | `packages/coding-agent/src/extensions/web/` | provedores de busca web |
| `packages/core/src/plugin/websearch/index.ts` | 13 | codigo | `packages/coding-agent/src/extensions/web/` | provedores de busca web |
| `packages/core/src/plugin/websearch/mcp.ts` | 69 | codigo | `packages/coding-agent/src/extensions/web/` | provedores de busca web |
| `packages/core/src/plugin/websearch/parallel.ts` | 90 | codigo | `packages/coding-agent/src/extensions/web/` | provedores de busca web |
| `packages/core/src/plugin/websearch/provider.ts` | 44 | codigo | `packages/coding-agent/src/extensions/web/` | provedores de busca web |
| `packages/core/src/plugin/websearch/tavily.ts` | 73 | codigo | `packages/coding-agent/src/extensions/web/` | provedores de busca web |
| `packages/core/src/plugin/websearch/tinyfish.ts` | 131 | codigo | `packages/coding-agent/src/extensions/web/` | provedores de busca web |
| `packages/core/src/project.ts` | 536 | codigo | `packages/coding-agent/src/core/project-trust.ts` | projeto |
| `packages/core/src/project/icon.ts` | 167 | codigo | `packages/coding-agent/src/core/project-trust.ts` | projeto |
| `packages/core/src/project/schema.ts` | 25 | codigo | `packages/coding-agent/src/core/project-trust.ts` | projeto |
| `packages/core/src/project/sql.ts` | 63 | codigo | `packages/coding-agent/src/core/project-trust.ts` | projeto |
| `packages/core/src/provider.ts` | 553 | codigo | `packages/coding-agent/src/core/model-registry.ts` | provedores |
| `packages/core/src/pty.ts` | 311 | codigo | sem equivalente | PTY; nycode usa core/bash-executor.ts sem PTY |
| `packages/core/src/pty/protocol.ts` | 37 | codigo | sem equivalente | PTY; nycode usa core/bash-executor.ts sem PTY |
| `packages/core/src/pty/pty.bun.ts` | 44 | codigo | sem equivalente | PTY; nycode usa core/bash-executor.ts sem PTY |
| `packages/core/src/pty/pty.node.ts` | 34 | codigo | sem equivalente | PTY; nycode usa core/bash-executor.ts sem PTY |
| `packages/core/src/pty/pty.ts` | 25 | codigo | sem equivalente | PTY; nycode usa core/bash-executor.ts sem PTY |
| `packages/core/src/pty/pty.workerd.ts` | 9 | codigo | sem equivalente | PTY; nycode usa core/bash-executor.ts sem PTY |
| `packages/core/src/pty/ticket.ts` | 74 | codigo | sem equivalente | PTY; nycode usa core/bash-executor.ts sem PTY |
| `packages/core/src/push/crypto.ts` | 39 | codigo | `packages/coding-agent/src/extensions/notify/` | notificacoes push |
| `packages/core/src/push/list.ts` | 380 | codigo | `packages/coding-agent/src/extensions/notify/` | notificacoes push |
| `packages/core/src/push/sender.ts` | 199 | codigo | `packages/coding-agent/src/extensions/notify/` | notificacoes push |
| `packages/core/src/push/watcher.ts` | 174 | codigo | `packages/coding-agent/src/extensions/notify/` | notificacoes push |
| `packages/core/src/reference.ts` | 129 | codigo | sem equivalente | referencias (repos externos como contexto) |
| `packages/core/src/reference/instructions.ts` | 82 | codigo | sem equivalente | referencias (repos externos como contexto) |
| `packages/core/src/repository-cache.ts` | 251 | codigo | sem equivalente | cache de repositorios |
| `packages/core/src/repository.ts` | 205 | codigo | sem equivalente | repositorios |
| `packages/core/src/ripgrep.ts` | 311 | codigo | `packages/coding-agent/src/core/tools/grep.ts` | ripgrep |
| `packages/core/src/ripgrep/binary.ts` | 166 | codigo | `packages/coding-agent/src/core/tools/grep.ts` | ripgrep |
| `packages/core/src/rpc.ts` | 288 | codigo | `packages/coding-agent/src/modes/rpc/` | RPC |
| `packages/core/src/schema.ts` | 39 | codigo | `packages/schema/src/` | schemas |
| `packages/core/src/session.ts` | 602 | codigo | `packages/coding-agent/src/core/agent-session.ts` | sessao |
| `packages/core/src/session/affinity.ts` | 8 | codigo | `packages/coding-agent/src/core/agent-session.ts` | sessao |
| `packages/core/src/session/background-result.ts` | 5 | codigo | `packages/coding-agent/src/extensions/subagent/` | background |
| `packages/core/src/session/background.ts` | 125 | codigo | `packages/coding-agent/src/extensions/subagent/` | background |
| `packages/core/src/session/blob.ts` | 503 | codigo | `packages/coding-agent/src/core/session-manager.ts` | blobs |
| `packages/core/src/session/command.ts` | 38 | codigo | `packages/coding-agent/src/core/agent-session.ts` | sessao |
| `packages/core/src/session/compaction-background.ts` | 55 | codigo | `packages/coding-agent/src/core/compaction/` | compactacao |
| `packages/core/src/session/compaction-subagents.ts` | 103 | codigo | `packages/coding-agent/src/core/compaction/` | compactacao |
| `packages/core/src/session/compaction.ts` | 1320 | codigo | `packages/coding-agent/src/core/compaction/` | compactacao |
| `packages/core/src/session/context.ts` | 296 | codigo | `packages/coding-agent/src/core/agent-session.ts` | sessao |
| `packages/core/src/session/cwd-instructions.ts` | 147 | codigo | `packages/coding-agent/src/core/session-cwd.ts` | cwd da sessao |
| `packages/core/src/session/cwd-store.ts` | 66 | codigo | `packages/coding-agent/src/core/session-cwd.ts` | cwd da sessao |
| `packages/core/src/session/cwd.ts` | 75 | codigo | `packages/coding-agent/src/core/session-cwd.ts` | cwd da sessao |
| `packages/core/src/session/diff.ts` | 149 | codigo | `packages/coding-agent/src/core/agent-session.ts` | sessao |
| `packages/core/src/session/environment.ts` | 33 | codigo | `packages/coding-agent/src/core/agent-session.ts` | sessao |
| `packages/core/src/session/error.ts` | 105 | codigo | `packages/coding-agent/src/core/agent-session.ts` | erros |
| `packages/core/src/session/event.ts` | 2 | codigo | `packages/coding-agent/src/core/agent-session.ts` | sessao |
| `packages/core/src/session/execution.ts` | 241 | codigo | `packages/coding-agent/src/extensions/subagent/` | execucao/relatorio de subagente |
| `packages/core/src/session/execution/restart.ts` | 558 | codigo | `packages/coding-agent/src/extensions/subagent/` | execucao/relatorio de subagente |
| `packages/core/src/session/execution/subagent-report.ts` | 203 | codigo | `packages/coding-agent/src/extensions/subagent/` | execucao/relatorio de subagente |
| `packages/core/src/session/generate.ts` | 78 | codigo | `packages/coding-agent/src/core/agent-session.ts` | sessao |
| `packages/core/src/session/history.ts` | 405 | codigo | `packages/coding-agent/src/core/session-manager.ts` | historico |
| `packages/core/src/session/inbox.ts` | 643 | codigo | `packages/coding-agent/src/extensions/subagent/` | inbox de resultados |
| `packages/core/src/session/info.ts` | 62 | codigo | `packages/coding-agent/src/core/agent-session.ts` | sessao |
| `packages/core/src/session/instruction-entry.ts` | 171 | codigo | `packages/coding-agent/src/core/resource-loader.ts` | entradas de instrucao |
| `packages/core/src/session/instruction-state.ts` | 277 | codigo | `packages/coding-agent/src/core/resource-loader.ts` | entradas de instrucao |
| `packages/core/src/session/instructions.ts` | 126 | codigo | `packages/coding-agent/src/core/resource-loader.ts` | entradas de instrucao |
| `packages/core/src/session/message-updater.ts` | 497 | codigo | `packages/coding-agent/src/core/agent-session.ts` | sessao |
| `packages/core/src/session/message.ts` | 2 | codigo | `packages/coding-agent/src/core/agent-session.ts` | sessao |
| `packages/core/src/session/model-request.ts` | 474 | codigo | `packages/agent/src/agent-loop.ts` | requisicao ao modelo |
| `packages/core/src/session/model-transport.ts` | 571 | codigo | `packages/agent/src/agent-loop.ts` | requisicao ao modelo |
| `packages/core/src/session/move.ts` | 199 | codigo | `packages/coding-agent/src/core/session-export.ts` | mover sessao |
| `packages/core/src/session/projector.ts` | 1197 | codigo | `packages/coding-agent/src/core/session-manager.ts` | projecao de eventos |
| `packages/core/src/session/prompt.ts` | 253 | codigo | `packages/coding-agent/src/core/agent-session.ts` | sessao |
| `packages/core/src/session/recent-text.ts` | 93 | codigo | `packages/coding-agent/src/core/agent-session.ts` | sessao |
| `packages/core/src/session/revert.ts` | 112 | codigo | `packages/coding-agent/src/core/session-manager.ts` | revert (arvore de sessao) |
| `packages/core/src/session/run-coordinator.ts` | 198 | codigo | `packages/agent/src/agent.ts` | coordenacao de runs |
| `packages/core/src/session/runner/index.ts` | 46 | codigo | `packages/agent/src/agent-loop.ts` | loop do agente |
| `packages/core/src/session/runner/live-tool-metadata.ts` | 41 | codigo | `packages/agent/src/agent-loop.ts` | loop do agente |
| `packages/core/src/session/runner/llm.ts` | 481 | codigo | `packages/agent/src/agent-loop.ts` | loop do agente |
| `packages/core/src/session/runner/max-steps.ts` | 16 | codigo | `packages/agent/src/agent-loop.ts` | loop do agente |
| `packages/core/src/session/runner/model.ts` | 138 | codigo | `packages/agent/src/agent-loop.ts` | loop do agente |
| `packages/core/src/session/runner/publish-llm-event.ts` | 642 | codigo | `packages/agent/src/agent-loop.ts` | loop do agente |
| `packages/core/src/session/runner/retry.ts` | 78 | codigo | `packages/agent/src/agent-loop.ts` | loop do agente |
| `packages/core/src/session/runner/step.ts` | 401 | codigo | `packages/agent/src/agent-loop.ts` | loop do agente |
| `packages/core/src/session/runner/to-llm-message.ts` | 341 | codigo | `packages/agent/src/agent-loop.ts` | loop do agente |
| `packages/core/src/session/schema.ts` | 9 | codigo | `packages/coding-agent/src/core/agent-session.ts` | sessao |
| `packages/core/src/session/search-build.ts` | 116 | codigo | `packages/coding-agent/src/cli/session-picker.ts` | busca de sessoes |
| `packages/core/src/session/search-index.ts` | 552 | codigo | `packages/coding-agent/src/cli/session-picker.ts` | busca de sessoes |
| `packages/core/src/session/search.ts` | 672 | codigo | `packages/coding-agent/src/cli/session-picker.ts` | busca de sessoes |
| `packages/core/src/session/session.ts` | 407 | codigo | `packages/coding-agent/src/core/agent-session.ts` | sessao |
| `packages/core/src/session/shell.ts` | 35 | codigo | `packages/coding-agent/src/core/bash-executor.ts` | shell do usuario |
| `packages/core/src/session/skill.ts` | 16 | codigo | `packages/coding-agent/src/core/skills.ts` | skill na sessao |
| `packages/core/src/session/sql.ts` | 215 | codigo | `packages/coding-agent/src/core/session-manager.ts` | armazenamento |
| `packages/core/src/session/stats.ts` | 463 | codigo | `packages/coding-agent/src/core/usage-totals.ts` | estatisticas |
| `packages/core/src/session/store.ts` | 323 | codigo | `packages/coding-agent/src/core/session-manager.ts` | armazenamento |
| `packages/core/src/session/stored.ts` | 44 | codigo | `packages/coding-agent/src/core/session-manager.ts` | armazenamento |
| `packages/core/src/session/subagent-completion.ts` | 95 | codigo | `packages/coding-agent/src/extensions/subagent/` | subagentes |
| `packages/core/src/session/subagent-depth.ts` | 21 | codigo | `packages/coding-agent/src/extensions/subagent/` | subagentes |
| `packages/core/src/session/subagent-job.ts` | 61 | codigo | `packages/coding-agent/src/extensions/subagent/` | subagentes |
| `packages/core/src/session/synthetic.ts` | 49 | codigo | `packages/coding-agent/src/core/agent-session.ts` | sessao |
| `packages/core/src/session/system-prompt.ts` | 28 | codigo | `packages/coding-agent/src/core/system-prompt.ts` | prompt de sistema |
| `packages/core/src/session/title.ts` | 174 | codigo | `packages/coding-agent/src/extensions/session-title/` | titulo |
| `packages/core/src/session/to-session-error.ts` | 179 | codigo | `packages/coding-agent/src/core/agent-session.ts` | erros |
| `packages/core/src/session/transfer.ts` | 369 | codigo | `packages/coding-agent/src/core/session-export.ts` | export/import |
| `packages/core/src/session/usage.ts` | 64 | codigo | `packages/coding-agent/src/core/usage-totals.ts` | uso |
| `packages/core/src/shared-cache.ts` | 103 | codigo | sem equivalente | cache compartilhado |
| `packages/core/src/shell.ts` | 1274 | codigo | `packages/coding-agent/src/core/tools/bash.ts` | shell; parse/scan p/ permissao em core/permissions/guard/ |
| `packages/core/src/shell/parse.ts` | 645 | codigo | `packages/coding-agent/src/core/permissions/guard/lex/` | parser de shell |
| `packages/core/src/shell/permissions.ts` | 60 | codigo | `packages/coding-agent/src/core/permissions/guard/bash/` | permissao de shell |
| `packages/core/src/shell/result.ts` | 115 | codigo | `packages/coding-agent/src/core/tools/bash.ts` | shell; parse/scan p/ permissao em core/permissions/guard/ |
| `packages/core/src/shell/scan.ts` | 2585 | codigo | `packages/coding-agent/src/core/permissions/guard/bash/` | scanner de shell |
| `packages/core/src/shell/select.ts` | 241 | codigo | `packages/coding-agent/src/core/tools/bash.ts` | shell; parse/scan p/ permissao em core/permissions/guard/ |
| `packages/core/src/skill.ts` | 277 | codigo | `packages/coding-agent/src/core/skills.ts` | skills |
| `packages/core/src/skill/discovery.ts` | 205 | codigo | `packages/coding-agent/src/core/skills.ts` | skills |
| `packages/core/src/skill/instructions.ts` | 84 | codigo | `packages/coding-agent/src/core/skills.ts` | skills |
| `packages/core/src/snapshot.ts` | 248 | codigo | `packages/coding-agent/src/extensions/git-checkpoint/` | snapshots |
| `packages/core/src/state.ts` | 271 | codigo | `packages/coding-agent/src/core/agent-session-runtime.ts` | estado |
| `packages/core/src/tool-output.ts` | 220 | codigo | `packages/coding-agent/src/core/tools/truncate.ts` | truncamento de saida |
| `packages/core/src/tool.ts` | 579 | codigo | `packages/coding-agent/src/core/tools/` | ferramentas |
| `packages/core/src/tool/html-markdown.ts` | 651 | codigo | `packages/coding-agent/src/extensions/web/` | HTML->markdown |
| `packages/core/src/tool/http-body.ts` | 30 | codigo | `packages/coding-agent/src/extensions/web/` | corpo HTTP |
| `packages/core/src/tool/mcp.ts` | 177 | codigo | `packages/coding-agent/src/extensions/mcp/` | tools MCP |
| `packages/core/src/tool/model-policy.ts` | 38 | codigo | sem equivalente | politica de tool por modelo |
| `packages/core/src/tool/plugin/artifact.ts` | 171 | codigo | sem equivalente | tool artifact |
| `packages/core/src/tool/plugin/automation.ts` | 246 | codigo | sem equivalente | tool automation |
| `packages/core/src/tool/plugin/cd.ts` | 103 | codigo | `packages/coding-agent/src/core/cwd-switch/` | tool cd |
| `packages/core/src/tool/plugin/edit.ts` | 371 | codigo | `packages/coding-agent/src/core/tools/edit.ts` | tool edit |
| `packages/core/src/tool/plugin/file-diff.ts` | 42 | codigo | `packages/coding-agent/src/core/tools/edit-diff.ts` | diff |
| `packages/core/src/tool/plugin/glob.ts` | 123 | codigo | `packages/coding-agent/src/core/tools/find.ts` | tool glob |
| `packages/core/src/tool/plugin/grep.ts` | 152 | codigo | `packages/coding-agent/src/core/tools/grep.ts` | tool grep |
| `packages/core/src/tool/plugin/image-generate.ts` | 391 | codigo | sem equivalente | geracao de imagem |
| `packages/core/src/tool/plugin/machine.ts` | 148 | codigo | sem equivalente | tool machine |
| `packages/core/src/tool/plugin/mcp-events.ts` | 72 | codigo | `packages/coding-agent/src/extensions/mcp/` | tools MCP |
| `packages/core/src/tool/plugin/mcp-resource.ts` | 100 | codigo | `packages/coding-agent/src/extensions/mcp/` | tools MCP |
| `packages/core/src/tool/plugin/opencode.ts` | 316 | codigo | sem equivalente | tools opencode.* (Code Mode) |
| `packages/core/src/tool/plugin/patch.ts` | 358 | codigo | `packages/coding-agent/src/core/tools/edit.ts` | tool patch (sem equivalente direto) |
| `packages/core/src/tool/plugin/question.ts` | 130 | codigo | `packages/coding-agent/src/extensions/question/` | tool question |
| `packages/core/src/tool/plugin/read.ts` | 413 | codigo | `packages/coding-agent/src/core/tools/read.ts` | tool read |
| `packages/core/src/tool/plugin/session-interrupt.ts` | 63 | codigo | sem equivalente | tools de sessao para o modelo |
| `packages/core/src/tool/plugin/session-search.ts` | 99 | codigo | sem equivalente | tools de sessao para o modelo |
| `packages/core/src/tool/plugin/shell.ts` | 596 | codigo | `packages/coding-agent/src/core/tools/bash.ts` | tool shell |
| `packages/core/src/tool/plugin/skill.ts` | 74 | codigo | `packages/coding-agent/src/core/skills.ts` | tool skill |
| `packages/core/src/tool/plugin/subagent.ts` | 269 | codigo | `packages/coding-agent/src/extensions/subagent/` | tool subagent |
| `packages/core/src/tool/plugin/todo.ts` | 83 | codigo | `packages/coding-agent/src/extensions/todo/` | tool todo |
| `packages/core/src/tool/plugin/video-generate.ts` | 398 | codigo | sem equivalente | geracao de video |
| `packages/core/src/tool/plugin/webfetch.ts` | 214 | codigo | `packages/coding-agent/src/extensions/web/` | tool webfetch |
| `packages/core/src/tool/plugin/websearch.ts` | 196 | codigo | `packages/coding-agent/src/extensions/web/` | tool websearch |
| `packages/core/src/tool/plugin/write.ts` | 72 | codigo | `packages/coding-agent/src/core/tools/write.ts` | tool write |
| `packages/core/src/tool/read-filesystem.ts` | 350 | codigo | `packages/coding-agent/src/core/tools/read.ts` | leitura |
| `packages/core/src/tool/runtime.ts` | 311 | codigo | `packages/coding-agent/src/core/tools/` | ferramentas |
| `packages/core/src/tool/search.ts` | 34 | codigo | `packages/coding-agent/src/extensions/tool-search/` | busca de tools |
| `packages/core/src/usage-limits.ts` | 192 | codigo | `packages/coding-agent/src/extensions/context-usage/` | limites de uso |
| `packages/core/src/util/canonical-json.ts` | 11 | codigo | `packages/coding-agent/src/utils/` | utilitarios |
| `packages/core/src/util/error-summary.ts` | 33 | codigo | `packages/coding-agent/src/utils/` | utilitarios |
| `packages/core/src/util/git-executable.ts` | 59 | codigo | `packages/coding-agent/src/utils/` | utilitarios |
| `packages/core/src/util/lazy.ts` | 11 | codigo | `packages/coding-agent/src/utils/` | utilitarios |
| `packages/core/src/util/slug.ts` | 74 | codigo | `packages/coding-agent/src/utils/` | utilitarios |
| `packages/core/src/util/token.ts` | 5 | codigo | `packages/coding-agent/src/utils/` | utilitarios |
| `packages/core/src/util/which.ts` | 37 | codigo | `packages/coding-agent/src/utils/` | utilitarios |
| `packages/core/src/util/wildcard.ts` | 15 | codigo | `packages/coding-agent/src/utils/` | utilitarios |
| `packages/core/src/v1/config/agent.ts` | 69 | codigo | `packages/coding-agent/src/migrations.ts` | migracao de config v1 |
| `packages/core/src/v1/config/command.ts` | 13 | codigo | `packages/coding-agent/src/migrations.ts` | migracao de config v1 |
| `packages/core/src/v1/config/mcp.ts` | 69 | codigo | `packages/coding-agent/src/migrations.ts` | migracao de config v1 |
| `packages/core/src/v1/config/migrate.ts` | 269 | codigo | `packages/coding-agent/src/migrations.ts` | migracao de config v1 |
| `packages/core/src/v1/config/permission.ts` | 42 | codigo | `packages/coding-agent/src/migrations.ts` | migracao de config v1 |
| `packages/core/src/v1/config/plugin.ts` | 9 | codigo | `packages/coding-agent/src/migrations.ts` | migracao de config v1 |
| `packages/core/src/v1/config/provider-options.ts` | 59 | codigo | `packages/coding-agent/src/migrations.ts` | migracao de config v1 |
| `packages/core/src/v1/config/provider.ts` | 113 | codigo | `packages/coding-agent/src/migrations.ts` | migracao de config v1 |
| `packages/core/src/variant.ts` | 699 | codigo | `packages/coding-agent/src/core/model-config.ts` | variantes de modelo |
| `packages/core/src/vcs.ts` | 262 | codigo | `packages/coding-agent/src/extensions/git-checkpoint/` | VCS |
| `packages/core/src/vcs/patch.ts` | 106 | codigo | `packages/coding-agent/src/extensions/git-checkpoint/` | VCS |
| `packages/core/src/video-generation.ts` | 344 | codigo | sem equivalente | geracao de video |
| `packages/core/src/voice.ts` | 194 | codigo | sem equivalente | voz |
| `packages/core/src/websearch.ts` | 239 | codigo | `packages/coding-agent/src/extensions/web/` | busca web |
| `packages/core/src/wellknown.ts` | 230 | codigo | sem equivalente | well-known config remota |
| `packages/core/src/wellknown/plugin.ts` | 36 | codigo | sem equivalente | well-known config remota |
| `packages/core/src/workspace.ts` | 566 | codigo | sem equivalente | workspaces |
| `packages/core/src/workspace/driver.ts` | 89 | codigo | sem equivalente | workspaces |
| `packages/core/src/workspace/sql.ts` | 11 | codigo | sem equivalente | workspaces |
| `packages/core/src/worktree.ts` | 357 | codigo | sem equivalente | git worktrees gerenciados; parcial: core/cwd-switch |
| `packages/core/src/worktree/directory.ts` | 16 | codigo | sem equivalente | git worktrees gerenciados; parcial: core/cwd-switch |
| `packages/core/src/worktree/git.ts` | 39 | codigo | sem equivalente | git worktrees gerenciados; parcial: core/cwd-switch |
| `packages/core/src/worktree/sql.ts` | 21 | codigo | sem equivalente | git worktrees gerenciados; parcial: core/cwd-switch |
| `packages/core/src/worktree/strategies.ts` | 74 | codigo | sem equivalente | git worktrees gerenciados; parcial: core/cwd-switch |
| `packages/core/test/agent.test.ts` | 224 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/aisdk-native.test.ts` | 590 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/aisdk.test.ts` | 1259 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/app.test.ts` | 6 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/artifact.test.ts` | 216 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/automation-event.test.ts` | 789 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/automation-shell.test.ts` | 293 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/automation.test.ts` | 2034 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/blob-store.test.ts` | 37 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/boot-work.test.ts` | 215 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/browser-attach.test.ts` | 150 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/browser-idle.test.ts` | 107 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/bus-session-routing.test.ts` | 334 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/bus-unpersisted.test.ts` | 50 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/bus.test.ts` | 1347 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/catalog.test.ts` | 704 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/codemode-execute-options.test.ts` | 172 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/codemode-script-diffs.test.ts` | 131 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/codemode.test.ts` | 132 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/codemode/catalog.test.ts` | 339 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/codemode/diffs.test.ts` | 90 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/codemode/instructions.test.ts` | 123 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/command.test.ts` | 71 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/config/agent.test.ts` | 847 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/config/command-subagent.test.ts` | 165 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/config/command.test.ts` | 628 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/config/compaction.test.ts` | 184 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/config/config.test.ts` | 2113 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/config/discovery.test.ts` | 150 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/config/entry-observer.test.ts` | 51 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/config/image.test.ts` | 78 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/config/markdown.test.ts` | 129 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/config/model.test.ts` | 28 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/config/normalization.test.ts` | 854 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/config/overlay.test.ts` | 205 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/config/policy.test.ts` | 432 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/config/provider-options.test.ts` | 55 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/config/provider.test.ts` | 1338 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/config/reload.test.ts` | 526 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/config/session-search.test.ts` | 61 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/config/shell.test.ts` | 42 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/config/skill.test.ts` | 602 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/config/snapshot.test.ts` | 61 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/config/tool-output.test.ts` | 59 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/config/watch.test.ts` | 53 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/config/websearch.test.ts` | 45 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/credential-refresh.test.ts` | 113 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/credential.test.ts` | 271 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/database-drizzle-transaction.test.ts` | 129 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/database-drizzle.test.ts` | 228 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/database-migration.test.ts` | 783 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/database.test.ts` | 39 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/effect-app-node-platform.test.ts` | 86 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/effect-simplification-types.test.ts` | 12 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/effect/cross-spawn-spawner.test.ts` | 522 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/effect/keyed-mutex.test.ts` | 73 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/effect/layer-node/layer-node-types.test.ts` | 256 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/effect/layer-node/layer-node.test.ts` | 512 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/effect/layer-node/node-build.test.ts` | 148 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/effect/observability.test.ts` | 141 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/environment.test.ts` | 154 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/environments.test.ts` | 406 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/event-logger.test.ts` | 50 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/file-access-path.test.ts` | 336 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/file-access.test.ts` | 178 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/file-mutation.test.ts` | 285 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/filesystem/file-watch.test.ts` | 213 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/filesystem/filesystem.test.ts` | 383 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/filesystem/location-watcher-policy.test.ts` | 70 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/filesystem/search.test.ts` | 385 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/filesystem/watcher.test.ts` | 719 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/app-execution-alias.ts` | 17 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/codemode.ts` | 63 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/config-nodes.ts` | 40 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/durable-object-storage.ts` | 58 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/effect-flock-worker.ts` | 60 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/env.ts` | 22 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/environment.ts` | 52 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/event-server.ts` | 65 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/flock-worker.ts` | 72 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/git.ts` | 86 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/global.ts` | 26 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/held-stdio.cjs` | 36 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/html-markdown.ts` | 7 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/location.ts` | 27 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/lock-worker.ts` | 53 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/machine-worker.ts` | 372 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/mcp-echo.ts` | 14 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/mcp-legacy-silent.ts` | 22 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/mcp-modern-stdio.ts` | 15 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/mcp-output-schema.ts` | 63 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/mcp-prompts.ts` | 29 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/mcp-timeout.ts` | 32 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/mcp-union-output-schema.ts` | 41 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/mcp.ts` | 44 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/models.ts` | 6 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/persistent-pty-daemon.ts` | 347 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/persistent-pty.ts` | 9 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/photon-crash-worker.ts` | 10 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/photon-exit.ts` | 29 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/photon-hang-worker.ts` | 2 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/policy.ts` | 98 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/prompt-location.ts` | 33 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/pty-windows.ts` | 69 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/selector.ts` | 12 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/shell-daemon.ts` | 122 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/spawn.ts` | 24 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/sqlite-node-client.ts` | 100 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/target-environment.ts` | 58 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/tmpdir.ts` | 44 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/v1-config/attachment.ts` | 25 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/v1-config/config.ts` | 182 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/v1-config/formatter.ts` | 13 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/v1-config/layout.ts` | 6 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/v1-config/lsp.ts` | 80 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/v1-config/server.ts` | 19 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/fixture/v1-config/skills.ts` | 13 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/flag.test.ts` | 203 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/form.test.ts` | 357 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/formatter-target-environment.test.ts` | 138 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/formatter.test.ts` | 350 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/generate.test.ts` | 752 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/git.test.ts` | 666 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/github-copilot/models.test.ts` | 167 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/image-photon.test.ts` | 177 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/instance-vanilla.test.ts` | 124 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/instruction-discovery.test.ts` | 804 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/instruction-state.test.ts` | 537 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/instructions/builtins.test.ts` | 83 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/instructions/index.test.ts` | 248 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/integration-refresh.test.ts` | 118 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/integration.test.ts` | 716 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/job.test.ts` | 968 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/kv.test.ts` | 81 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/lib/clock.ts` | 43 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/lib/effect.ts` | 80 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/lib/environment-conformance.ts` | 204 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/lib/eventually.ts` | 20 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/lib/image.ts` | 7 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/lib/instructions.ts` | 47 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/lib/permission.ts` | 12 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/lib/project.ts` | 26 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/lib/session-message.ts` | 26 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/lib/tool.ts` | 102 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/lib/websearch.ts` | 63 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/lib/websocket-server.ts` | 73 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/location-activity.test.ts` | 315 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/location-filesystem.test.ts` | 332 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/location-layer.test.ts` | 784 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/location-missing-project.test.ts` | 71 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/location-retain.test.ts` | 98 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/location.test.ts` | 46 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/logging.test.ts` | 14 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/machine-frames.test.ts` | 768 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/machine-instructions.test.ts` | 135 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/machine-join.test.ts` | 223 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/machine-link.test.ts` | 527 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/machine-noise.test.ts` | 429 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/machine-path.test.ts` | 1202 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/machine.test.ts` | 786 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/machines.test.ts` | 841 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/mcp-attach.test.ts` | 403 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/mcp-events.test.ts` | 299 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/mcp-import-boundary.test.ts` | 44 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/mcp-instructions.test.ts` | 221 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/mcp-oauth.test.ts` | 1289 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/mcp-skills.test.ts` | 274 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/mcp-socket-client.test.ts` | 210 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/mcp-stdio.test.ts` | 145 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/mcp.test.ts` | 4196 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/mime.test.ts` | 80 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/modal/models.test.ts` | 137 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/model-free.test.ts` | 120 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/model-plugins.test.ts` | 469 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/model-resolver.test.ts` | 1695 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/model.test.ts` | 16 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/models.test.ts` | 1404 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/network-guard.test.ts` | 56 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/npm-config.test.ts` | 42 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/npm.test.ts` | 545 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/oauth-page.test.ts` | 15 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/opencode-api-skill.test.ts` | 16 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/patch.test.ts` | 509 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/permission.test.ts` | 1179 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/persistent-pty-daemon.test.ts` | 337 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/persistent-pty-session.test.ts` | 295 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin-failure.test.ts` | 305 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin.test.ts` | 756 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/automation.test.ts` | 124 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/command.test.ts` | 137 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/fixture.ts` | 176 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/fixtures/greeting.ts` | 14 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/fixtures/provider-factory.ts` | 9 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/goal-watchdog.test.ts` | 212 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/goal.test.ts` | 609 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/home-memory.test.ts` | 131 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/host-model.test.ts` | 34 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/host.ts` | 540 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/identity.test.ts` | 60 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/internal-flag.test.ts` | 101 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/mcp-codemode-defaults.test.ts` | 124 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/models-dev.test.ts` | 1406 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/module.test.ts` | 494 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/optimize.test.ts` | 343 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/permission-assert.test.ts` | 94 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/plan.test.ts` | 162 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/promise-tool-cancel.test.ts` | 279 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/promise-tool.test.ts` | 227 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-amazon-bedrock.test.ts` | 225 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-azure.test.ts` | 793 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-cerebras.test.ts` | 62 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-chatgpt.test.ts` | 1278 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-cloudflare-ai-gateway.test.ts` | 160 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-cloudflare-workers-ai.test.ts` | 158 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-databricks.test.ts` | 45 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-digitalocean.test.ts` | 322 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-dynamic.test.ts` | 179 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-github-copilot.test.ts` | 806 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-gitlab-oauth.test.ts` | 407 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-gitlab.test.ts` | 546 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-google-vertex.test.ts` | 288 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-kilo.test.ts` | 66 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-llmgateway.test.ts` | 72 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-lmstudio.test.ts` | 487 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-nvidia.test.ts` | 84 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-ollama.test.ts` | 312 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-openai-context-caps.test.ts` | 80 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-openai.test.ts` | 447 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-opencode-artifacts.test.ts` | 251 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-opencode-watches.test.ts` | 1146 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-opencode.test.ts` | 2590 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-openrouter.test.ts` | 83 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-poe.test.ts` | 360 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-sap-ai-core.test.ts` | 138 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-snowflake-cortex.test.ts` | 294 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-vllm.test.ts` | 382 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-xai.test.ts` | 92 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider-zenmux.test.ts` | 100 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider/claude-agent/claude/accounts.test.ts` | 326 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider/claude-agent/claude/branches.test.ts` | 300 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider/claude-agent/claude/probe.test.ts` | 99 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider/claude-agent/claude/recorder.test.ts` | 19 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider/claude-agent/claude/session.test.ts` | 30 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider/claude-agent/claude/sessions.test.ts` | 490 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider/claude-agent/claude/status.test.ts` | 67 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider/claude-agent/claude/sync.test.ts` | 70 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider/claude-agent/claude/tools.test.ts` | 382 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider/claude-agent/language-model/convert.test.ts` | 95 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider/claude-agent/language-model/error.test.ts` | 94 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider/claude-agent/lib/fake-claude.ts` | 411 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider/claude-agent/lib/fake-io.ts` | 20 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider/claude-agent/lib/recorder.ts` | 61 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider/claude-agent/lib/sessions.ts` | 126 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider/claude-agent/lib/tools.ts` | 95 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider/claude-agent/plugin.test.ts` | 651 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider/claude-agent/sync/sync.test.ts` | 213 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider/claude-agent/tools/tools.test.ts` | 85 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/provider/claude-agent/websearch.test.ts` | 106 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/session-compact.test.ts` | 52 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/session-instructions.test.ts` | 197 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/session-list.test.ts` | 52 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/session-remove.test.ts` | 61 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/skill.test.ts` | 81 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/supervisor-reload.test.ts` | 401 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/supervisor.test.ts` | 485 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/tool-input-repair-integration.test.ts` | 296 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/tool-input-repair.test.ts` | 457 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/vcs-init.test.ts` | 48 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/verbosity.test.ts` | 163 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/warming.test.ts` | 314 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/websearch-fixture.ts` | 63 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/websearch.test.ts` | 368 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/plugin/worktree.test.ts` | 52 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/preload.test.ts` | 61 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/preload.ts` | 36 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/process/process.test.ts` | 340 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/project-activate.test.ts` | 144 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/project-icon.test.ts` | 198 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/project.test.ts` | 754 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/provider.test.ts` | 92 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/pty/info-schema.test.ts` | 23 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/pty/protocol.test.ts` | 27 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/pty/pty-session.test.ts` | 224 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/pty/pty-windows.test.ts` | 41 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/pty/ticket.test.ts` | 76 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/push-list.test.ts` | 257 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/push-sender.test.ts` | 251 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/push-watcher.test.ts` | 359 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/reference-instructions.test.ts` | 112 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/reference.test.ts` | 209 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/repository-cache.test.ts` | 235 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/repository.test.ts` | 89 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/ripgrep.test.ts` | 253 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/rpc-handler-errors.test.ts` | 62 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-activation.test.ts` | 75 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-archive.test.ts` | 81 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-background.test.ts` | 97 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-checkpoint-transport.test.ts` | 168 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-compact.test.ts` | 171 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-compaction-transport.test.ts` | 131 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-compaction.test.ts` | 1871 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-create.test.ts` | 1645 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-cwd-instructions.test.ts` | 304 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-cwd.test.ts` | 484 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-diff.test.ts` | 207 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-environment.test.ts` | 30 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-error.test.ts` | 434 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-execution.test.ts` | 2304 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-generate.test.ts` | 502 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-instructions.test.ts` | 378 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-list.test.ts` | 72 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-live-tool-metadata.test.ts` | 43 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-log.test.ts` | 123 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-model-request-hooks.test.ts` | 270 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-model-request.test.ts` | 243 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-model-transport-live.test.ts` | 329 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-model-transport.test.ts` | 1109 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-move.test.ts` | 671 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-native-compaction.test.ts` | 425 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-native.test.ts` | 359 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-owned.test.ts` | 1073 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-projector.test.ts` | 2797 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-prompt.test.ts` | 1550 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-remove.test.ts` | 117 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-revert.test.ts` | 121 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-run-coordinator.test.ts` | 711 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-runner-message.test.ts` | 1574 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-runner-recorded.test.ts` | 288 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-runner-retry.test.ts` | 130 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-runner-tool-events.test.ts` | 662 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-runner.test.ts` | 7859 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-search-build.test.ts` | 214 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-search-index.test.ts` | 524 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-search.test.ts` | 375 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-shell.test.ts` | 437 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-skill.test.ts` | 229 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-sql.types.ts` | 25 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-stats.test.ts` | 429 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-step.test.ts` | 435 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-store.test.ts` | 543 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-system-prompt.test.ts` | 8 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-title.test.ts` | 767 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-tool-progress.test.ts` | 159 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-usage.test.ts` | 24 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-view.test.ts` | 218 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/session-wait.test.ts` | 41 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shared-cache.test.ts` | 161 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shared-schema.test.ts` | 187 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shell-cleanup.test.ts` | 52 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shell-daemon.test.ts` | 663 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shell-parse-compatibility.test.ts` | 451 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shell-parse-parity.test.ts` | 170 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shell-parse-syntax.test.ts` | 201 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shell-parse.test.ts` | 251 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shell-restart.test.ts` | 268 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shell-result.test.ts` | 65 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shell-retention.test.ts` | 162 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shell-scan/adversarial.test.ts` | 112 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shell-scan/arithmetic.test.ts` | 143 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shell-scan/bash-safety.test.ts` | 291 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shell-scan/bash-syntax.test.ts` | 361 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shell-scan/closure.test.ts` | 47 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shell-scan/compound-parity.test.ts` | 131 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shell-scan/generated.test.ts` | 201 | gerado | `packages/coding-agent/test/` | gerado: excluido da analise; testes do core |
| `packages/core/test/shell-scan/oracle.test.ts` | 762 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shell-scan/parity-regressions.test.ts` | 146 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shell-scan/powershell-runtime.test.ts` | 604 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shell-scan/powershell-safety.test.ts` | 470 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shell-scan/powershell-syntax.test.ts` | 177 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shell-scan/redirect.test.ts` | 168 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shell-scan/scan.test.ts` | 496 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/shell.test.ts` | 140 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/skill-discovery.test.ts` | 154 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/skill.test.ts` | 297 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/skill/instructions.test.ts` | 216 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/snapshot.test.ts` | 488 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/sqlite-bundle.test.ts` | 53 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/sqlite-interrupt.test.ts` | 101 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/sqlite-node.test.ts` | 80 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/sqlite-workerd.test.ts` | 111 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/state-group.test.ts` | 138 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/state-replay.test.ts` | 207 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/state.test.ts` | 679 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/storage-failure.test.ts` | 88 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/subagent-completion.test.ts` | 170 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/subagent-idle-e2e.test.ts` | 825 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/subagent-lifetime.test.ts` | 146 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/subagent-report.test.ts` | 834 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-automation.test.ts` | 345 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-cd.test.ts` | 372 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-edit.test.ts` | 888 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-execute.test.ts` | 1081 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-html-markdown-budget.test.ts` | 68 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-image-generate.test.ts` | 545 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-machine.test.ts` | 207 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-mcp-events.test.ts` | 90 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-media-target-environment.test.ts` | 213 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-model-policy.test.ts` | 289 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-opencode.test.ts` | 303 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-output.test.ts` | 334 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-patch-target-environment.test.ts` | 239 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-patch.test.ts` | 1265 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-question.test.ts` | 260 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-read-filesystem.test.ts` | 833 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-read.test.ts` | 1341 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-registry.test.ts` | 1662 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-schema.test.ts` | 538 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-search-target-environment.test.ts` | 103 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-search.test.ts` | 411 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-session-search.test.ts` | 178 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-shell-target-environment.test.ts` | 193 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-shell.test.ts` | 2653 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-skill.test.ts` | 203 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-subagent.test.ts` | 1046 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-target-environment.test.ts` | 183 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-todo.test.ts` | 75 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-video-generate.test.ts` | 235 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-webfetch.test.ts` | 737 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-websearch.test.ts` | 482 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool-write.test.ts` | 440 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/tool/file-diff.test.ts` | 45 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/usage-limits.test.ts` | 210 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/util/effect-flock.test.ts` | 331 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/util/error-summary.test.ts` | 19 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/util/flock.test.ts` | 326 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/util/fs-util.test.ts` | 50 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/util/git-executable.test.ts` | 80 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/util/which.test.ts` | 99 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/v1-migration.test.ts` | 1508 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/variant.test.ts` | 575 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/vcs-hg.test.ts` | 239 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/vcs.test.ts` | 1396 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/video-generation.test.ts` | 146 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/voice.test.ts` | 332 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/websearch.test.ts` | 593 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/wellknown.test.ts` | 132 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/worker-client.test.ts` | 529 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/workspace.test.ts` | 828 | teste | `packages/coding-agent/test/` | testes do core |
| `packages/core/test/worktree.test.ts` | 944 | teste | `packages/coding-agent/test/` | testes do core |
