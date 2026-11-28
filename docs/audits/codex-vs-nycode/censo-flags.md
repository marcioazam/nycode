# Censo Completo: Feature Flags, Variáveis de Ambiente e Métodos App-Server

Extração exaustiva de `codex-rs/features/src/lib.rs` (226 flags `FeatureSpec`), variáveis `CODEX_*` / `OPENAI_*` fora de testes (328 identificadores) e métodos JSON-RPC declarados em `codex-rs/app-server-protocol/src/protocol/common.rs` (281 métodos), comparados com `packages/coding-agent/src/core/settings-nycode.ts` e `packages/coding-agent/docs/environment-variables.md`.

## 1. Feature Flags no Codex (`codex-rs/features/src/lib.rs`, total = 226)

| Chave (`key`) | Variante Enum | Estágio | Default |
|---|---|---|---|
| `analytics_plan_history` | `AnalyticsPlanHistory` | `Experimental` | `default=?` |
| `cli_resume_account_check` | `CliResumeAccountCheck` | `UnderDevelopment` | `default=false` |
| `daemon_auto_start` | `DaemonAutoStart` | `Stable` | `default=true` |
| `tui_workspace` | `TuiWorkspace` | `Stable` | `default=true` |
| `tui_multi_backend` | `TuiMultiBackend` | `UnderDevelopment` | `default=false` |
| `tui_extensions_statusline` | `TuiExtensionsStatusLine` | `Experimental` | `default=?` |
| `app_server_websocket_compression` | `AppServerWebSocketCompression` | `UnderDevelopment` | `default=false` |
| `transcript_v2` | `TranscriptV2` | `Removed` | `default=false` |
| `undo` | `GhostCommit` | `Removed` | `default=false` |
| `shell_tool` | `ShellTool` | `Stable` | `default=true` |
| `view_image` | `ViewImage` | `Stable` | `default=true` |
| `multi_env_copy_file` | `MultiEnvCopyFile` | `UnderDevelopment` | `default=false` |
| `sleep_tool` | `SleepTool` | `Stable` | `default=true` |
| `secret_auth_storage` | `SecretAuthStorage` | `Stable` | `default=?` |
| `unified_exec` | `UnifiedExec` | `Stable` | `default=true` |
| `unified_exec_tty` | `UnifiedExecTty` | `Stable` | `default=true` |
| `shell_zsh_fork` | `ShellZshFork` | `Removed` | `default=false` |
| `unified_exec_zsh_fork` | `UnifiedExecZshFork` | `Removed` | `default=false` |
| `shell_snapshot` | `ShellSnapshot` | `Stable` | `default=true` |
| `login_shell_package_path` | `LoginShellPackagePath` | `Experimental` | `default=?` |
| `powershell_shell_version` | `PowerShellShellVersion` | `UnderDevelopment` | `default=false` |
| `shell_snapshot_v2` | `ShellSnapshotV2` | `UnderDevelopment` | `default=false` |
| `deferred_executor` | `DeferredExecutor` | `UnderDevelopment` | `default=false` |
| `per_environment_context` | `PerEnvironmentContext` | `UnderDevelopment` | `default=false` |
| `cwd_relative_turn_diffs` | `CwdRelativeTurnDiffs` | `UnderDevelopment` | `default=false` |
| `js_repl` | `JsRepl` | `Removed` | `default=false` |
| `content_item_kinds` | `ContentItemKinds` | `Stable` | `default=true` |
| `untrusted_as_tool_output` | `UntrustedAsToolOutput` | `Stable` | `default=true` |
| `executed_tool_call_metadata` | `ExecutedToolCallMetadata` | `UnderDevelopment` | `default=false` |
| `connector_tool_result_passthrough` | `ConnectorToolResultPassthrough` | `UnderDevelopment` | `default=false` |
| `stable_environment_tools` | `StableEnvironmentTools` | `Removed` | `default=false` |
| `code_mode` | `CodeMode` | `UnderDevelopment` | `default=false` |
| `code_mode_tool_search` | `CodeModeToolSearch` | `UnderDevelopment` | `default=false` |
| `code_mode_buffered_exec` | `CodeModeBufferedExec` | `Removed` | `default=false` |
| `code_mode_host` | `CodeModeHost` | `Stable` | `default=true` |
| `code_mode_host_grpc` | `CodeModeHostGrpc` | `Removed` | `default=false` |
| `code_mode_host_output_truncation` | `CodeModeHostOutputTruncation` | `Stable` | `default=true` |
| `code_mode_prewarm` | `CodeModePrewarm` | `UnderDevelopment` | `default=false` |
| `restored_history_prewarm` | `RestoredHistoryPrewarm` | `UnderDevelopment` | `default=false` |
| `code_mode_interrupt` | `CodeModeInterrupt` | `Stable` | `default=true` |
| `code_mode_tool_description_first` | `CodeModeToolDescriptionFirst` | `Removed` | `default=false` |
| `instant_interrupt` | `InstantInterrupt` | `UnderDevelopment` | `default=true` |
| `interrupt_on_cancel` | `InterruptOnCancel` | `UnderDevelopment` | `default=false` |
| `code_mode_only` | `CodeModeOnly` | `UnderDevelopment` | `default=false` |
| `code_mode_only_strict_3p_tools` | `CodeModeOnlyStrictThirdPartyTools` | `UnderDevelopment` | `default=false` |
| `js_repl_tools_only` | `JsReplToolsOnly` | `Removed` | `default=false` |
| `terminal_resize_reflow` | `TerminalResizeReflow` | `Removed` | `default=true` |
| `web_search_request` | `WebSearchRequest` | `Deprecated` | `default=false` |
| `web_search_cached` | `WebSearchCached` | `Deprecated` | `default=false` |
| `standalone_web_search` | `StandaloneWebSearch` | `UnderDevelopment` | `default=false` |
| `hosted_search_policy` | `HostedSearchPolicy` | `UnderDevelopment` | `default=false` |
| `search_tool` | `SearchTool` | `Removed` | `default=false` |
| `codex_git_commit` | `CodexGitCommit` | `Removed` | `default=false` |
| `runtime_metrics` | `RuntimeMetrics` | `UnderDevelopment` | `default=false` |
| `critical_path_timing` | `CriticalPathTiming` | `UnderDevelopment` | `default=false` |
| `sqlite` | `Sqlite` | `Removed` | `default=true` |
| `memories` | `MemoryTool` | `Stable` | `default=false` |
| `external_agent_memory_import` | `ExternalAgentMemoryImport` | `UnderDevelopment` | `default=false` |
| `local_thread_store_compression` | `LocalThreadStoreCompression` | `UnderDevelopment` | `default=false` |
| `local_thread_store_shared_compression` | `LocalThreadStoreSharedCompression` | `Removed` | `default=false` |
| `background_paginated_rollout_migration` | `BackgroundPaginatedRolloutMigration` | `UnderDevelopment` | `default=false` |
| `realtime_frames_local` | `RealtimeFramesLocal` | `UnderDevelopment` | `default=false` |
| `chronicle` | `Chronicle` | `UnderDevelopment` | `default=false` |
| `apply_patch_freeform` | `ApplyPatchFreeform` | `Removed` | `default=false` |
| `apply_patch_streaming_events` | `ApplyPatchStreamingEvents` | `UnderDevelopment` | `default=false` |
| `apply_patch_preserve_line_endings` | `ApplyPatchPreserveLineEndings` | `Removed` | `default=false` |
| `exec_permission_approvals` | `ExecPermissionApprovals` | `UnderDevelopment` | `default=false` |
| `write_stdin_approval` | `WriteStdinApproval` | `Stable` | `default=true` |
| `hooks` | `CodexHooks` | `Stable` | `default=true` |
| `request_permissions_tool` | `RequestPermissionsTool` | `UnderDevelopment` | `default=false` |
| `use_linux_sandbox_bwrap` | `UseLinuxSandboxBwrap` | `Removed` | `default=false` |
| `use_legacy_landlock` | `UseLegacyLandlock` | `Deprecated` | `default=false` |
| `request_rule` | `RequestRule` | `Removed` | `default=false` |
| `experimental_windows_sandbox` | `WindowsSandbox` | `Removed` | `default=false` |
| `elevated_windows_sandbox` | `WindowsSandboxElevated` | `Removed` | `default=false` |
| `windows_sandbox_service` | `WindowsSandboxService` | `UnderDevelopment` | `default=false` |
| `prefer_mxc` | `PreferMxc` | `UnderDevelopment` | `default=false` |
| `remote_models` | `RemoteModels` | `Removed` | `default=false` |
| `api_key_model_discovery` | `ApiKeyModelDiscovery` | `Stable` | `default=true` |
| `cli_daybreak` | `CliDaybreak` | `Stable` | `default=true` |
| `api_key_cyber_access_programs` | `ApiKeyCyberAccessPrograms` | `Stable` | `default=true` |
| `daybreak_program_propagation` | `DaybreakProgramPropagation` | `UnderDevelopment` | `default=false` |
| `enable_request_compression` | `EnableRequestCompression` | `Stable` | `default=true` |
| `unbounded_connection_retries` | `UnboundedConnectionRetries` | `Stable` | `default=true` |
| `network_proxy` | `NetworkProxy` | `Experimental` | `default=?` |
| `credential_masking` | `CredentialMasking` | `UnderDevelopment` | `default=false` |
| `worktrees` | `Worktrees` | `Removed` | `default=true` |
| `respect_system_proxy` | `RespectSystemProxy` | `Experimental` | `default=?` |
| `system_proxy_fallback` | `SystemProxyFallback` | `Stable` | `default=true` |
| `multi_agent` | `Collab` | `Deprecated` | `default=true` |
| `multi_agent_v2` | `MultiAgentV2` | `Stable` | `default=false` |
| `model_catalog_in_context` | `ModelCatalogInContext` | `UnderDevelopment` | `default=false` |
| `multi_agent_v2_dynamic_tools` | `MultiAgentV2DynamicTools` | `UnderDevelopment` | `default=false` |
| `subagent_thread_environments` | `SubagentThreadEnvironments` | `UnderDevelopment` | `default=false` |
| `subagent_default_context_limits` | `SubagentDefaultContextLimits` | `UnderDevelopment` | `default=false` |
| `defer_mailbox_preemption` | `DeferMailboxPreemption` | `UnderDevelopment` | `default=false` |
| `wake_on_agent_messages` | `WakeOnAgentMessages` | `UnderDevelopment` | `default=false` |
| `agent_message_board` | `AgentMessageBoard` | `UnderDevelopment` | `default=false` |
| `agent_message_board_mcp` | `AgentMessageBoardMcp` | `UnderDevelopment` | `default=false` |
| `multi_agent_mode` | `MultiAgentMode` | `Removed` | `default=false` |
| `enable_fanout` | `SpawnCsv` | `Removed` | `default=false` |
| `apps` | `Apps` | `Stable` | `default=true` |
| `catalog_apps_instructions` | `CatalogAppsInstructions` | `UnderDevelopment` | `default=false` |
| `psp` | `Psp` | `UnderDevelopment` | `default=false` |
| `enable_mcp_apps` | `EnableMcpApps` | `UnderDevelopment` | `default=false` |
| `mcp_2026_07_28` | `Mcp20260728` | `UnderDevelopment` | `default=false` |
| `mcp_tool_list_changed` | `McpToolListChanged` | `UnderDevelopment` | `default=false` |
| `mcp_connection_sharing` | `McpConnectionSharing` | `UnderDevelopment` | `default=false` |
| `mcp_shared_repl_cwd` | `McpSharedReplCwd` | `UnderDevelopment` | `default=false` |
| `mcp_lazy_stdio_startup` | `McpLazyStdioStartup` | `Stable` | `default=true` |
| `multi_environment_mcp` | `MultiEnvironmentMcp` | `UnderDevelopment` | `default=false` |
| `apps_early_resource_discovery` | `AppsEarlyResourceDiscovery` | `UnderDevelopment` | `default=false` |
| `codex_apps_mcp_2026_07_28` | `CodexAppsMcp20260728` | `UnderDevelopment` | `default=false` |
| `mcp_oauth_refresh_coordination` | `McpOAuthRefreshCoordination` | `Stable` | `default=true` |
| `use_xaa` | `UseXaa` | `UnderDevelopment` | `default=false` |
| `apps_mcp_path_override` | `AppsMcpPathOverride` | `Removed` | `default=false` |
| `tool_search` | `ToolSearch` | `Removed` | `default=false` |
| `tool_search_always_defer_mcp_tools` | `ToolSearchAlwaysDeferMcpTools` | `Removed` | `default=true` |
| `deferred_tool_world_state` | `DeferredToolWorldState` | `Stable` | `default=true` |
| `command_sessions_world_state` | `CommandSessionsWorldState` | `UnderDevelopment` | `default=false` |
| `incremental_tools` | `IncrementalTools` | `Stable` | `default=true` |
| `incremental_tools_legacy` | `IncrementalToolsLegacy` | `Stable` | `default=true` |
| `incremental_tools_legacy_gcp` | `IncrementalToolsLegacyGcp` | `Stable` | `default=true` |
| `suppress_model_change_announcements` | `SuppressModelChangeAnnouncements` | `Stable` | `default=false` |
| `prediction_preserve_parent_tools` | `PredictionPreserveParentTools` | `Stable` | `default=true` |
| `incremental_exec_tools` | `IncrementalExecTools` | `UnderDevelopment` | `default=false` |
| `non_prefixed_mcp_tool_names` | `NonPrefixedMcpToolNames` | `UnderDevelopment` | `default=false` |
| `unavailable_dummy_tools` | `UnavailableDummyTools` | `Removed` | `default=false` |
| `tool_suggest` | `ToolSuggest` | `Stable` | `default=true` |
| `recommended_plugins` | `RecommendedPlugins` | `Stable` | `default=false` |
| `plugins` | `Plugins` | `Stable` | `default=true` |
| `simplified_selection_hints` | `SimplifiedSelectionHints` | `UnderDevelopment` | `default=false` |
| `executor_capability_discovery` | `ExecutorCapabilityDiscovery` | `UnderDevelopment` | `default=false` |
| `executor_capability_discovery_v2` | `ExecutorCapabilityDiscoveryV2` | `UnderDevelopment` | `default=false` |
| `skip_host_skill_discovery` | `SkipHostSkillDiscovery` | `UnderDevelopment` | `default=false` |
| `plugin_hooks` | `PluginHooks` | `Removed` | `default=false` |
| `in_app_browser` | `InAppBrowser` | `Stable` | `default=true` |
| `browser_annotation_api` | `BrowserAnnotationApi` | `Stable` | `default=true` |
| `in_app_chat` | `InAppChat` | `Stable` | `default=true` |
| `in_app_dictation` | `InAppDictation` | `Stable` | `default=true` |
| `in_app_voice` | `InAppVoice` | `Stable` | `default=true` |
| `in_app_local_automation` | `InAppLocalAutomation` | `Stable` | `default=true` |
| `in_app_updates` | `InAppUpdates` | `Stable` | `default=true` |
| `browser_use` | `BrowserUse` | `Stable` | `default=true` |
| `browser_use_full_cdp_access` | `BrowserUseFullCdpAccess` | `Stable` | `default=true` |
| `browser_use_external` | `BrowserUseExternal` | `Stable` | `default=true` |
| `computer_use` | `ComputerUse` | `Stable` | `default=true` |
| `remote_plugin` | `RemotePlugin` | `Stable` | `default=true` |
| `plugin_discovery_prefetch` | `PluginDiscoveryPrefetch` | `Removed` | `default=false` |
| `plugin_sharing` | `PluginSharing` | `Stable` | `default=true` |
| `external_migration` | `ExternalMigration` | `Removed` | `default=false` |
| `image_generation` | `ImageGeneration` | `Stable` | `default=true` |
| `image_generation_animation` | `ImageGenerationAnimation` | `UnderDevelopment` | `default=false` |
| `omit_app_server_notification_media` | `OmitAppServerNotificationMedia` | `UnderDevelopment` | `default=false` |
| `file_backed_tool_audio` | `FileBackedToolAudio` | `UnderDevelopment` | `default=false` |
| `image_resize_notice` | `ImageResizeNotice` | `UnderDevelopment` | `default=false` |
| `unified_image_budget` | `UnifiedImageBudget` | `Stable` | `default=true` |
| `safe_image_decoder` | `SafeImageDecoder` | `UnderDevelopment` | `default=false` |
| `resize_all_images` | `ResizeAllImages` | `Removed` | `default=true` |
| `item_ids` | `ItemIds` | `Removed` | `default=true` |
| `concurrent_reasoning_summaries` | `ConcurrentReasoningSummaries` | `UnderDevelopment` | `default=false` |
| `output_token_replay` | `OutputTokenReplay` | `UnderDevelopment` | `default=false` |
| `skill_mcp_dependency_install` | `SkillMcpDependencyInstall` | `Stable` | `default=true` |
| `omit_skill_descriptions` | `OmitSkillDescriptions` | `UnderDevelopment` | `default=false` |
| `skill_search` | `SkillSearch` | `Stable` | `default=true` |
| `skill_catalog_deltas` | `SkillCatalogDeltas` | `UnderDevelopment` | `default=false` |
| `skill_env_var_dependency_prompt` | `SkillEnvVarDependencyPrompt` | `Removed` | `default=false` |
| `mentions_v2` | `MentionsV2` | `Stable` | `default=true` |
| `steer` | `Steer` | `Removed` | `default=true` |
| `default_mode_request_user_input` | `DefaultModeRequestUserInput` | `UnderDevelopment` | `default=false` |
| `send_async_message` | `SendAsyncMessage` | `Removed` | `default=false` |
| `send_message_to_user_async` | `SendMessageToUserAsync` | `UnderDevelopment` | `default=false` |
| `terminal_visualization_instructions` | `TerminalVisualizationInstructions` | `UnderDevelopment` | `default=false` |
| `guardian_approval` | `GuardianApproval` | `Stable` | `default=true` |
| `guardian_include_additional_context` | `GuardianIncludeAdditionalContext` | `Stable` | `default=true` |
| `guardian_recorded_items` | `GuardianRecordedItems` | `UnderDevelopment` | `default=false` |
| `guardianv2.thread_context` | `GuardianThreadContext` | `Removed` | `default=false` |
| `guardian_reuse_parent_compaction` | `GuardianReuseParentCompaction` | `Stable` | `default=true` |
| `guardian_root_handoff_context` | `GuardianRootHandoffContext` | `UnderDevelopment` | `default=false` |
| `guardian_native_multi_agent_history` | `GuardianNativeMultiAgentHistory` | `UnderDevelopment` | `default=false` |
| `guardian_nested_approval_context` | `GuardianNestedApprovalContext` | `UnderDevelopment` | `default=false` |
| `guardian_enhanced_node_repl_transcripts` | `GuardianEnhancedNodeReplTranscripts` | `UnderDevelopment` | `default=false` |
| `guardian_node_repl_transcript_images` | `GuardianNodeReplTranscriptImages` | `UnderDevelopment` | `default=false` |
| `guardian_trust_orchestrator_connectors` | `GuardianTrustOrchestratorConnectors` | `UnderDevelopment` | `default=false` |
| `guardian_conversation_history_tools` | `GuardianConversationHistoryTools` | `UnderDevelopment` | `default=false` |
| `guardian_denial_reconsideration` | `GuardianDenialReconsideration` | `UnderDevelopment` | `default=false` |
| `guardianv2` | `GuardianV2` | `UnderDevelopment` | `default=false` |
| `guardianv2_decisions_comparison` | `GuardianV2DecisionsComparison` | `UnderDevelopment` | `default=false` |
| `guardianv3` | `GuardianV3` | `UnderDevelopment` | `default=false` |
| `guardian_ext` | `GuardianExt` | `Removed` | `default=false` |
| `goals` | `Goals` | `Stable` | `default=true` |
| `token_budget` | `TokenBudget` | `UnderDevelopment` | `default=false` |
| `context_management` | `ContextManagement` | `UnderDevelopment` | `default=false` |
| `rollout_budget` | `RolloutBudget` | `UnderDevelopment` | `default=false` |
| `reasoning_effort_override` | `ReasoningEffortOverride` | `Stable` | `default=true` |
| `current_time_reminder` | `CurrentTimeReminder` | `UnderDevelopment` | `default=false` |
| `utc_environment_date` | `UtcEnvironmentDate` | `UnderDevelopment` | `default=false` |
| `nonfatal_clock_read_errors` | `NonfatalClockReadErrors` | `UnderDevelopment` | `default=false` |
| `collaboration_modes` | `CollaborationModes` | `Removed` | `default=true` |
| `tool_call_mcp_elicitation` | `ToolCallMcpElicitation` | `Stable` | `default=true` |
| `auth_elicitation` | `AuthElicitation` | `Stable` | `default=true` |
| `bedrock_setup_wizard` | `BedrockSetupWizard` | `Stable` | `default=true` |
| `gcp_setup_wizard` | `GcpSetupWizard` | `Stable` | `default=false` |
| `gateway_setup_wizard` | `GatewaySetupWizard` | `Stable` | `default=false` |
| `personality` | `Personality` | `Removed` | `default=false` |
| `artifact` | `Artifact` | `UnderDevelopment` | `default=false` |
| `fast_mode` | `FastMode` | `Stable` | `default=true` |
| `ultrafast_mode` | `UltrafastMode` | `Stable` | `default=true` |
| `step_model_switching` | `StepModelSwitching` | `UnderDevelopment` | `default=false` |
| `realtime_conversation` | `RealtimeConversation` | `Removed` | `default=true` |
| `remote_control` | `RemoteControl` | `Removed` | `default=false` |
| `image_detail_original` | `ImageDetailOriginal` | `Removed` | `default=false` |
| `tui_app_server` | `TuiAppServer` | `Removed` | `default=true` |
| `prevent_idle_sleep` | `PreventIdleSleep` | `?` | `default=?` |
| `workspace_owner_usage_nudge` | `WorkspaceOwnerUsageNudge` | `Removed` | `default=false` |
| `responses_websockets` | `ResponsesWebsockets` | `Removed` | `default=false` |
| `responses_websockets_v2` | `ResponsesWebsocketsV2` | `Removed` | `default=false` |
| `remote_compaction_v2` | `RemoteCompactionV2` | `Removed` | `default=false` |
| `async_compaction` | `AsyncCompaction` | `UnderDevelopment` | `default=false` |
| `async_compaction_root_only` | `AsyncCompactionRootOnly` | `UnderDevelopment` | `default=false` |
| `compaction_image_budget` | `CompactionImageBudget` | `Stable` | `default=true` |
| `retain_client_developer_messages` | `RetainClientDeveloperMessages` | `UnderDevelopment` | `default=false` |
| `retain_client_tool_outputs` | `RetainClientToolOutputs` | `Stable` | `default=true` |
| `use_agent_identity` | `UseAgentIdentity` | `UnderDevelopment` | `default=false` |
| `runtime_agent_instances` | `RuntimeAgentInstances` | `UnderDevelopment` | `default=false` |
| `workspace_dependencies` | `WorkspaceDependencies` | `Stable` | `default=true` |

## 2. Variáveis de Ambiente no Codex (não-teste, total = 328)

| Variável | Arquivos de definição/uso no Codex |
|---|---|
| `CODEX_ABSOLUTE_PATH_REMOVED_CWD_CHILD` | `['codex-rs/utils/absolute-path/src/lib.rs']` |
| `CODEX_ACCENT_COLOR_TEST_CHILD` | `['codex-rs/tui/src/style.rs']` |
| `CODEX_ACCESS_TOKEN` | `['codex-rs/cli/src/login.rs', 'codex-rs/cli/src/main.rs']` |
| `CODEX_ACCESS_TOKEN_ENV_VAR` | `['codex-rs/cli/src/doctor.rs', 'codex-rs/login/src/auth/manager.rs']` |
| `CODEX_AGENT_IDENTITY_AUTHAPI_BASE_URL` | `['codex-rs/login/src/auth/agent_identity.rs']` |
| `CODEX_AGENT_IDENTITY_AUTHAPI_BASE_URL_ENV_VAR` | `['codex-rs/login/src/auth/agent_identity.rs']` |
| `CODEX_AGENT_IDENTITY_JWKS_BASE_URL` | `['codex-rs/login/src/auth/agent_identity.rs']` |
| `CODEX_AGENT_IDENTITY_JWKS_BASE_URL_ENV_VAR` | `['codex-rs/login/src/auth/agent_identity.rs']` |
| `CODEX_AGENT_PLUGIN_EXTENSION_NAMESPACE` | `['codex-rs/core-plugins/src/agent_plugin_manifest.rs']` |
| `CODEX_ANALYTICS_EVENTS_CAPTURE_FILE` | `['codex-rs/analytics/src/analytics_capture.rs', 'codex-rs/app-server-test-client/src/plugin_analytics_smoke.rs']` |
| `CODEX_API_KEY` | `['codex-rs/app-server-client/src/lib.rs', 'codex-rs/app-server/src/in_process.rs']` |
| `CODEX_API_KEY_ENV_VAR` | `['codex-rs/cli/src/doctor.rs', 'codex-rs/login/src/auth/manager.rs']` |
| `CODEX_APPLY_GIT_CFG` | `['codex-rs/git-utils/src/apply.rs']` |
| `CODEX_APPLY_PATCH_PRESERVE_LINE_ENDINGS` | `['codex-rs/apply-patch/src/lib.rs']` |
| `CODEX_APPLY_PATCH_PRESERVE_LINE_ENDINGS_ENV_VAR` | `['codex-rs/apply-patch/src/lib.rs', 'codex-rs/core/src/exec_env.rs']` |
| `CODEX_APPS_MCP_SERVER_NAME` | `['codex-rs/app-server/src/mcp_refresh.rs', 'codex-rs/app-server/src/request_processors/apps_processor/installed.rs']` |
| `CODEX_APPS_RECONNECT_INITIAL_BACKOFF` | `['codex-rs/codex-mcp/src/rmcp_client.rs']` |
| `CODEX_APPS_RECONNECT_MAX_BACKOFF` | `['codex-rs/codex-mcp/src/rmcp_client.rs']` |
| `CODEX_APPS_REFRESH_DURATION_METRIC` | `['codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs', 'codex-rs/codex-mcp/src/rmcp_client.rs']` |
| `CODEX_APPS_SERVER_INFO_CACHE_DIR` | `['codex-rs/connectors/src/connector_runtime/persistence.rs']` |
| `CODEX_APPS_SERVER_INFO_CACHE_SCHEMA_VERSION` | `['codex-rs/connectors/src/connector_runtime/persistence.rs']` |
| `CODEX_APPS_TOOLS_CACHE_ATTACHMENT_FILENAME` | `['codex-rs/app-server/src/request_processors/feedback_processor.rs', 'codex-rs/feedback/src/lib.rs']` |
| `CODEX_APPS_TOOLS_CACHE_DIR` | `['codex-rs/connectors/src/connector_runtime/persistence.rs']` |
| `CODEX_APPS_TOOLS_CACHE_MAX_BYTES` | `['codex-rs/connectors/src/connector_runtime/persistence.rs', 'codex-rs/connectors/src/connector_runtime/tests.rs']` |
| `CODEX_APPS_TOOLS_CACHE_SCHEMA_VERSION` | `['codex-rs/connectors/src/connector_runtime/persistence.rs', 'codex-rs/connectors/src/connector_runtime/tests.rs']` |
| `CODEX_APP_DIRECTORY_CACHE_ATTACHMENT_FILENAME` | `['codex-rs/app-server/src/request_processors/feedback_processor.rs', 'codex-rs/feedback/src/lib.rs']` |
| `CODEX_APP_SERVER_CHATGPT_BASE_URL` | `['codex-rs/connectors/src/lib.rs']` |
| `CODEX_APP_SERVER_DEV_OPEN_APP_URL` | `['codex-rs/app-server/src/request_processors/account_processor.rs']` |
| `CODEX_APP_SERVER_DISABLE_MANAGED_CONFIG` | `['codex-rs/app-server/src/main.rs']` |
| `CODEX_APP_SERVER_LOGIN_CLIENT_ID` | `['codex-rs/login/src/auth/manager.rs']` |
| `CODEX_APP_SERVER_LOGIN_ISSUER` | `['codex-rs/app-server/src/request_processors/account_processor.rs']` |
| `CODEX_APP_SERVER_MANAGED_CONFIG_PATH` | `['codex-rs/app-server/src/main.rs']` |
| `CODEX_APP_SERVER_SCHEMA_EXPERIMENTAL` | `['codex-rs/app-server-protocol/scripts/write_schema_fixtures.py', 'codex-rs/app-server-protocol/src/schema_fixtures.rs']` |
| `CODEX_APP_SERVER_SCHEMA_PRETTIER` | `['codex-rs/app-server-protocol/scripts/write_schema_fixtures.py', 'codex-rs/app-server-protocol/src/schema_fixtures.rs']` |
| `CODEX_APP_SERVER_SCHEMA_ROOT` | `['codex-rs/app-server-protocol/scripts/write_schema_fixtures.py', 'codex-rs/app-server-protocol/src/schema_fixtures.rs']` |
| `CODEX_APP_SERVER_TEST_USER_CONFIG_FILE` | `['codex-rs/app-server-test-client/src/plugin_analytics_smoke.rs', 'codex-rs/app-server/src/lib.rs']` |
| `CODEX_APP_SERVER_URL` | `['codex-rs/app-server-test-client/src/lib.rs']` |
| `CODEX_ARG0_EXEC_HELPER_ARG1` | `['codex-rs/app-server/src/bin/exec_server.rs', 'codex-rs/arg0/src/lib.rs']` |
| `CODEX_ARGUMENT_COMMENT_LINT_SKIP_RUSTUP_SHIMS` | `['tools/argument-comment-lint/wrapper_common.py']` |
| `CODEX_AUTH` | `['codex-rs/login/src/auth/storage.rs']` |
| `CODEX_AUTHAPI_BASE_URL` | `['codex-rs/login/src/auth/personal_access_token.rs']` |
| `CODEX_AUTHAPI_BASE_URL_ENV_VAR` | `['codex-rs/login/src/auth/personal_access_token.rs']` |
| `CODEX_AUTH_CACHE` | `['codex-rs/secrets/src/local.rs']` |
| `CODEX_AUTH_SECRETS_FILENAME` | `['codex-rs/secrets/src/local.rs']` |
| `CODEX_AUTH_SECRET_NAME` | `['codex-rs/login/src/auth/storage.rs']` |
| `CODEX_BAZEL_BIN` | `['.github/scripts/run_bazel.py', '.github/scripts/test_run_bazel.py']` |
| `CODEX_BAZEL_EXECUTION_LOG_COMPACT_DIR` | `['.github/scripts/run-bazel-ci.sh']` |
| `CODEX_BAZEL_GCS_BUCKET` | `['.github/scripts/run_bazel.py', '.github/scripts/test_run_bazel.py']` |
| `CODEX_BAZEL_GCS_CREDENTIALS` | `['.github/scripts/run_bazel.py', '.github/scripts/test_run_bazel.py']` |
| `CODEX_BAZEL_WINDOWS_PATH` | `['.github/scripts/compute-bazel-windows-path.ps1', '.github/scripts/run-bazel-ci.sh']` |
| `CODEX_BIN` | `['codex-rs/app-server-test-client/src/lib.rs']` |
| `CODEX_BUILD_COMMIT` | `['codex-rs/cli/src/doctor/runtime.rs']` |
| `CODEX_BUILD_TARGET` | `['codex-rs/build-info/build.rs', 'codex-rs/build-info/src/lib.rs']` |
| `CODEX_BUNDLE_IDENTIFIER` | `['codex-rs/cli/src/desktop_app/mac.rs']` |
| `CODEX_BWRAP_SHA256` | `['codex-rs/linux-sandbox/build.rs', 'codex-rs/linux-sandbox/src/bundled_bwrap.rs']` |
| `CODEX_BWRAP_SOURCE_DIR` | `['codex-rs/bwrap/build.rs']` |
| `CODEX_CA_CERTIFICATE` | `['codex-rs/app-server-daemon/src/background_command.rs', 'codex-rs/app-server-transport/src/transport/remote_control/websocket.rs']` |
| `CODEX_CA_CERT_ENV` | `['codex-rs/http-client/src/custom_ca.rs']` |
| `CODEX_CI` | `['codex-rs/core/src/unified_exec/process_manager.rs']` |
| `CODEX_CLI` | `['codex-rs/tui/src/analytics/normalize.rs']` |
| `CODEX_CLI_BIN_PLATFORM_TAG` | `['sdk/python-runtime/hatch_build.py']` |
| `CODEX_CLI_ROOT` | `['codex-cli/scripts/build_npm_package.py']` |
| `CODEX_CLI_VERSION` | `['codex-rs/tui/src/app.rs', 'codex-rs/tui/src/app/agents_overview.rs']` |
| `CODEX_CLOUD_ACCESS_TOKEN` | `['codex-rs/cloud-client/examples/attach.rs']` |
| `CODEX_CLOUD_ACCOUNT_ID` | `['codex-rs/cloud-client/examples/attach.rs']` |
| `CODEX_CLOUD_TASKS_BASE_URL` | `['codex-rs/cloud-tasks/src/lib.rs', 'codex-rs/cloud-tasks/src/util.rs']` |
| `CODEX_CLOUD_TASKS_FORCE_INTERNAL` | `['codex-rs/cloud-tasks/src/lib.rs']` |
| `CODEX_CLOUD_TASKS_MODE` | `['codex-rs/cloud-tasks/src/lib.rs']` |
| `CODEX_CMD` | `['codex-rs/windows-sandbox-rs/sandbox_smoketests.py']` |
| `CODEX_COMPAT_RELEASES` | `['.github/scripts/resolve_exec_server_releases.py']` |
| `CODEX_CONFORMANCE_ADAPTER_REPORT` | `['scripts/mcp_conformance/codex_conformance_adapter.py', 'scripts/mcp_conformance/official_conformance.py']` |
| `CODEX_CONFORMANCE_BINARY` | `['scripts/mcp_conformance/codex_conformance_adapter.py', 'scripts/mcp_conformance/official_conformance.py']` |
| `CODEX_CONFORMANCE_CLIENT_REGISTRATION` | `['scripts/mcp_conformance/codex_conformance_adapter.py', 'scripts/mcp_conformance/run_codex_compliance.py']` |
| `CODEX_CONFORMANCE_ENABLE_MODERN_FEATURE` | `['scripts/mcp_conformance/codex_conformance_adapter.py', 'scripts/mcp_conformance/run_codex_compliance.py']` |
| `CODEX_CONFORMANCE_HOME` | `['scripts/mcp_conformance/codex_conformance_adapter.py', 'scripts/mcp_conformance/official_conformance.py']` |
| `CODEX_CONFORMANCE_REQUIRE_AUTOMATIC_AUTH` | `['scripts/mcp_conformance/codex_conformance_adapter.py', 'scripts/mcp_conformance/official_conformance.py']` |
| `CODEX_CONFORMANCE_TIMEOUT` | `['scripts/mcp_conformance/codex_conformance_adapter.py', 'scripts/mcp_conformance/run_codex_compliance.py']` |
| `CODEX_CONNECTORS_TOKEN` | `['codex-rs/codex-mcp/src/connection_manager.rs', 'codex-rs/codex-mcp/src/mcp/mod.rs']` |
| `CODEX_CONNECTORS_TOKEN_ENV_VAR` | `['codex-rs/codex-mcp/src/mcp/mod.rs']` |
| `CODEX_CORE_APPLY_PATCH_ARG1` | `['codex-rs/apply-patch/src/lib.rs', 'codex-rs/arg0/src/lib.rs']` |
| `CODEX_CUSTOM_CA_PROBE_PROXY` | `['codex-rs/http-client/src/bin/custom_ca_probe.rs']` |
| `CODEX_CUSTOM_CA_PROBE_TLS13` | `['codex-rs/http-client/src/bin/custom_ca_probe.rs']` |
| `CODEX_CUSTOM_CA_PROBE_URL` | `['codex-rs/http-client/src/bin/custom_ca_probe.rs']` |
| `CODEX_DAEMON_JUNCTION_LINK` | `['codex-rs/app-server-daemon/src/prepare_install_windows.rs']` |
| `CODEX_DAEMON_JUNCTION_TARGET` | `['codex-rs/app-server-daemon/src/prepare_install_windows.rs']` |
| `CODEX_DAEMON_SHUTDOWN_FILE` | `['codex-rs/app-server-transport/src/daemon_shutdown.rs']` |
| `CODEX_DAEMON_SHUTDOWN_SOCKET` | `['codex-rs/app-server-transport/src/lib.rs']` |
| `CODEX_DAEMON_TELEMETRY_HANDOFF` | `['codex-rs/app-server-daemon/src/telemetry.rs']` |
| `CODEX_DESKTOP_APP` | `['codex-rs/tui/src/analytics/normalize.rs']` |
| `CODEX_DMG_URL_ARM64` | `['codex-rs/cli/src/desktop_app/mac.rs']` |
| `CODEX_DMG_URL_X64` | `['codex-rs/cli/src/desktop_app/mac.rs']` |
| `CODEX_DOCTOR_DISABLED_MCP_TOKEN` | `['codex-rs/cli/src/doctor.rs']` |
| `CODEX_DOCTOR_MISSING_MCP_TOKEN` | `['codex-rs/cli/src/doctor.rs']` |
| `CODEX_E2E_MODEL` | `['codex-rs/app-server-test-client/src/lib.rs']` |
| `CODEX_ELEVATED_TEST` | `['codex-rs/windows-sandbox-rs/src/unified_exec/tests.rs']` |
| `CODEX_EXECUTABLE` | `['sdk/typescript/samples/helpers.ts']` |
| `CODEX_EXEC_SERVER_EXIT_ON_STDIN_CLOSE` | `['codex-rs/exec-server/src/lib.rs']` |
| `CODEX_EXEC_SERVER_EXIT_ON_STDIN_CLOSE_ENV_VAR` | `['codex-rs/exec-server-cli/src/command.rs', 'codex-rs/exec-server/src/lib.rs']` |
| `CODEX_EXEC_SERVER_LISTEN_URL` | `['scripts/run_tui_with_exec_server.sh']` |
| `CODEX_EXEC_SERVER_NOISE_AUTH_TOKEN` | `['codex-rs/protocol/src/shell_environment.rs']` |
| `CODEX_EXEC_SERVER_NOISE_AUTH_TOKEN_ENV_VAR` | `['codex-rs/exec-server/src/client/route_aware_http_client.rs', 'codex-rs/exec-server/src/environment.rs']` |
| `CODEX_EXEC_SERVER_NOISE_CHATGPT_ACCOUNT_ID` | `['codex-rs/exec-server/src/environment.rs']` |
| `CODEX_EXEC_SERVER_NOISE_CHATGPT_ACCOUNT_ID_ENV_VAR` | `['codex-rs/exec-server/src/environment.rs', 'codex-rs/exec-server/src/lib.rs']` |
| `CODEX_EXEC_SERVER_NOISE_ENVIRONMENT_ID` | `['codex-rs/exec-server/src/environment.rs']` |
| `CODEX_EXEC_SERVER_NOISE_ENVIRONMENT_ID_ENV_VAR` | `['codex-rs/exec-server/src/environment.rs', 'codex-rs/exec-server/src/lib.rs']` |
| `CODEX_EXEC_SERVER_NOISE_REGISTRY_URL` | `['codex-rs/exec-server/src/environment.rs']` |
| `CODEX_EXEC_SERVER_NOISE_REGISTRY_URL_ENV_VAR` | `['codex-rs/exec-server/src/environment.rs', 'codex-rs/exec-server/src/lib.rs']` |
| `CODEX_EXEC_SERVER_PROXY_PRIVATE_IPS_VIA_UPSTREAM` | `['codex-rs/exec-server-cli/src/command.rs']` |
| `CODEX_EXEC_SERVER_START_TIMEOUT_SECONDS` | `['scripts/run_tui_with_exec_server.sh']` |
| `CODEX_EXEC_SERVER_URL` | `['codex-rs/exec-server/src/environment.rs', 'codex-rs/exec-server/src/environment_provider.rs']` |
| `CODEX_EXEC_SERVER_URL_ENV_VAR` | `['codex-rs/cli/src/remote_control_cmd.rs', 'codex-rs/exec-server/src/environment.rs']` |
| `CODEX_FEEDBACK_INTERNAL_URL` | `['codex-rs/tui/src/bottom_pane/feedback_view.rs']` |
| `CODEX_FS_HELPER_ARG1` | `['codex-rs/app-server/src/bin/exec_server.rs', 'codex-rs/arg0/src/lib.rs']` |
| `CODEX_GITHUB` | `['codex-rs/tui/src/analytics/normalize.rs']` |
| `CODEX_GITHUB_PERSONAL_ACCESS_TOKEN` | `['codex-rs/codex-mcp/src/connection_manager/startup.rs']` |
| `CODEX_GITHUB_TOKEN` | `['codex-rs/network-proxy/src/mitm_hook.rs']` |
| `CODEX_GIT_UTILS_STDIN_CHILD` | `['codex-rs/git-utils/src/info.rs']` |
| `CODEX_GUARDIAN_DECISIONS_API_KEY` | `['codex-rs/exec-server/src/client/route_aware_http_client.rs', 'codex-rs/ext/guardian-v2/src/async_scorer/startup.rs']` |
| `CODEX_HOME` | `['codex-rs/app-server-client/src/remote_addr.rs', 'codex-rs/app-server-daemon/src/background_command.rs']` |
| `CODEX_HOME_DIR` | `['scripts/install/install.sh']` |
| `CODEX_HOME_FLAG` | `['codex-rs/windows-sandbox-rs/src/wrapper.rs']` |
| `CODEX_IDE_VSCODE` | `['codex-rs/tui/src/analytics/normalize.rs']` |
| `CODEX_INSTALLER_USE_RELEASES_OPENAI_COM` | `['scripts/install/install.ps1', 'scripts/install/install.sh']` |
| `CODEX_INSTALL_DAEMON_ONLY` | `['codex-rs/app-server-daemon/src/update_loop.rs', 'scripts/install/install.ps1']` |
| `CODEX_INSTALL_DEFER_SELECTION` | `['codex-rs/app-server-daemon/src/migration.rs', 'codex-rs/app-server-daemon/src/update_loop.rs']` |
| `CODEX_INSTALL_DIR` | `['scripts/install/install.ps1', 'scripts/install/install.sh']` |
| `CODEX_INSTALL_IF_CURRENT` | `['codex-rs/app-server-daemon/src/update_loop.rs', 'scripts/install/install.ps1']` |
| `CODEX_INSTALL_IF_LATEST` | `['codex-rs/app-server-daemon/src/update_loop.rs', 'scripts/install/install.ps1']` |
| `CODEX_INTERNAL_APP_SERVER_REMOTE_CONTROL_DISABLED` | `['codex-rs/app-server-transport/src/transport/remote_control/mod.rs']` |
| `CODEX_INTERNAL_ORIGINATOR_OVERRIDE` | `['codex-rs/app-server/src/request_processors/initialize_processor.rs', 'codex-rs/login/src/auth/default_client.rs']` |
| `CODEX_INTERNAL_ORIGINATOR_OVERRIDE_ENV_VAR` | `['codex-rs/core/src/thread_manager.rs', 'codex-rs/login/src/auth/default_client.rs']` |
| `CODEX_LEGACY_NOTIFY_SNAPSHOT` | `['codex-rs/hooks/src/legacy_notify.rs']` |
| `CODEX_LIMIT_ID` | `['codex-rs/memories/write/src/guard.rs', 'codex-rs/memories/write/src/lib.rs']` |
| `CODEX_LINUX_SANDBOX_ARG0` | `['codex-rs/arg0/src/lib.rs', 'codex-rs/linux-sandbox/src/linux_run_main.rs']` |
| `CODEX_LINUX_SANDBOX_EXE_ENV_VAR` | `['codex-rs/app-server/src/bin/exec_server.rs']` |
| `CODEX_LOG` | `['codex-rs/exec-server/src/environment_toml.rs']` |
| `CODEX_MANAGED_BY_BUN` | `['codex-rs/cli/src/doctor.rs', 'codex-rs/install-context/src/lib.rs']` |
| `CODEX_MANAGED_BY_NPM` | `['codex-rs/cli/src/doctor.rs', 'codex-rs/install-context/src/lib.rs']` |
| `CODEX_MANAGED_BY_PNPM` | `['codex-rs/cli/src/doctor.rs', 'codex-rs/install-context/src/lib.rs']` |
| `CODEX_MANAGED_BY_VITE_PLUS` | `['codex-rs/cli/src/doctor.rs', 'codex-rs/install-context/src/lib.rs']` |
| `CODEX_MANAGED_CONFIG_SYSTEM_PATH` | `['codex-rs/config/src/loader/layer_io.rs']` |
| `CODEX_MANAGED_PACKAGE_ROOT` | `['codex-rs/cli/src/doctor.rs']` |
| `CODEX_MARKETPLACE_HAVE` | `['codex-rs/core-plugins/src/marketplace_upgrade/git.rs']` |
| `CODEX_MCP_PROTOCOL_VERSION` | `['codex-rs/codex-mcp/src/server.rs', 'codex-rs/rmcp-client/src/bin/test_mcp_2026_discovery_stdio_server.rs']` |
| `CODEX_MESSAGE_BOARD_TOKEN` | `['codex-rs/message-board-mcp/src/main.rs']` |
| `CODEX_MICROSOFT_STORE_WEB_URL` | `['codex-rs/cli/src/desktop_app/windows.rs']` |
| `CODEX_MUSL_RELEASE_LINK_FLAGS` | `['.github/scripts/install-musl-build-tools.sh']` |
| `CODEX_NETWORK_ALLOW_LOCAL_BINDING` | `['codex-rs/network-proxy/src/proxy.rs', 'codex-rs/windows-sandbox-rs/src/setup.rs']` |
| `CODEX_NETWORK_POLICY_VIOLATION` | `['codex-rs/network-proxy/src/runtime.rs']` |
| `CODEX_NETWORK_PROXY_ACTIVE` | `['codex-rs/network-proxy/src/proxy.rs']` |
| `CODEX_NETWORK_PROXY_ATTRIBUTION` | `['codex-rs/network-proxy/src/attribution.rs']` |
| `CODEX_NETWORK_PROXY_BROKERED_CREDENTIALS` | `['codex-rs/core/src/shell_snapshot.rs', 'codex-rs/network-proxy/src/credential_broker.rs']` |
| `CODEX_NETWORK_PROXY_CREDENTIAL_BROKER_ACTIVE` | `['codex-rs/network-proxy/src/credential_broker.rs']` |
| `CODEX_NETWORK_PROXY_SNAPSHOT_BROKERED_UNSET_` | `['codex-rs/shell-command/src/shell_snapshot_restore.rs']` |
| `CODEX_NETWORK_PROXY_SNAPSHOT_BROKERED_VALUE_` | `['codex-rs/shell-command/src/shell_snapshot_restore.rs']` |
| `CODEX_NETWORK_PROXY_SNAPSHOT_ORIGINAL_BASH_ENV` | `['codex-rs/core/src/tools/runtimes/mod.rs']` |
| `CODEX_NETWORK_PROXY_SNAPSHOT_ORIGINAL_POSIX_ENV` | `['codex-rs/core/src/tools/runtimes/mod.rs']` |
| `CODEX_NETWORK_PROXY_SNAPSHOT_ORIGINAL_ZDOTDIR` | `['codex-rs/core/src/tools/runtimes/mod.rs']` |
| `CODEX_NON_INTERACTIVE` | `['codex-rs/app-server-daemon/src/update_loop.rs', 'codex-rs/tui/src/update_action.rs']` |
| `CODEX_NPM_NAME` | `['codex-cli/scripts/build_npm_package.py', 'sdk/typescript/src/exec.ts']` |
| `CODEX_OLLAMA_INVALID_CA_TEST_POLICY` | `['codex-rs/ollama/src/client.rs']` |
| `CODEX_OPEN_APP_URL` | `['codex-rs/app-server/src/request_processors.rs', 'codex-rs/app-server/src/request_processors/account_processor.rs']` |
| `CODEX_OSS_` | `['codex-rs/model-provider-info/src/lib.rs']` |
| `CODEX_OSS_BASE_URL` | `['codex-rs/model-provider-info/src/lib.rs']` |
| `CODEX_OSS_PORT` | `['codex-rs/model-provider-info/src/lib.rs']` |
| `CODEX_OSS_SELECTION_INVALID_CA_TEST_CHILD` | `['codex-rs/tui/src/oss_selection.rs']` |
| `CODEX_PACKAGE_COMPONENT` | `['codex-cli/scripts/build_npm_package.py', 'scripts/stage_npm_packages.py']` |
| `CODEX_PACKAGE_METADATA` | `['sdk/python/scripts/update_sdk_artifacts.py']` |
| `CODEX_PATH_LINE` | `['scripts/install/install.sh']` |
| `CODEX_PERMISSION_PROFILE` | `['codex-rs/core/src/exec_env.rs']` |
| `CODEX_PERMISSION_PROFILE_ENV_VAR` | `['codex-rs/core/src/exec_env.rs', 'codex-rs/core/src/tools/runtimes/mod.rs']` |
| `CODEX_PLATFORM_PACKAGES` | `['codex-cli/scripts/build_npm_package.py', 'scripts/stage_npm_packages.py']` |
| `CODEX_PLUGIN_METRICS_OUTPUT` | `['codex-rs/core-plugins/src/plugin_metrics_sidecar.rs']` |
| `CODEX_PLUGIN_ROOT` | `['codex-rs/tui/src/bottom_pane/hooks_browser_view.rs']` |
| `CODEX_PRODUCT_SKU` | `['codex-rs/chatgpt/src/chatgpt_client.rs', 'codex-rs/core-plugins/src/manager.rs']` |
| `CODEX_PROVISIONING_HELPER` | `['.github/scripts/macos-signing/test_sign_macos_cli_package.py']` |
| `CODEX_PROXY_GIT_SSH_COMMAND` | `['codex-rs/network-proxy/src/proxy.rs']` |
| `CODEX_PROXY_GIT_SSH_COMMAND_MARKER` | `['codex-rs/core/src/tools/runtimes/mod.rs', 'codex-rs/network-proxy/src/lib.rs']` |
| `CODEX_PROXY_GIT_SSH_COMMAND_PREFIX` | `['codex-rs/network-proxy/src/proxy.rs']` |
| `CODEX_PROXY_GIT_SSH_COMMAND_SUFFIX` | `['codex-rs/network-proxy/src/proxy.rs']` |
| `CODEX_PRUNE_RELEASE` | `['scripts/install/install.sh']` |
| `CODEX_PTY_TEST_PID_FILE` | `['codex-rs/utils/pty/src/tests.rs']` |
| `CODEX_REFRESH_TOKEN_URL_OVERRIDE` | `['codex-rs/login/src/auth/manager.rs']` |
| `CODEX_REGISTERED_TEST` | `['codex-rs/windows-sandbox-rs/src/unified_exec/tests.rs']` |
| `CODEX_RELEASE` | `['codex-rs/app-server-daemon/src/update_loop.rs', 'scripts/install/install.ps1']` |
| `CODEX_REMOTE_AUTH_TOKEN` | `['codex-rs/cli/src/main.rs']` |
| `CODEX_REMOTE_EXEC_SERVER_LOCAL_PORT` | `['scripts/start-codex-exec.sh']` |
| `CODEX_REMOTE_EXEC_SERVER_START_TIMEOUT_SECONDS` | `['scripts/start-codex-exec.sh']` |
| `CODEX_REMOTE_TOKEN` | `['codex-rs/cli/src/main.rs']` |
| `CODEX_REPO_ROOT` | `['.github/scripts/macos-signing/sign_macos_cli_package.py', '.github/scripts/macos-signing/test_sign_macos_cli_package.py']` |
| `CODEX_REPO_ROOT_MARKER` | `['codex-rs/utils/cargo-bin/src/lib.rs']` |
| `CODEX_REVOKE_TOKEN_URL_OVERRIDE` | `['codex-rs/login/src/auth/manager.rs']` |
| `CODEX_RMCP_CLIENT_AUTH_STATUS_TEST_TOKEN` | `['codex-rs/rmcp-client/src/auth_status.rs']` |
| `CODEX_ROLLOUT_TRACE_ROOT` | `['codex-rs/rollout-trace/src/thread.rs']` |
| `CODEX_ROLLOUT_TRACE_ROOT_ENV` | `['codex-rs/rollout-trace/src/lib.rs', 'codex-rs/rollout-trace/src/thread.rs']` |
| `CODEX_RS_DIR` | `['scripts/debug-codex.sh']` |
| `CODEX_RS_ROOT` | `['scripts/codex_package/cargo.py']` |
| `CODEX_SANDBOX` | `['codex-rs/cli/src/doctor/network.rs', 'codex-rs/core/src/spawn.rs']` |
| `CODEX_SANDBOX_ENV_VAR` | `['codex-rs/cli/src/debug_sandbox.rs', 'codex-rs/core/src/sandboxing/mod.rs']` |
| `CODEX_SANDBOX_LAUNCH_` | `['codex-rs/windows-sandbox-rs/src/environment_transport.rs']` |
| `CODEX_SANDBOX_LAUNCH_BYTES` | `['codex-rs/windows-sandbox-rs/src/environment_transport.rs']` |
| `CODEX_SANDBOX_LAUNCH_COUNT` | `['codex-rs/windows-sandbox-rs/src/environment_transport.rs']` |
| `CODEX_SANDBOX_NETWORK_DISABLED` | `['codex-rs/core/src/exec.rs', 'codex-rs/core/src/spawn.rs']` |
| `CODEX_SANDBOX_NETWORK_DISABLED_ENV_VAR` | `['codex-rs/cli/src/debug_sandbox.rs', 'codex-rs/core/src/sandboxing/mod.rs']` |
| `CODEX_SDK_ROOT` | `['codex-cli/scripts/build_npm_package.py']` |
| `CODEX_SESSION_ID` | `['codex-rs/protocol/src/shell_environment.rs']` |
| `CODEX_SESSION_ID_ENV_VAR` | `['codex-rs/core/src/exec_env.rs', 'codex-rs/core/src/tools/runtimes/mod.rs']` |
| `CODEX_SKIP_BWRAP_BUILD` | `['codex-rs/bwrap/build.rs']` |
| `CODEX_SNAPSHOT_SOURCE` | `['codex-rs/exec-server/src/shell_snapshot.rs']` |
| `CODEX_SQLITE_HOME` | `['codex-rs/app-server-daemon/src/background_command.rs', 'codex-rs/config/src/config_toml.rs']` |
| `CODEX_STARTING_DIFF` | `['codex-rs/cloud-tasks-client/src/http.rs']` |
| `CODEX_STATUS_LINE_COLOR_TEST_CHILD` | `['codex-rs/tui/src/bottom_pane/status_line_style.rs']` |
| `CODEX_TEST_ALLOW_HTTP_REMOTE_PLUGIN_BUNDLE_DOWNLOADS` | `['codex-rs/core-plugins/src/remote_bundle.rs']` |
| `CODEX_TEST_ARCHIVE_PATH` | `['scripts/install/test_install_sh.py']` |
| `CODEX_TEST_CHECKSUM_PATH` | `['scripts/install/test_install_sh.py']` |
| `CODEX_TEST_ENVIRONMENT` | `['scripts/test-remote-env.sh']` |
| `CODEX_TEST_EXFAT_DIR` | `['codex-rs/exec-server/src/no_follow/mod.rs']` |
| `CODEX_TEST_INBOUND_CONNECT_ATTRIBUTION` | `['codex-rs/network-proxy/src/http_proxy.rs']` |
| `CODEX_TEST_LEGACY_ARCHIVE_PATH` | `['scripts/install/test_install_sh.py']` |
| `CODEX_TEST_LEGACY_PROCESS_ROLE` | `['codex-rs/windows-sandbox-rs/src/unified_exec/tests.rs']` |
| `CODEX_TEST_LINUX_SANDBOX_EXE` | `['codex-rs/app-server/src/bin/exec_server.rs']` |
| `CODEX_TEST_METADATA_FAILURE` | `['scripts/install/test_install_sh.py']` |
| `CODEX_TEST_METADATA_JSON` | `['scripts/install/test_install_sh.py']` |
| `CODEX_TEST_NON_UNICODE_BROKER_CONTEXT` | `['codex-rs/network-proxy/src/config.rs']` |
| `CODEX_TEST_OAUTH_PERMISSIVE_UMASK` | `['codex-rs/rmcp-client/src/oauth.rs']` |
| `CODEX_TEST_PARENT_PID` | `['scripts/install/test_install_sh.py']` |
| `CODEX_TEST_PARENT_START` | `['scripts/install/test_install_sh.py']` |
| `CODEX_TEST_RATE_LIMIT_RESET_REQUEST_TIMEOUT_MS` | `['codex-rs/app-server/src/request_processors/account_processor/rate_limit_resets.rs']` |
| `CODEX_TEST_RELATIVE_TMPDIR` | `['codex-rs/exec-server-protocol/src/protocol.rs']` |
| `CODEX_TEST_RELEASES_CHECKSUM_PATH` | `['scripts/install/test_install_sh.py']` |
| `CODEX_TEST_RELEASES_METADATA_JSON` | `['scripts/install/test_install_sh.py']` |
| `CODEX_TEST_RELEASES_MODE` | `['scripts/install/test_install_sh.py']` |
| `CODEX_TEST_REMOTE_ENV` | `['scripts/test-remote-env.sh']` |
| `CODEX_TEST_REMOTE_ENV_CONTAINER_NAME` | `['scripts/test-remote-env.sh']` |
| `CODEX_TEST_REMOTE_EXEC_SERVER_PID` | `['scripts/test-remote-env.sh']` |
| `CODEX_TEST_REMOTE_EXEC_SERVER_URL` | `['scripts/test-remote-env.sh']` |
| `CODEX_TEST_REQUEST_LOG` | `['scripts/install/test_install_sh.py']` |
| `CODEX_TEST_SETUP_LOG_RELEASE_CHILD` | `['codex-rs/windows-sandbox-rs/src/logging.rs']` |
| `CODEX_TEST_WINDOWS_HELPER_GRANTS_CHILD` | `['codex-rs/exec-server/src/fs_sandbox.rs']` |
| `CODEX_THREAD_ID` | `['codex-rs/app-server-test-client/scripts/live_elicitation_hold.sh', 'codex-rs/core/src/exec_env.rs']` |
| `CODEX_THREAD_ID_ENV_VAR` | `['codex-rs/core/src/exec_env.rs', 'codex-rs/core/src/tools/runtimes/mod.rs']` |
| `CODEX_TOOL_CALL_ATTRIBUTION_PROXY` | `['codex-rs/network-proxy/src/http_proxy.rs', 'codex-rs/network-proxy/src/upstream.rs']` |
| `CODEX_TOOL_CALL_ID` | `['codex-rs/exec-server/src/local_process.rs', 'codex-rs/protocol/src/shell_environment.rs']` |
| `CODEX_TOOL_CALL_ID_ENV_VAR` | `['codex-rs/core/src/exec_env.rs', 'codex-rs/core/src/shell_snapshot.rs']` |
| `CODEX_TUI_DISABLE_KEYBOARD_ENHANCEMENT` | `['codex-rs/tui/src/tui/keyboard_modes.rs']` |
| `CODEX_TUI_RECORD_SESSION` | `['codex-rs/tui/src/session_log.rs']` |
| `CODEX_TUI_ROUNDED` | `['codex-rs/cloud-tasks/src/ui.rs']` |
| `CODEX_TUI_SESSION_LOG_PATH` | `['codex-rs/tui/src/session_log.rs']` |
| `CODEX_UPDATE_FROM_RELEASE` | `['codex-rs/app-server-daemon/src/update_loop.rs', 'scripts/install/install.ps1']` |
| `CODEX_VERSION` | `['codex-rs/core/src/exec_env.rs']` |
| `CODEX_VERSION_ENV_VAR` | `['codex-rs/core/src/exec_env.rs', 'codex-rs/core/src/tools/runtimes/mod.rs']` |
| `CODEX_VERSION_KEY` | `['codex-rs/core/src/turn_metadata.rs']` |
| `CODEX_WEB` | `['codex-rs/tui/src/analytics/normalize.rs']` |
| `CODEX_WINDOWS_ALLOWED_MODULE` | `['codex-rs/windows-sandbox-rs/src/bin/managed_deny_probe/win.rs']` |
| `CODEX_WINDOWS_ALLOWED_TEXT` | `['codex-rs/windows-sandbox-rs/src/bin/managed_deny_probe/win.rs']` |
| `CODEX_WINDOWS_DENIED_MODULE` | `['codex-rs/windows-sandbox-rs/src/bin/managed_deny_probe/win.rs']` |
| `CODEX_WINDOWS_DENIED_TEXT` | `['codex-rs/windows-sandbox-rs/src/bin/managed_deny_probe/win.rs']` |
| `CODEX_WINDOWS_INSTALLER_URL` | `['codex-rs/cli/src/desktop_app/windows.rs']` |
| `CODEX_WINDOWS_MXC_ARG1` | `['codex-rs/arg0/src/lib.rs', 'codex-rs/mxc-sandbox/src/lib.rs']` |
| `CODEX_WINDOWS_REGISTERED_CORE` | `['codex-rs/sandboxing/src/manager.rs', 'codex-rs/windows-sandbox-rs/src/app_package.rs']` |
| `CODEX_WINDOWS_SANDBOX_ARG1` | `['codex-rs/arg0/src/lib.rs', 'codex-rs/windows-sandbox-rs/src/lib.rs']` |
| `CODEX_WINDOWS_SANDBOX_PACKAGE_FAMILY` | `['codex-rs/windows-sandbox-rs/src/service_identity.rs']` |
| `CODEX_WINDOWS_SANDBOX_PROXY_PORTS` | `['codex-rs/network-proxy/src/proxy.rs', 'codex-rs/windows-sandbox-rs/src/setup.rs']` |
| `CODEX_WORK_DESKTOP` | `['codex-rs/tui/src/analytics/normalize.rs']` |
| `CODEX_WORK_MOBILE` | `['codex-rs/tui/src/analytics/normalize.rs']` |
| `CODEX_WORK_WEB` | `['codex-rs/tui/src/analytics/normalize.rs']` |
| `OPENAI_ACTOR_AUTHORIZATION_HEADER` | `['codex-rs/model-provider-info/src/lib.rs']` |
| `OPENAI_ALLOWED_DOMAINS` | `['codex-cli/scripts/run_in_container.sh']` |
| `OPENAI_API_CURATED_MARKETPLACE_NAME` | `['codex-rs/core-plugins/src/discoverable.rs', 'codex-rs/core-plugins/src/lib.rs']` |
| `OPENAI_API_HOST` | `['codex-rs/network-proxy/src/credential_broker/providers/openai.rs']` |
| `OPENAI_API_KEY` | `['.github/scripts/issue_labeler.py', 'codex-cli/scripts/run_in_container.sh']` |
| `OPENAI_API_KEY_ENV_VAR` | `['codex-rs/cli/src/doctor.rs', 'codex-rs/login/src/auth/manager.rs']` |
| `OPENAI_API_KEY_ENV_VARS` | `['codex-rs/network-proxy/src/credential_broker/providers/openai.rs']` |
| `OPENAI_API_KEY_MIN_LEN` | `['codex-rs/network-proxy/src/credential_broker/providers/openai.rs']` |
| `OPENAI_API_KEY_PREFIXES` | `['codex-rs/network-proxy/src/credential_broker/providers/openai.rs']` |
| `OPENAI_API_KEY_STAGING` | `['scripts/mock_responses_websocket_server.py']` |
| `OPENAI_APPLE_TEAM_IDENTIFIER` | `['codex-rs/cli/src/desktop_app/mac.rs']` |
| `OPENAI_BASE_URL` | `['codex-rs/config/src/loader/tests.rs', 'codex-rs/network-proxy/src/credential_broker/providers/openai.rs']` |
| `OPENAI_BASE_URL_ENV_VAR` | `['codex-rs/network-proxy/src/credential_broker/providers/openai.rs']` |
| `OPENAI_BETA_HEADER` | `['codex-rs/cli/src/doctor.rs', 'codex-rs/core/src/client.rs']` |
| `OPENAI_BUNDLED_ALPHA_MARKETPLACE_NAME` | `['codex-rs/cli/src/plugin_cmd.rs', 'codex-rs/core-plugins/src/lib.rs']` |
| `OPENAI_BUNDLED_MARKETPLACE_NAME` | `['codex-rs/app-server/src/request_processors/plugins/search.rs', 'codex-rs/cli/src/plugin_cmd.rs']` |
| `OPENAI_CLUSTER` | `['codex-rs/exec-server/src/trace_context.rs']` |
| `OPENAI_CURATED_LOADING_DESCRIPTION` | `['codex-rs/tui/src/chatwidget/plugin_catalog.rs']` |
| `OPENAI_CURATED_MARKETPLACE_NAME` | `['codex-rs/app-server/src/request_processors/plugins.rs', 'codex-rs/core-plugins/src/discoverable.rs']` |
| `OPENAI_CURATED_REMOTE_COLLECTION_KEY` | `['codex-rs/core-plugins/src/remote.rs']` |
| `OPENAI_CURATED_TAB_ID` | `['codex-rs/tui/src/chatwidget/plugin_catalog.rs']` |
| `OPENAI_DEVELOPER_DOCS_MCP_CODEX_URL` | `['codex-rs/codex-mcp/src/openai_docs_source_attribution.rs']` |
| `OPENAI_DEVELOPER_DOCS_MCP_URL` | `['codex-rs/codex-mcp/src/openai_docs_source_attribution.rs']` |
| `OPENAI_ELICITATION_EXTENSION_ID` | `['codex-rs/app-server/src/request_processors/initialize_processor.rs', 'codex-rs/codex-mcp/src/client_capabilities.rs']` |
| `OPENAI_ELICITATION_METHOD` | `['codex-rs/rmcp-client/src/elicitation_client_service.rs']` |
| `OPENAI_FEDERATION_RULE_ID` | `['codex-rs/protocol/src/shell_environment.rs']` |
| `OPENAI_FEDERATION_RULE_ID_ENV_VAR` | `['codex-rs/exec-server/src/client/route_aware_http_client.rs', 'codex-rs/login/src/auth/workload_identity.rs']` |
| `OPENAI_FILE_BLOB_UPLOAD_TIMEOUT` | `['codex-rs/codex-api/src/files.rs']` |
| `OPENAI_FILE_FINALIZE_RETRY_DELAY` | `['codex-rs/codex-api/src/files.rs']` |
| `OPENAI_FILE_FINALIZE_TIMEOUT` | `['codex-rs/codex-api/src/files.rs']` |
| `OPENAI_FILE_REQUEST_TIMEOUT` | `['codex-rs/codex-api/src/files.rs']` |
| `OPENAI_FILE_UPLOAD_LIMIT_BYTES` | `['codex-rs/codex-api/src/files.rs', 'codex-rs/codex-api/src/lib.rs']` |
| `OPENAI_FILE_URI_PREFIX` | `['codex-rs/codex-api/src/files.rs']` |
| `OPENAI_FILE_USE_CASE` | `['codex-rs/codex-api/src/files.rs']` |
| `OPENAI_FORM_EXTENSION_ID` | `['codex-rs/codex-mcp/src/client_capabilities.rs', 'codex-rs/codex-mcp/src/rmcp_client.rs']` |
| `OPENAI_FORM_METHOD` | `['codex-rs/rmcp-client/src/elicitation_client_service.rs']` |
| `OPENAI_IDENTITY_TOKEN_FILE` | `['codex-rs/login/src/auth/workload_identity.rs', 'codex-rs/protocol/src/shell_environment.rs']` |
| `OPENAI_IDENTITY_TOKEN_FILE_ENV_VAR` | `['codex-rs/exec-server/src/client/route_aware_http_client.rs', 'codex-rs/login/src/auth/workload_identity.rs']` |
| `OPENAI_IDENTITY_TOKEN_SOURCE` | `['codex-rs/login/src/auth/workload_identity.rs', 'codex-rs/protocol/src/shell_environment.rs']` |
| `OPENAI_IDENTITY_TOKEN_SOURCE_ENV_VAR` | `['codex-rs/login/src/auth/workload_identity.rs', 'codex-rs/protocol/src/shell_environment.rs']` |
| `OPENAI_KEY_REGEX` | `['codex-rs/secrets/src/sanitizer.rs']` |
| `OPENAI_MODEL_HEADER` | `['codex-rs/codex-api/src/endpoint/responses_websocket.rs', 'codex-rs/codex-api/src/sse/responses.rs']` |
| `OPENAI_ORGANIZATION` | `['codex-rs/model-provider-info/src/lib.rs']` |
| `OPENAI_ORGANIZATION_HEADER` | `['codex-rs/analytics/src/client.rs', 'codex-rs/backend-client/src/client/turn_usage.rs']` |
| `OPENAI_PLUGINS_GIT_URL` | `['codex-rs/core-plugins/src/manager.rs', 'codex-rs/core-plugins/src/marketplace_policy.rs']` |
| `OPENAI_PLUGINS_OWNER` | `['codex-rs/core-plugins/src/startup_sync.rs']` |
| `OPENAI_PLUGINS_REPO` | `['codex-rs/core-plugins/src/startup_sync.rs']` |
| `OPENAI_PRIMARY_RUNTIME_MARKETPLACE_NAME` | `['codex-rs/cli/src/plugin_cmd.rs', 'codex-rs/core-plugins/src/lib.rs']` |
| `OPENAI_PROJECT` | `['codex-rs/model-provider-info/src/lib.rs']` |
| `OPENAI_PROJECT_HEADER` | `['codex-rs/analytics/src/client.rs', 'codex-rs/backend-client/src/client/turn_usage.rs']` |
| `OPENAI_PROVIDER_ID` | `['codex-rs/app-server/src/config_manager.rs', 'codex-rs/app-server/src/config_manager_service_model_providers.rs']` |
| `OPENAI_PROVIDER_NAME` | `['codex-rs/app-server/src/config_manager_service_model_providers.rs', 'codex-rs/core/src/client.rs']` |
| `OPENAI_REALTIME_API_BASE_URL` | `['codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs']` |
| `OPENAI_RESPONSES_URL` | `['codex-rs/responses-api-proxy/src/auth.rs', 'codex-rs/responses-api-proxy/src/lib.rs']` |
| `OPENAI_SPIFFE_AUDIENCE` | `['codex-rs/protocol/src/shell_environment.rs']` |
| `OPENAI_SPIFFE_AUDIENCE_ENV_VAR` | `['codex-rs/login/src/auth/workload_identity.rs', 'codex-rs/protocol/src/shell_environment.rs']` |
| `OPENAI_SPIFFE_ID` | `['codex-rs/protocol/src/shell_environment.rs']` |
| `OPENAI_SPIFFE_ID_ENV_VAR` | `['codex-rs/login/src/auth/workload_identity.rs', 'codex-rs/protocol/src/shell_environment.rs']` |
| `OPENAI_STANDARD_FORM_INPUT_EXTENSION_ID` | `['codex-rs/codex-mcp/src/client_capabilities.rs', 'codex-rs/core/src/session/mod.rs']` |
| `OPENAI_TOKEN_URL` | `['codex-rs/responses-api-proxy/src/auth.rs']` |
| `OPENAI_WORKLOAD_IDENTITY_CONTEXT` | `['codex-rs/protocol/src/shell_environment.rs']` |
| `OPENAI_WORKLOAD_IDENTITY_CONTEXT_ENV_VAR` | `['codex-rs/exec-server/src/client/route_aware_http_client.rs', 'codex-rs/login/src/auth/workload_identity.rs']` |

## 3. Chaves Equivalentes no `nycode` (`settings-nycode.ts` e variáveis `NYCODE_*`)

- **Configurações tipadas do harness** (`packages/coding-agent/src/core/settings-nycode.ts:11-33`): `permissions.engine`, `compaction.maxContextTokens`, `harness.effortSandwich.{enabled,turns}`, `harness.headless.{lean,trim,tools,floor}`, `harness.prefixCache1h`, `harness.autoResume`, `harness.completionGate`, `subagent.respawn`, `tools.bash.backgroundOnTimeout`, `todo.{staleReminder,sync}`, `plan.{gate,readOnlyTools}`, `bash.mainGuard.{enabled,timeoutSec,capSec}`, `footer.stats`, `editorMode`, `notify.{sound,desktop}`, `terminal.*`, `mcp.configPath`.
- **Variáveis documentadas e flags CLI** (`packages/coding-agent/docs/environment-variables.md`, `packages/coding-agent/src/cli/args.ts:308-358`): `NYCODE_COMPACT_AT`, `NYCODE_HEADLESS_{LEAN,TRIM,TOOLS,FLOOR}`, `NYCODE_EFFORT_SANDWICH{,_TURNS}`, `NYCODE_PREFIX_CACHE_1H`, `NYCODE_BYPASS_{PERMISSIONS,ELIGIBLE,OPTIN}`, `NYCODE_PERMISSION_MODE`, `NYCODE_SUBAGENT{,_DEPTH,_MAX_DEPTH,_NESTED_CONCURRENCY,_SEND,_RESPAWN}`, `NYCODE_COMPLETION_GATE`, `NYCODE_PLAN_{GATE,READONLY}`, `NYCODE_MCP_TOOL_SEARCH`, `NYCODE_CODEMODE_MAX_WORKERS`, `NYCODE_OFFLINE`, `NYCODE_TELEMETRY`, `NYCODE_TIMING`.

## 4. Métodos JSON-RPC do App-Server (`common.rs`, total = 281)

```text
# JSON-RPC methods from codex-rs/app-server-protocol/src/protocol/common.rs (optional: Codex RPC methods, not repo skills)
account/bedrock/checkGovCloudRequirements
account/bedrock/discover
account/bedrock/setup
account/chatgptAuthTokens/refresh
account/gatewayOAuth/cancel
account/gatewayOAuth/changed
account/gatewayOAuth/login
account/gatewayOAuth/read
account/gcp/setup
account/login/cancel
account/login/completed
account/login/start
account/logout
account/rateLimitResetCredit/consume
account/rateLimits/read
account/rateLimits/updated
account/read
account/securitySetup/read
account/sendAddCreditsNudgeEmail
account/updated
account/usage/read
account/workspaceMessages/read
accountSession/list
accountSession/switch
app/installed
app/list
app/list/updated
app/read
attestation/generate
autoApprovalReview/strictReviewRequired
collaborationMode/list
command/exec
command/exec/outputDelta
command/exec/resize
command/exec/terminate
command/exec/write
config/batchWrite
config/mcpServer/reload
config/read
config/value/write
configRequirements/read
environment/add
environment/info
environment/status
experimentalFeature/enablement/set
experimentalFeature/list
externalAgentConfig/detect
externalAgentConfig/import
externalAgentConfig/import/completed
externalAgentConfig/import/progress
externalAgentConfig/import/readHistories
externalAgentConfig/import/recordHistory
feedback/save
feedback/upload
fs/changed
fs/copy
fs/createDirectory
fs/getMetadata
fs/readDirectory
fs/readFile
fs/remove
fs/unwatch
fs/watch
fs/writeFile
fuzzyFileSearch/sessionCompleted
fuzzyFileSearch/sessionStart
fuzzyFileSearch/sessionStop
fuzzyFileSearch/sessionUpdate
fuzzyFileSearch/sessionUpdated
hook/completed
hook/started
hooks/list
item/agentMessage/delta
item/autoApprovalReview/completed
item/autoApprovalReview/started
item/commandExecution/outputDelta
item/commandExecution/requestApproval
item/commandExecution/terminalInteraction
item/completed
item/fileChange/outputDelta
item/fileChange/patchUpdated
item/fileChange/requestApproval
item/mcpToolCall/progress
item/permissions/requestApproval
item/plan/delta
item/reasoning/summaryPartAdded
item/reasoning/summaryTextDelta
item/reasoning/textDelta
item/started
item/tool/call
item/tool/requestUserInput
marketplace/add
marketplace/remove
marketplace/upgrade
mcpServer/elicitation/request
mcpServer/event/stream/notification
mcpServer/event/stream/start
mcpServer/event/stream/stop
mcpServer/oauth/login
mcpServer/oauthLogin/completed
mcpServer/resource/read
mcpServer/startupStatus/updated
mcpServer/tool/call
mcpServerStatus/list
memory/reset
memory/status
mock/experimentalMethod
model/list
model/rerouted
model/safetyBuffering/updated
model/verification
modelProvider/authRecoveryCompleted
modelProvider/authRecoveryStarted
modelProvider/capabilities/read
modelProvider/config/write
modelProvider/default/set
modelProvider/list
permissionProfile/list
plugin/install
plugin/installed
plugin/list
plugin/read
plugin/reconcile
plugin/search
plugin/share/checkout
plugin/share/delete
plugin/share/list
plugin/share/save
plugin/share/updateTargets
plugin/skill/read
plugin/uninstall
process/exited
process/kill
process/outputDelta
process/resizePty
process/spawn
process/writeStdin
project/changed
project/create
project/delete
project/import
project/list
project/move
project/read
project/update
rawResponse/completed
rawResponseItem/completed
remoteControl/client/list
remoteControl/client/revoke
remoteControl/disable
remoteControl/enable
remoteControl/pairing/start
remoteControl/pairing/status
remoteControl/status/changed
remoteControl/status/read
review/start
rollout/compress
server/diagnostics
serverRequest/resolved
skills/changed
skills/config/write
skills/extraRoots/set
skills/list
thread/approveGuardianDeniedAction
thread/archive
thread/archived
thread/attachment/add
thread/attachment/list
thread/attachment/remove
thread/attachment/updated
thread/attachmentOwner/list
thread/backgroundTerminals/clean
thread/backgroundTerminals/list
thread/backgroundTerminals/terminate
thread/closed
thread/compact/start
thread/compacted
thread/decrement_elicitation
thread/delete
thread/deleted
thread/environment/connected
thread/environment/disconnected
thread/fork
thread/goal/clear
thread/goal/cleared
thread/goal/get
thread/goal/set
thread/goal/updated
thread/guardianReview
thread/increment_elicitation
thread/inject_items
thread/items/list
thread/items/read
thread/list
thread/loaded/list
thread/memory/read
thread/memoryMode/set
thread/metadata/update
thread/name/set
thread/name/updated
thread/prediction/request
thread/prediction/updated
thread/prepareApprovedPlan
thread/project/updated
thread/queue/add
thread/queue/changed
thread/queue/delete
thread/queue/list
thread/queue/reorder
thread/queue/start
thread/queue/update
thread/read
thread/readState/changed
thread/readState/update
thread/realtime/appendAudio
thread/realtime/appendSpeech
thread/realtime/appendText
thread/realtime/closed
thread/realtime/error
thread/realtime/item/completed
thread/realtime/item/started
thread/realtime/item/transcript/delta
thread/realtime/itemAdded
thread/realtime/list
thread/realtime/listVoices
thread/realtime/outputAudio/delta
thread/realtime/sdp
thread/realtime/start
thread/realtime/started
thread/realtime/stop
thread/realtime/transcript/delta
thread/realtime/transcript/done
thread/resume
thread/revert
thread/reverted
thread/sample
thread/sample/cancel
thread/search
thread/search/cancel
thread/search/partial
thread/search/stream
thread/search/stream/cancel
thread/searchOccurrences
thread/section/changed
thread/section/move
thread/settings/update
thread/settings/updated
thread/shellCommand
thread/start
thread/started
thread/status/changed
thread/timeline/list
thread/tokenUsage/updated
thread/turns/list
thread/unarchive
thread/unarchived
thread/unsubscribe
threadSection/create
threadSection/delete
threadSection/list
threadSection/update
tmp/example
turn/completed
turn/diff/updated
turn/interrupt
turn/moderationMetadata
turn/plan/updated
turn/settings/update
turn/start
turn/started
turn/steer
unknown/method
userVerification/cancel
userVerification/delete
userVerification/enroll
userVerification/status
userVerification/verify
windows/worldWritableWarning
windowsSandbox/readiness
windowsSandbox/setupCompleted
windowsSandbox/setupStart
```
