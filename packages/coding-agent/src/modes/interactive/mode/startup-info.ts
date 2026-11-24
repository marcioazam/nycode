/**
 * InteractiveMode methods, applied to InteractiveMode.prototype in interactive-mode.ts; `this` is the mode.
 */

/**
 * Interactive mode for the coding agent.
 * Handles TUI rendering and user interaction, delegating business logic to AgentSession.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { MarkdownTheme } from "@nycode/tui";
import { Spacer } from "@nycode/tui";
import { spawn } from "child_process";
import { getAgentDir, VERSION } from "../../../config.ts";
import { DefaultPackageManager } from "../../../core/package-manager.ts";
import type { ResourceDiagnostic } from "../../../core/resource-loader.ts";
import { getSourcePackageKey, type SourceInfo } from "../../../core/source-info.ts";
import { getChangelogPath, getNewEntries, normalizeChangelogLinks, parseChangelog } from "../../../utils/changelog.ts";
import { parseGitUrl } from "../../../utils/git.ts";
import { getCwdRelativePath, shortenHomePath } from "../../../utils/paths.ts";
import { stripBom } from "../../../utils/text.ts";
import { formatKeyText } from "../components/keybinding-hints.ts";
import { ThemedText } from "../components/themed-text.ts";
import type { InteractiveMode } from "../interactive-mode.ts";
import { getMarkdownTheme, theme } from "../theme/theme.ts";
import type { ExtensionChangelogUpdate } from "./helpers.ts";

/** Startup information: package updates, tmux keys, changelogs, display paths and resource diagnostics. */
export const startupInfoMethods = {
	async checkForPackageUpdates(this: InteractiveMode): Promise<string[]> {
		if (process.env.NYCODE_OFFLINE) {
			return [];
		}

		try {
			const packageManager = new DefaultPackageManager({
				cwd: this.sessionManager.getCwd(),
				agentDir: getAgentDir(),
				settingsManager: this.settingsManager,
			});
			const updates = await packageManager.checkForAvailableUpdates();
			return updates.map((update) => update.displayName);
		} catch {
			return [];
		}
	},

	async checkTmuxKeyboardSetup(this: InteractiveMode): Promise<string | undefined> {
		if (!process.env.TMUX) return undefined;

		const runTmuxShow = (option: string): Promise<string | undefined> => {
			return new Promise((resolve) => {
				const proc = spawn("tmux", ["show", "-gv", option], {
					stdio: ["ignore", "pipe", "ignore"],
				});
				let stdout = "";
				const timer = setTimeout(() => {
					proc.kill();
					resolve(undefined);
				}, 2000);

				proc.stdout?.on("data", (data) => {
					stdout += data.toString();
				});
				proc.on("error", () => {
					clearTimeout(timer);
					resolve(undefined);
				});
				proc.on("close", (code) => {
					clearTimeout(timer);
					resolve(code === 0 ? stdout.trim() : undefined);
				});
			});
		};

		const [extendedKeys, extendedKeysFormat] = await Promise.all([
			runTmuxShow("extended-keys"),
			runTmuxShow("extended-keys-format"),
		]);

		// If we couldn't query tmux (timeout, sandbox, etc.), don't warn
		if (extendedKeys === undefined) return undefined;

		if (extendedKeys !== "on" && extendedKeys !== "always") {
			return "tmux extended-keys is off. Modified Enter keys may not work. Add `set -g extended-keys on` to ~/.tmux.conf and restart tmux.";
		}

		if (extendedKeysFormat === "xterm") {
			return "tmux extended-keys-format is xterm. Nycode works best with csi-u. Add `set -g extended-keys-format csi-u` to ~/.tmux.conf and restart tmux.";
		}

		return undefined;
	},

	/**
	 * Get changelog entries to display on startup.
	 * Only shows new entries since last seen version, skips for resumed sessions.
	 */
	getChangelogForDisplay(this: InteractiveMode): string | undefined {
		// Skip changelog for resumed/continued sessions (already have messages)
		if (this.session.state.messages.length > 0) {
			return undefined;
		}

		const lastVersion = this.settingsManager.getLastChangelogVersion();
		const changelogPath = getChangelogPath();
		const entries = parseChangelog(changelogPath);

		if (!lastVersion) {
			// Fresh install - record the version, don't show changelog
			this.settingsManager.setLastChangelogVersion(VERSION);
			return undefined;
		}

		const newEntries = getNewEntries(entries, lastVersion);
		if (!newEntries) {
			// Unreadable saved version: show nothing and record the current one so later updates compare again
			this.settingsManager.setLastChangelogVersion(VERSION);
			return undefined;
		}
		if (newEntries.length > 0) {
			this.settingsManager.setLastChangelogVersion(VERSION);
			return newEntries.map((e) => normalizeChangelogLinks(e.content, e)).join("\n\n");
		}

		return undefined;
	},

	getExtensionChangelogUpdates(this: InteractiveMode): ExtensionChangelogUpdate[] {
		// Skip changelog for resumed/continued sessions (already have messages)
		if (this.session.state.messages.length > 0) {
			return [];
		}

		const seenKeys = new Set<string>();
		const updates: ExtensionChangelogUpdate[] = [];
		for (const { sourceInfo } of this.session.resourceLoader.getExtensions().extensions) {
			if (sourceInfo.origin !== "package" || !sourceInfo.baseDir || !sourceInfo.changelogPath) {
				continue;
			}

			const key = getSourcePackageKey(sourceInfo);
			if (seenKeys.has(key)) {
				continue;
			}
			seenKeys.add(key);

			const pkg = this.readPackageJson(sourceInfo.baseDir);
			if (!pkg?.version) {
				continue;
			}

			const lastVersion = this.settingsManager.getExtensionChangelogVersion(key);
			if (!lastVersion) {
				// Fresh install - record the version, don't show changelog
				this.settingsManager.setExtensionChangelogVersion(key, pkg.version);
				continue;
			}

			const newEntries = getNewEntries(parseChangelog(sourceInfo.changelogPath), lastVersion);
			if (!newEntries) {
				// Unreadable saved version: show nothing and record the current one so later updates compare again
				this.settingsManager.setExtensionChangelogVersion(key, pkg.version);
				continue;
			}
			if (newEntries.length > 0) {
				this.settingsManager.setExtensionChangelogVersion(key, pkg.version);
				const name = pkg.name || sourceInfo.source;
				// Prefix each "## [x.y.z]" heading with the package name so entries render like Nycode's own.
				const markdown = newEntries
					.map((entry) => entry.content.replace(/^##\s+/, `## ${name} `))
					.join("\n\n")
					.trim();
				updates.push({ name, version: pkg.version, markdown });
			}
		}

		return updates;
	},

	readPackageJson(this: InteractiveMode, packageRoot: string): { name?: string; version?: string } | undefined {
		try {
			const pkg = JSON.parse(stripBom(fs.readFileSync(path.join(packageRoot, "package.json"), "utf-8"))) as {
				name?: unknown;
				version?: unknown;
			};
			return {
				name: typeof pkg.name === "string" ? pkg.name : undefined,
				version: typeof pkg.version === "string" ? pkg.version : undefined,
			};
		} catch {
			return undefined;
		}
	},

	getMarkdownThemeWithSettings(this: InteractiveMode): MarkdownTheme {
		return {
			...getMarkdownTheme(),
			codeBlockIndent: this.settingsManager.getCodeBlockIndent(),
		};
	},

	// =========================================================================
	// Extension System
	// =========================================================================

	formatDisplayPath(this: InteractiveMode, p: string): string {
		return shortenHomePath(p);
	},

	formatExtensionDisplayPath(this: InteractiveMode, path: string): string {
		let result = this.formatDisplayPath(path);
		result = result.replace(/\/index\.ts$/, "").replace(/\/index\.js$/, "");
		return result;
	},

	formatContextPath(this: InteractiveMode, p: string): string {
		const cwd = path.resolve(this.sessionManager.getCwd());
		const absolutePath = path.isAbsolute(p) ? path.resolve(p) : path.resolve(cwd, p);
		const relativePath = getCwdRelativePath(absolutePath, cwd);
		if (relativePath !== undefined) {
			return relativePath;
		}

		return this.formatDisplayPath(absolutePath);
	},

	getStartupExpansionState(this: InteractiveMode): boolean {
		return this.options.verbose || this.toolOutputExpanded;
	},

	/** Startup header (logo, version, key hints). Hidden only by quietStartup: true. */
	shouldShowStartupHeader(this: InteractiveMode): boolean {
		return this.options.verbose === true || this.settingsManager.getQuietStartup() !== true;
	},

	/** Startup details (model scope, loaded resources). Hidden by quietStartup: true or "header". */
	getModelScopeNotice(this: InteractiveMode): string | undefined {
		if (this.session.scopedModels.length === 0 || !this.shouldShowStartupDetails()) return undefined;
		const modelList = this.session.scopedModels
			.map((sm) => {
				const thinkingStr = sm.thinkingLevel ? `:${sm.thinkingLevel}` : "";
				return `${sm.model.id}${thinkingStr}`;
			})
			.join(", ");
		const cycleKeys = this.keybindings.getKeys("app.model.cycleForward");
		const cycleHint =
			cycleKeys.length > 0
				? theme.fg("muted", ` (${formatKeyText(cycleKeys.join("/"), { capitalize: true })} to cycle)`)
				: "";
		return theme.fg("dim", `Model scope: ${modelList}${cycleHint}`);
	},

	showFullscreenModelScopeNotice(this: InteractiveMode): void {
		if (!this.getModelScopeNotice()) return;
		this.headerContainer.addChild(new ThemedText(() => this.getModelScopeNotice() ?? "", 1, 0));
		this.headerContainer.addChild(new Spacer(1));
	},

	shouldShowStartupDetails(this: InteractiveMode): boolean {
		return this.options.verbose === true || this.settingsManager.getQuietStartup() === false;
	},

	/**
	 * Get a short path relative to the package root for display.
	 */
	getShortPath(this: InteractiveMode, fullPath: string, sourceInfo?: SourceInfo): string {
		const normalizedFullPath = fullPath.replace(/\\/g, "/");
		const baseDir = sourceInfo?.baseDir;
		if (baseDir && this.isPackageSource(sourceInfo)) {
			const normalizedBaseDir = baseDir.replace(/\\/g, "/");
			const npmRootMatch = normalizedBaseDir.match(/^(.*\/node_modules)\/(@?[^/]+(?:\/[^/]+)?)$/);
			// If fullPath is under the same node_modules root as baseDir, preserve that relative topology.
			if (npmRootMatch?.[1] && normalizedFullPath.startsWith(`${npmRootMatch[1]}/`)) {
				return path.posix.relative(normalizedBaseDir, normalizedFullPath);
			}

			const relativePath = path.relative(path.resolve(baseDir), path.resolve(fullPath));
			if (
				relativePath &&
				relativePath !== "." &&
				!relativePath.startsWith("..") &&
				!relativePath.startsWith(`..${path.sep}`) &&
				!path.isAbsolute(relativePath)
			) {
				return relativePath.replace(/\\/g, "/");
			}
		}

		const source = sourceInfo?.source ?? "";
		const npmMatch = normalizedFullPath.match(/node_modules\/(@?[^/]+(?:\/[^/]+)?)\/(.*)/);
		if (npmMatch && source.startsWith("npm:")) {
			return npmMatch[2];
		}

		const gitMatch = normalizedFullPath.match(/git\/[^/]+\/[^/]+\/(.*)/);
		if (gitMatch && source.startsWith("git:")) {
			return gitMatch[1];
		}

		return this.formatDisplayPath(fullPath);
	},

	getCompactPathLabel(this: InteractiveMode, resourcePath: string, sourceInfo?: SourceInfo): string {
		const shortPath = this.getShortPath(resourcePath, sourceInfo);
		const normalizedPath = shortPath.replace(/\\/g, "/");
		const segments = normalizedPath.split("/").filter((segment) => segment.length > 0 && segment !== "~");
		if (segments.length > 0) {
			return segments[segments.length - 1]!;
		}
		return shortPath;
	},

	getCompactPackageSourceLabel(this: InteractiveMode, sourceInfo?: SourceInfo): string {
		const source = sourceInfo?.source ?? "";
		if (source.startsWith("npm:")) {
			return source.slice("npm:".length) || source;
		}

		const gitSource = parseGitUrl(source);
		if (gitSource) {
			return gitSource.path || source;
		}

		return source;
	},

	getCompactExtensionLabel(this: InteractiveMode, resourcePath: string, sourceInfo?: SourceInfo): string {
		if (!this.isPackageSource(sourceInfo)) {
			return this.getCompactPathLabel(resourcePath, sourceInfo);
		}

		const sourceLabel = this.getCompactPackageSourceLabel(sourceInfo);
		if (!sourceLabel) {
			return this.getCompactPathLabel(resourcePath, sourceInfo);
		}

		const shortPath = this.getShortPath(resourcePath, sourceInfo).replace(/\\/g, "/");
		const packagePath = shortPath.startsWith("extensions/") ? shortPath.slice("extensions/".length) : shortPath;
		const parsedPath = path.posix.parse(packagePath);

		if (parsedPath.name === "index") {
			return !parsedPath.dir || parsedPath.dir === "." ? sourceLabel : `${sourceLabel}:${parsedPath.dir}`;
		}

		return `${sourceLabel}:${packagePath}`;
	},

	getCompactDisplayPathSegments(this: InteractiveMode, resourcePath: string): string[] {
		return this.formatDisplayPath(resourcePath)
			.replace(/\\/g, "/")
			.split("/")
			.filter((segment) => segment.length > 0 && segment !== "~");
	},

	getCompactNonPackageExtensionLabel(
		this: InteractiveMode,
		resourcePath: string,
		index: number,
		allPaths: Array<{ path: string; segments: string[] }>,
	): string {
		const segments = allPaths[index]?.segments;
		if (!segments || segments.length === 0) {
			return this.getCompactPathLabel(resourcePath);
		}

		for (let segmentCount = 1; segmentCount <= segments.length; segmentCount += 1) {
			const candidate = segments.slice(-segmentCount).join("/");
			const isUnique = allPaths.every((item, itemIndex) => {
				if (itemIndex === index) {
					return true;
				}
				return item.segments.slice(-segmentCount).join("/") !== candidate;
			});

			if (isUnique) {
				return candidate;
			}
		}

		return segments.join("/");
	},

	getCompactExtensionLabels(
		this: InteractiveMode,
		extensions: Array<{ path: string; sourceInfo?: SourceInfo }>,
	): string[] {
		const nonPackageExtensions = extensions
			.map((extension) => {
				const segments = this.getCompactDisplayPathSegments(extension.path);
				const lastSegment = segments[segments.length - 1];
				if (segments.length > 1 && (lastSegment === "index.ts" || lastSegment === "index.js")) {
					segments.pop();
				}
				return {
					path: extension.path,
					sourceInfo: extension.sourceInfo,
					segments,
				};
			})
			.filter((extension) => !this.isPackageSource(extension.sourceInfo));

		return extensions.map((extension) => {
			if (this.isPackageSource(extension.sourceInfo)) {
				return this.getCompactExtensionLabel(extension.path, extension.sourceInfo);
			}

			const nonPackageIndex = nonPackageExtensions.findIndex((item) => item.path === extension.path);
			if (nonPackageIndex === -1) {
				return this.getCompactPathLabel(extension.path, extension.sourceInfo);
			}

			return this.getCompactNonPackageExtensionLabel(extension.path, nonPackageIndex, nonPackageExtensions);
		});
	},

	getDisplaySourceInfo(
		this: InteractiveMode,
		sourceInfo?: SourceInfo,
	): {
		label: string;
		scopeLabel?: string;
		color: "accent" | "muted";
	} {
		const source = sourceInfo?.source ?? "local";
		const scope = sourceInfo?.scope ?? "project";
		if (source === "local") {
			if (scope === "user") {
				return { label: "user", color: "muted" };
			}
			if (scope === "project") {
				return { label: "project", color: "muted" };
			}
			if (scope === "temporary") {
				return { label: "path", scopeLabel: "temp", color: "muted" };
			}
			return { label: "path", color: "muted" };
		}

		if (source === "cli") {
			return { label: "path", scopeLabel: scope === "temporary" ? "temp" : undefined, color: "muted" };
		}

		const scopeLabel =
			scope === "user" ? "user" : scope === "project" ? "project" : scope === "temporary" ? "temp" : undefined;
		return { label: source, scopeLabel, color: "accent" };
	},

	getScopeGroup(this: InteractiveMode, sourceInfo?: SourceInfo): "user" | "project" | "path" {
		const source = sourceInfo?.source ?? "local";
		const scope = sourceInfo?.scope ?? "project";
		if (source === "cli" || scope === "temporary") return "path";
		if (scope === "user") return "user";
		if (scope === "project") return "project";
		return "path";
	},

	isPackageSource(this: InteractiveMode, sourceInfo?: SourceInfo): boolean {
		const source = sourceInfo?.source ?? "";
		return source.startsWith("npm:") || source.startsWith("git:");
	},

	buildScopeGroups(
		this: InteractiveMode,
		items: Array<{ path: string; sourceInfo?: SourceInfo }>,
	): Array<{
		scope: "user" | "project" | "path";
		paths: Array<{ path: string; sourceInfo?: SourceInfo }>;
		packages: Map<string, Array<{ path: string; sourceInfo?: SourceInfo }>>;
	}> {
		const groups: Record<
			"user" | "project" | "path",
			{
				scope: "user" | "project" | "path";
				paths: Array<{ path: string; sourceInfo?: SourceInfo }>;
				packages: Map<string, Array<{ path: string; sourceInfo?: SourceInfo }>>;
			}
		> = {
			user: { scope: "user", paths: [], packages: new Map() },
			project: { scope: "project", paths: [], packages: new Map() },
			path: { scope: "path", paths: [], packages: new Map() },
		};

		for (const item of items) {
			const groupKey = this.getScopeGroup(item.sourceInfo);
			const group = groups[groupKey];
			const source = item.sourceInfo?.source ?? "local";

			if (this.isPackageSource(item.sourceInfo)) {
				const list = group.packages.get(source) ?? [];
				list.push(item);
				group.packages.set(source, list);
			} else {
				group.paths.push(item);
			}
		}

		return [groups.project, groups.user, groups.path].filter(
			(group) => group.paths.length > 0 || group.packages.size > 0,
		);
	},

	formatScopeGroups(
		this: InteractiveMode,
		groups: Array<{
			scope: "user" | "project" | "path";
			paths: Array<{ path: string; sourceInfo?: SourceInfo }>;
			packages: Map<string, Array<{ path: string; sourceInfo?: SourceInfo }>>;
		}>,
		options: {
			formatPath: (item: { path: string; sourceInfo?: SourceInfo }) => string;
			formatPackagePath: (item: { path: string; sourceInfo?: SourceInfo }, source: string) => string;
		},
	): string {
		const lines: string[] = [];

		for (const group of groups) {
			lines.push(`  ${theme.fg("accent", group.scope)}`);

			const sortedPaths = [...group.paths].sort((a, b) => a.path.localeCompare(b.path));
			for (const item of sortedPaths) {
				lines.push(theme.fg("dim", `    ${options.formatPath(item)}`));
			}

			const sortedPackages = Array.from(group.packages.entries()).sort(([a], [b]) => a.localeCompare(b));
			for (const [source, items] of sortedPackages) {
				lines.push(`    ${theme.fg("mdLink", source)}`);
				const sortedPackagePaths = [...items].sort((a, b) => a.path.localeCompare(b.path));
				for (const item of sortedPackagePaths) {
					lines.push(theme.fg("dim", `      ${options.formatPackagePath(item, source)}`));
				}
			}
		}

		return lines.join("\n");
	},

	findSourceInfoForPath(
		this: InteractiveMode,
		p: string,
		sourceInfos: Map<string, SourceInfo>,
	): SourceInfo | undefined {
		const exact = sourceInfos.get(p);
		if (exact) return exact;

		let current = p;
		while (current.includes("/")) {
			current = current.substring(0, current.lastIndexOf("/"));
			const parent = sourceInfos.get(current);
			if (parent) return parent;
		}

		return undefined;
	},

	formatPathWithSource(this: InteractiveMode, p: string, sourceInfo?: SourceInfo): string {
		if (sourceInfo) {
			const shortPath = this.getShortPath(p, sourceInfo);
			const { label, scopeLabel } = this.getDisplaySourceInfo(sourceInfo);
			const labelText = scopeLabel ? `${label} (${scopeLabel})` : label;
			return `${labelText} ${shortPath}`;
		}
		return this.formatDisplayPath(p);
	},

	formatDiagnostics(
		this: InteractiveMode,
		diagnostics: readonly ResourceDiagnostic[],
		sourceInfos: Map<string, SourceInfo>,
	): string {
		const lines: string[] = [];

		// Group collision diagnostics by name
		const collisions = new Map<string, ResourceDiagnostic[]>();
		const otherDiagnostics: ResourceDiagnostic[] = [];

		for (const d of diagnostics) {
			if (d.type === "collision" && d.collision) {
				const list = collisions.get(d.collision.name) ?? [];
				list.push(d);
				collisions.set(d.collision.name, list);
			} else {
				otherDiagnostics.push(d);
			}
		}

		// Format collision diagnostics grouped by name
		for (const [name, collisionList] of collisions) {
			const first = collisionList[0]?.collision;
			if (!first) continue;
			lines.push(theme.fg("warning", `  "${name}" collision:`));
			lines.push(
				theme.fg(
					"dim",
					`    ${theme.fg("success", "✓")} ${this.formatPathWithSource(first.winnerPath, this.findSourceInfoForPath(first.winnerPath, sourceInfos))}`,
				),
			);
			for (const d of collisionList) {
				if (d.collision) {
					lines.push(
						theme.fg(
							"dim",
							`    ${theme.fg("warning", "✗")} ${this.formatPathWithSource(d.collision.loserPath, this.findSourceInfoForPath(d.collision.loserPath, sourceInfos))} (skipped)`,
						),
					);
				}
			}
		}

		for (const d of otherDiagnostics) {
			if (d.path) {
				const formattedPath = this.formatPathWithSource(d.path, this.findSourceInfoForPath(d.path, sourceInfos));
				lines.push(theme.fg(d.type === "error" ? "error" : "warning", `  ${formattedPath}`));
				lines.push(theme.fg(d.type === "error" ? "error" : "warning", `    ${d.message}`));
			} else {
				lines.push(theme.fg(d.type === "error" ? "error" : "warning", `  ${d.message}`));
			}
		}

		return lines.join("\n");
	},
};
