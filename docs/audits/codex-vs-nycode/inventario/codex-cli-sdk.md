# Inventário: codex-cli-sdk

Crate `codex-rs/cli`, `codex-cli/` e `sdk/`. Total nesta partição: **223** arquivos.

| Arquivo (Codex) | Crate | Categoria | LOC | Equivalente no nycode |
|---|---|---|---:|---|
| `codex-cli/bin/codex.js` | `codex-cli` | codigo | 297 | `packages/coding-agent/src/cli/` |
| `codex-cli/scripts/build_npm_package.py` | `codex-cli` | codigo | 471 | `packages/coding-agent/src/cli/` |
| `codex-cli/scripts/init_firewall.sh` | `codex-cli` | codigo | 115 | `packages/coding-agent/src/cli/` |
| `codex-cli/scripts/run_in_container.sh` | `codex-cli` | codigo | 95 | `packages/coding-agent/src/cli/` |
| `codex-cli/tests/exit-status.test.mjs` | `codex-cli` | teste | 154 | `packages/coding-agent/src/cli/` |
| `codex-cli/tests/test_build_npm_package.py` | `codex-cli` | teste | 112 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/BUILD.bazel` | `codex-rs/cli` | codigo | 60 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/build.rs` | `codex-rs/cli` | codigo | 5 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/e2e_benches/codex_help.rs` | `codex-rs/cli` | codigo | 26 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/app_cmd.rs` | `codex-rs/cli` | codigo | 25 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/app_server_proxy.rs` | `codex-rs/cli` | codigo | 48 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/bin/logs_client.rs` | `codex-rs/cli` | codigo | 468 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/cloud_config.rs` | `codex-rs/cli` | codigo | 80 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/config_override_args.rs` | `codex-rs/cli` | codigo | 29 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/config_override_args_tests.rs` | `codex-rs/cli` | teste | 37 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/daemon_install.rs` | `codex-rs/cli` | codigo | 42 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/daemon_install_tests.rs` | `codex-rs/cli` | teste | 18 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/daemon_telemetry.rs` | `codex-rs/cli` | codigo | 60 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/daemon_update_tests.rs` | `codex-rs/cli` | teste | 69 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/debug_sandbox.rs` | `codex-rs/cli` | codigo | 1310 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/debug_sandbox/cloud_config.rs` | `codex-rs/cli` | codigo | 57 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/debug_sandbox/cloud_config_tests.rs` | `codex-rs/cli` | teste | 185 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/debug_sandbox/pid_tracker.rs` | `codex-rs/cli` | codigo | 372 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/debug_sandbox/seatbelt.rs` | `codex-rs/cli` | codigo | 114 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/desktop_app/mac.rs` | `codex-rs/cli` | codigo | 513 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/desktop_app/mod.rs` | `codex-rs/cli` | codigo | 22 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/desktop_app/windows.rs` | `codex-rs/cli` | codigo | 133 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor.rs` | `codex-rs/cli` | codigo | 4696 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/background.rs` | `codex-rs/cli` | codigo | 365 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/desktop.rs` | `codex-rs/cli` | codigo | 320 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/desktop/macos_security.rs` | `codex-rs/cli` | codigo | 236 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/desktop/macos_security_tests.rs` | `codex-rs/cli` | teste | 67 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/desktop/platform.rs` | `codex-rs/cli` | codigo | 283 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/desktop/windows_security.rs` | `codex-rs/cli` | codigo | 232 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/desktop/windows_security_tests.rs` | `codex-rs/cli` | teste | 85 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/desktop_tests.rs` | `codex-rs/cli` | teste | 97 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/disk.rs` | `codex-rs/cli` | codigo | 178 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/disk_tests.rs` | `codex-rs/cli` | teste | 160 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/filesystem_paths.rs` | `codex-rs/cli` | codigo | 385 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/filesystem_paths_tests.rs` | `codex-rs/cli` | teste | 286 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/git.rs` | `codex-rs/cli` | codigo | 160 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/network.rs` | `codex-rs/cli` | codigo | 224 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/network_tests.rs` | `codex-rs/cli` | teste | 37 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/output.rs` | `codex-rs/cli` | codigo | 2017 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/output/detail.rs` | `codex-rs/cli` | codigo | 791 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/progress.rs` | `codex-rs/cli` | codigo | 139 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/runtime.rs` | `codex-rs/cli` | codigo | 145 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/sandbox.rs` | `codex-rs/cli` | codigo | 361 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/sandbox_tests.rs` | `codex-rs/cli` | teste | 160 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/security.rs` | `codex-rs/cli` | codigo | 254 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/security_tests.rs` | `codex-rs/cli` | teste | 184 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/system.rs` | `codex-rs/cli` | codigo | 182 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/thread_inventory.rs` | `codex-rs/cli` | codigo | 1434 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/title.rs` | `codex-rs/cli` | codigo | 424 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/updates.rs` | `codex-rs/cli` | codigo | 711 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/windows_dev_drive.rs` | `codex-rs/cli` | codigo | 160 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/doctor/windows_dev_drive_tests.rs` | `codex-rs/cli` | teste | 16 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/exec_args_tests.rs` | `codex-rs/cli` | teste | 41 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/exec_server_args_tests.rs` | `codex-rs/cli` | teste | 29 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/exit_status.rs` | `codex-rs/cli` | codigo | 23 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/git_credential.rs` | `codex-rs/cli` | codigo | 193 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/lib.rs` | `codex-rs/cli` | codigo | 200 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/login.rs` | `codex-rs/cli` | codigo | 808 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/login_storage_tests.rs` | `codex-rs/cli` | teste | 90 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/main.rs` | `codex-rs/cli` | codigo | 5025 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/marketplace_cmd.rs` | `codex-rs/cli` | codigo | 587 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/mcp_cmd.rs` | `codex-rs/cli` | codigo | 1192 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/mcp_cmd_tests.rs` | `codex-rs/cli` | teste | 346 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/mcp_login.rs` | `codex-rs/cli` | codigo | 266 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/mcp_login_tests.rs` | `codex-rs/cli` | teste | 46 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/migrate_nfs_db.rs` | `codex-rs/cli` | codigo | 117 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/migrate_rollouts.rs` | `codex-rs/cli` | codigo | 450 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/plugin_cmd.rs` | `codex-rs/cli` | codigo | 1141 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/plugin_cmd_tests.rs` | `codex-rs/cli` | teste | 76 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/queue_cmd.rs` | `codex-rs/cli` | codigo | 153 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/remote_control_cmd.rs` | `codex-rs/cli` | codigo | 859 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/sandbox_setup.rs` | `codex-rs/cli` | codigo | 230 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/sandbox_uninstall.rs` | `codex-rs/cli` | codigo | 21 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/shared_sandbox_launcher.rs` | `codex-rs/cli` | codigo | 461 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/state_db_recovery.rs` | `codex-rs/cli` | codigo | 156 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/src/wsl_paths.rs` | `codex-rs/cli` | codigo | 59 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/app_server.rs` | `codex-rs/cli` | teste | 361 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/app_server_daemon.rs` | `codex-rs/cli` | teste | 589 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/app_server_daemon/package.rs` | `codex-rs/cli` | teste | 219 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/app_server_daemon/support.rs` | `codex-rs/cli` | teste | 140 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/app_server_daemon_windows.rs` | `codex-rs/cli` | teste | 126 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/app_server_proxy.rs` | `codex-rs/cli` | teste | 76 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/cloud_auth.rs` | `codex-rs/cli` | teste | 113 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/cloud_config.rs` | `codex-rs/cli` | teste | 730 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/daemon_startup.rs` | `codex-rs/cli` | teste | 634 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/daemon_telemetry.rs` | `codex-rs/cli` | teste | 77 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/debug_clear_memories.rs` | `codex-rs/cli` | teste | 185 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/debug_models.rs` | `codex-rs/cli` | teste | 40 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/delete.rs` | `codex-rs/cli` | teste | 17 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/doctor_enterprise_network.rs` | `codex-rs/cli` | teste | 463 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/doctor_path_safety.rs` | `codex-rs/cli` | teste | 689 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/exec_server.rs` | `codex-rs/cli` | teste | 1360 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/exec_server/auth_refresh_tests.rs` | `codex-rs/cli` | teste | 178 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/exec_server/pid_namespace_tests.rs` | `codex-rs/cli` | teste | 155 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/exec_server_websocket_auth.rs` | `codex-rs/cli` | teste | 366 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/execpolicy.rs` | `codex-rs/cli` | teste | 119 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/features.rs` | `codex-rs/cli` | teste | 436 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/login.rs` | `codex-rs/cli` | teste | 541 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/marketplace_add.rs` | `codex-rs/cli` | teste | 253 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/marketplace_remove.rs` | `codex-rs/cli` | teste | 127 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/marketplace_upgrade.rs` | `codex-rs/cli` | teste | 118 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/mcp_add_remove.rs` | `codex-rs/cli` | teste | 582 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/mcp_list.rs` | `codex-rs/cli` | teste | 562 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/mcp_login.rs` | `codex-rs/cli` | teste | 632 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/migrate_nfs_db.rs` | `codex-rs/cli` | teste | 132 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/plugin_cli.rs` | `codex-rs/cli` | teste | 1938 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/queue.rs` | `codex-rs/cli` | teste | 809 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/rollout_trace.rs` | `codex-rs/cli` | teste | 352 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/sandbox_cloud_config.rs` | `codex-rs/cli` | teste | 184 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/sandbox_network_proxy.rs` | `codex-rs/cli` | teste | 170 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/sandbox_tty.rs` | `codex-rs/cli` | teste | 132 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/sandbox_uninstall.rs` | `codex-rs/cli` | teste | 39 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/shared_sandbox_launcher.rs` | `codex-rs/cli` | teste | 432 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/update.rs` | `codex-rs/cli` | teste | 24 | `packages/coding-agent/src/cli/` |
| `codex-rs/cli/tests/worktree.rs` | `codex-rs/cli` | teste | 990 | `packages/coding-agent/src/cli/` |
| `sdk/python-runtime/hatch_build.py` | `sdk/python-runtime` | codigo | 30 | `sem equivalente` |
| `sdk/python-runtime/src/codex_cli_bin/__init__.py` | `sdk/python-runtime` | codigo | 38 | `sem equivalente` |
| `sdk/python/BUILD.bazel` | `sdk/python` | codigo | 21 | `sem equivalente` |
| `sdk/python/_runtime_setup.py` | `sdk/python` | codigo | 372 | `sem equivalente` |
| `sdk/python/examples/01_quickstart_constructor/async.py` | `sdk/python` | codigo | 34 | `sem equivalente` |
| `sdk/python/examples/01_quickstart_constructor/sync.py` | `sdk/python` | codigo | 24 | `sem equivalente` |
| `sdk/python/examples/02_turn_run/async.py` | `sdk/python` | codigo | 35 | `sem equivalente` |
| `sdk/python/examples/02_turn_run/sync.py` | `sdk/python` | codigo | 24 | `sem equivalente` |
| `sdk/python/examples/03_turn_stream_events/async.py` | `sdk/python` | codigo | 66 | `sem equivalente` |
| `sdk/python/examples/03_turn_stream_events/sync.py` | `sdk/python` | codigo | 56 | `sem equivalente` |
| `sdk/python/examples/04_models_and_metadata/async.py` | `sdk/python` | codigo | 26 | `sem equivalente` |
| `sdk/python/examples/04_models_and_metadata/sync.py` | `sdk/python` | codigo | 18 | `sem equivalente` |
| `sdk/python/examples/05_existing_thread/async.py` | `sdk/python` | codigo | 34 | `sem equivalente` |
| `sdk/python/examples/05_existing_thread/sync.py` | `sdk/python` | codigo | 23 | `sem equivalente` |
| `sdk/python/examples/06_thread_lifecycle_and_controls/async.py` | `sdk/python` | codigo | 60 | `sem equivalente` |
| `sdk/python/examples/06_thread_lifecycle_and_controls/sync.py` | `sdk/python` | codigo | 48 | `sem equivalente` |
| `sdk/python/examples/07_image_and_text/async.py` | `sdk/python` | codigo | 37 | `sem equivalente` |
| `sdk/python/examples/07_image_and_text/sync.py` | `sdk/python` | codigo | 26 | `sem equivalente` |
| `sdk/python/examples/08_local_image_and_text/async.py` | `sdk/python` | codigo | 43 | `sem equivalente` |
| `sdk/python/examples/08_local_image_and_text/sync.py` | `sdk/python` | codigo | 32 | `sem equivalente` |
| `sdk/python/examples/09_async_parity/sync.py` | `sdk/python` | codigo | 23 | `sem equivalente` |
| `sdk/python/examples/10_error_handling_and_retry/async.py` | `sdk/python` | codigo | 91 | `sem equivalente` |
| `sdk/python/examples/10_error_handling_and_retry/sync.py` | `sdk/python` | codigo | 38 | `sem equivalente` |
| `sdk/python/examples/11_cli_mini_app/async.py` | `sdk/python` | codigo | 88 | `sem equivalente` |
| `sdk/python/examples/11_cli_mini_app/sync.py` | `sdk/python` | codigo | 79 | `sem equivalente` |
| `sdk/python/examples/12_turn_params_kitchen_sink/async.py` | `sdk/python` | codigo | 83 | `sem equivalente` |
| `sdk/python/examples/12_turn_params_kitchen_sink/sync.py` | `sdk/python` | codigo | 73 | `sem equivalente` |
| `sdk/python/examples/13_model_select_and_turn_params/async.py` | `sdk/python` | codigo | 112 | `sem equivalente` |
| `sdk/python/examples/13_model_select_and_turn_params/sync.py` | `sdk/python` | codigo | 102 | `sem equivalente` |
| `sdk/python/examples/14_turn_controls/async.py` | `sdk/python` | codigo | 71 | `sem equivalente` |
| `sdk/python/examples/14_turn_controls/sync.py` | `sdk/python` | codigo | 59 | `sem equivalente` |
| `sdk/python/examples/15_login_and_account/async.py` | `sdk/python` | codigo | 34 | `sem equivalente` |
| `sdk/python/examples/15_login_and_account/sync.py` | `sdk/python` | codigo | 26 | `sem equivalente` |
| `sdk/python/examples/16_external_message/async.py` | `sdk/python` | codigo | 40 | `sem equivalente` |
| `sdk/python/examples/16_external_message/sync.py` | `sdk/python` | codigo | 33 | `sem equivalente` |
| `sdk/python/examples/_bootstrap.py` | `sdk/python` | codigo | 113 | `sem equivalente` |
| `sdk/python/release_version.py` | `sdk/python` | codigo | 88 | `sem equivalente` |
| `sdk/python/scripts/update_sdk_artifacts.py` | `sdk/python` | codigo | 1575 | `sem equivalente` |
| `sdk/python/src/openai_codex/__init__.py` | `sdk/python` | codigo | 95 | `sem equivalente` |
| `sdk/python/src/openai_codex/_approval_mode.py` | `sdk/python` | codigo | 51 | `sem equivalente` |
| `sdk/python/src/openai_codex/_goal.py` | `sdk/python` | codigo | 448 | `sem equivalente` |
| `sdk/python/src/openai_codex/_initialize_metadata.py` | `sdk/python` | codigo | 54 | `sem equivalente` |
| `sdk/python/src/openai_codex/_inputs.py` | `sdk/python` | codigo | 103 | `sem equivalente` |
| `sdk/python/src/openai_codex/_login.py` | `sdk/python` | codigo | 172 | `sem equivalente` |
| `sdk/python/src/openai_codex/_message_router.py` | `sdk/python` | codigo | 389 | `sem equivalente` |
| `sdk/python/src/openai_codex/_run.py` | `sdk/python` | codigo | 135 | `sem equivalente` |
| `sdk/python/src/openai_codex/_runtime_requirements.py` | `sdk/python` | codigo | 64 | `sem equivalente` |
| `sdk/python/src/openai_codex/_sandbox.py` | `sdk/python` | codigo | 78 | `sem equivalente` |
| `sdk/python/src/openai_codex/_version.py` | `sdk/python` | codigo | 36 | `sem equivalente` |
| `sdk/python/src/openai_codex/api.py` | `sdk/python` | codigo | 901 | `sem equivalente` |
| `sdk/python/src/openai_codex/async_client.py` | `sdk/python` | codigo | 413 | `sem equivalente` |
| `sdk/python/src/openai_codex/client.py` | `sdk/python` | codigo | 924 | `sem equivalente` |
| `sdk/python/src/openai_codex/errors.py` | `sdk/python` | codigo | 121 | `sem equivalente` |
| `sdk/python/src/openai_codex/models.py` | `sdk/python` | codigo | 76 | `sem equivalente` |
| `sdk/python/src/openai_codex/retry.py` | `sdk/python` | codigo | 41 | `sem equivalente` |
| `sdk/python/src/openai_codex/types.py` | `sdk/python` | codigo | 81 | `sem equivalente` |
| `sdk/python/tests/app_server_harness.py` | `sdk/python` | teste | 462 | `sem equivalente` |
| `sdk/python/tests/app_server_helpers.py` | `sdk/python` | teste | 167 | `sem equivalente` |
| `sdk/python/tests/conftest.py` | `sdk/python` | teste | 16 | `sem equivalente` |
| `sdk/python/tests/installed_sdk_smoke.py` | `sdk/python` | teste | 39 | `sem equivalente` |
| `sdk/python/tests/test_app_server_approvals.py` | `sdk/python` | teste | 208 | `sem equivalente` |
| `sdk/python/tests/test_app_server_goal_operations.py` | `sdk/python` | teste | 98 | `sem equivalente` |
| `sdk/python/tests/test_app_server_inputs.py` | `sdk/python` | teste | 308 | `sem equivalente` |
| `sdk/python/tests/test_app_server_lifecycle.py` | `sdk/python` | teste | 271 | `sem equivalente` |
| `sdk/python/tests/test_app_server_login.py` | `sdk/python` | teste | 90 | `sem equivalente` |
| `sdk/python/tests/test_app_server_run.py` | `sdk/python` | teste | 381 | `sem equivalente` |
| `sdk/python/tests/test_app_server_streaming.py` | `sdk/python` | teste | 274 | `sem equivalente` |
| `sdk/python/tests/test_app_server_turn_controls.py` | `sdk/python` | teste | 81 | `sem equivalente` |
| `sdk/python/tests/test_artifact_workflow_and_binaries.py` | `sdk/python` | teste | 1485 | `sem equivalente` |
| `sdk/python/tests/test_async_client_behavior.py` | `sdk/python` | teste | 104 | `sem equivalente` |
| `sdk/python/tests/test_client_rpc_methods.py` | `sdk/python` | teste | 827 | `sem equivalente` |
| `sdk/python/tests/test_contract_generation.py` | `sdk/python` | teste | 180 | `sem equivalente` |
| `sdk/python/tests/test_mcp_conformance_fixtures.py` | `sdk/python` | teste | 37 | `sem equivalente` |
| `sdk/python/tests/test_public_api_runtime_behavior.py` | `sdk/python` | teste | 358 | `sem equivalente` |
| `sdk/python/tests/test_public_api_signatures.py` | `sdk/python` | teste | 579 | `sem equivalente` |
| `sdk/python/tests/test_real_app_server_integration.py` | `sdk/python` | teste | 569 | `sem equivalente` |
| `sdk/python/tests/test_turn_subscriptions.py` | `sdk/python` | teste | 345 | `sem equivalente` |
| `sdk/typescript/eslint.config.js` | `sdk/typescript` | codigo | 21 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/jest.config.cjs` | `sdk/typescript` | codigo | 32 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/samples/basic_streaming.ts` | `sdk/typescript` | codigo | 90 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/samples/helpers.ts` | `sdk/typescript` | codigo | 8 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/samples/structured_output.ts` | `sdk/typescript` | codigo | 22 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/samples/structured_output_zod.ts` | `sdk/typescript` | codigo | 19 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/src/codex.ts` | `sdk/typescript` | codigo | 39 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/src/codexOptions.ts` | `sdk/typescript` | codigo | 27 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/src/events.ts` | `sdk/typescript` | codigo | 84 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/src/exec.ts` | `sdk/typescript` | codigo | 506 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/src/index.ts` | `sdk/typescript` | codigo | 40 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/src/items.ts` | `sdk/typescript` | codigo | 128 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/src/outputSchemaFile.ts` | `sdk/typescript` | codigo | 40 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/src/thread.ts` | `sdk/typescript` | codigo | 159 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/src/threadOptions.ts` | `sdk/typescript` | codigo | 30 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/src/turnOptions.ts` | `sdk/typescript` | codigo | 13 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/tests/abort.test.ts` | `sdk/typescript` | teste | 165 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/tests/codexExecSpy.ts` | `sdk/typescript` | teste | 37 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/tests/exec.test.ts` | `sdk/typescript` | teste | 365 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/tests/mcpConformance.test.ts` | `sdk/typescript` | teste | 158 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/tests/responsesProxy.ts` | `sdk/typescript` | teste | 224 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/tests/run.test.ts` | `sdk/typescript` | teste | 902 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/tests/runStreamed.test.ts` | `sdk/typescript` | teste | 209 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/tests/setupCodexHome.ts` | `sdk/typescript` | teste | 28 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/tests/testCodex.ts` | `sdk/typescript` | teste | 108 | `packages/coding-agent/src/core/sdk.ts` |
| `sdk/typescript/tsup.config.ts` | `sdk/typescript` | codigo | 12 | `packages/coding-agent/src/core/sdk.ts` |
