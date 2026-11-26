import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { devinVersion, findDevinBin, runDevin } from "../../../src/extensions/devin/auth/cli.ts";
import {
	authStatus,
	credentialsPath,
	loginWithCli,
	readCredentials,
} from "../../../src/extensions/devin/auth/credentials.ts";
import {
	desktopStateDbExists,
	desktopStateDbPath,
	readDevinDesktopApiKey,
} from "../../../src/extensions/devin/auth/desktop-auth.ts";
import {
	clearClientIdentityCache,
	resolveClientIdentity,
	WINDSURF_IDENTITY,
} from "../../../src/extensions/devin/auth/identity.ts";
import { DEVIN_API_HOST, fetchWithRetry, isTransientNetworkError } from "../../../src/extensions/devin/auth/net.ts";
import { API_KEY, tempDir, writeCredentialsFile, writeFakeDevin } from "../helpers.ts";

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	clearClientIdentityCache();
});

describe("Devin CLI lookup", () => {
	it("uses DEVIN_CLI only when absolute, then the fixed home locations; never PATH", () => {
		const home = tempDir();
		expect(findDevinBin({ DEVIN_CLI: "relative/devin", PATH: home }, home)).toBeNull();
		const fake = writeFakeDevin(tempDir());
		expect(findDevinBin({ DEVIN_CLI: fake }, home)).toBe(fake);
		mkdirSync(join(home, ".devin/bin"), { recursive: true });
		writeFileSync(join(home, ".devin/bin/devin"), "#!/bin/sh\n");
		expect(findDevinBin({}, home)).toBe(join(home, ".devin/bin/devin"));
	});

	it("runs the binary without a shell and maps exit codes, missing binaries and versions", async () => {
		vi.stubEnv("DEVIN_CLI", writeFakeDevin(tempDir()));
		expect((await runDevin(["version"])).stdout.trim()).toBe("devin 1.2.3");
		expect((await runDevin(["auth", "status"])).code).toBe(1);
		expect(await devinVersion()).toBe("devin 1.2.3");
		vi.stubEnv("FAKE_DEVIN_FAIL", "1");
		vi.stubEnv("FAKE_DEVIN_MODELS", "/dev/null");
		expect(await runDevin(["models"])).toMatchObject({ code: 3, stderr: "boom\n" });
	});

	it("reports a missing binary", async () => {
		const missing = join(tempDir(), "nope");
		vi.stubEnv("DEVIN_CLI", missing);
		vi.stubEnv("HOME", tempDir());
		if (findDevinBin()) return; // a real devin in a system path: nothing to assert
		await expect(runDevin(["version"])).rejects.toThrow("Devin CLI not found");
		expect(await devinVersion()).toBeNull();
	});

	it("returns null for a failing version command", async () => {
		const dir = tempDir();
		const script = join(dir, "devin");
		writeFileSync(script, "#!/bin/sh\nexit 2\n");
		chmodSync(script, 0o755);
		vi.stubEnv("DEVIN_CLI", script);
		expect(await devinVersion()).toBeNull();
	});
});

describe("credentials", () => {
	it("reads the key and a raw api_server_url from the CLI file and ignores anything else", () => {
		const home = tempDir();
		expect(readCredentials(credentialsPath(home))).toBeNull();
		const path = writeCredentialsFile(home, API_KEY);
		writeFileSync(path, `api_server_url = "https://evil.example"\napi_key = "${API_KEY}"\n`);
		expect(readCredentials(path)).toEqual({ apiKey: API_KEY, path, apiServerUrl: "https://evil.example" });
		writeFileSync(path, 'other = "x"\n');
		expect(readCredentials(path)).toBeNull();
	});

	it("reports auth status from the CLI and falls back to the stored key", async () => {
		const home = tempDir();
		vi.stubEnv("HOME", home);
		vi.stubEnv("DEVIN_CLI", writeFakeDevin(tempDir(), { loggedIn: true }));
		expect((await authStatus(credentialsPath(home))).loggedIn).toBe(true);
		vi.stubEnv("DEVIN_CLI", writeFakeDevin(tempDir()));
		expect(await authStatus(credentialsPath(home))).toMatchObject({ loggedIn: false });
		const path = writeCredentialsFile(home, API_KEY);
		expect((await authStatus(path)).loggedIn).toBe(true);
		const none = tempDir();
		vi.stubEnv("DEVIN_CLI", join(none, "missing"));
		vi.stubEnv("HOME", none);
		if (findDevinBin()) return;
		expect((await authStatus(path)).summary).toContain("Devin credentials present");
		expect((await authStatus(join(none, "x.toml"))).loggedIn).toBe(false);
	});
});

describe("loginWithCli", () => {
	it("returns the CLI sign-in without prompting when it is logged in", async () => {
		const home = tempDir();
		vi.stubEnv("HOME", home);
		vi.stubEnv("DEVIN_CLI", writeFakeDevin(tempDir(), { loggedIn: true }));
		writeCredentialsFile(home, API_KEY);
		const confirm = vi.fn(async () => true);
		expect((await loginWithCli(confirm)).apiKey).toBe(API_KEY);
		expect(confirm).not.toHaveBeenCalled();
	});

	it("runs `devin auth login` and reads the key it stored", async () => {
		const home = tempDir();
		vi.stubEnv("HOME", home);
		vi.stubEnv("DEVIN_DESKTOP_STATE_DB", join(home, "absent.vscdb"));
		vi.stubEnv("DEVIN_CLI", writeFakeDevin(tempDir()));
		vi.stubEnv("FAKE_DEVIN_KEY", API_KEY);
		const confirm = vi.fn(async () => true);
		expect((await loginWithCli(confirm)).apiKey).toBe(API_KEY);
		expect(confirm).not.toHaveBeenCalled();
	});

	it("fails clearly when the login leaves no credentials", async () => {
		const home = tempDir();
		vi.stubEnv("HOME", home);
		vi.stubEnv("DEVIN_DESKTOP_STATE_DB", join(home, "absent.vscdb"));
		vi.stubEnv("DEVIN_CLI", writeFakeDevin(tempDir()));
		vi.stubEnv("FAKE_DEVIN_KEY", "");
		await expect(loginWithCli(async () => false)).rejects.toThrow("credentials.toml is missing");
	});

	it("reuses the Desktop sign-in only after consent, and never writes the CLI file", async () => {
		const home = tempDir();
		vi.stubEnv("HOME", home);
		const db = join(home, "state.vscdb");
		const sqlite = await import("node:sqlite");
		const database = new sqlite.DatabaseSync(db);
		database.exec("CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value TEXT)");
		database
			.prepare("INSERT INTO ItemTable VALUES (?, ?)")
			.run("windsurfAuthStatus", JSON.stringify({ apiKey: API_KEY }));
		database.close();
		vi.stubEnv("DEVIN_DESKTOP_STATE_DB", db);
		vi.stubEnv("DEVIN_CLI", writeFakeDevin(tempDir()));
		vi.stubEnv("FAKE_DEVIN_KEY", "from-cli-login-0000");

		const accepted = vi.fn(async () => true);
		expect(await loginWithCli(accepted)).toEqual({ apiKey: API_KEY, path: db });
		expect(accepted).toHaveBeenCalledWith(db);
		expect(readCredentials(credentialsPath(home))).toBeNull();

		// declined: the CLI login runs instead
		expect((await loginWithCli(async () => false)).apiKey).toBe("from-cli-login-0000");
	});
});

describe("Devin Desktop state database", () => {
	it("picks per-platform paths and honours the override", () => {
		expect(desktopStateDbPath({ DEVIN_DESKTOP_STATE_DB: "/x" }, "linux", "/h")).toBe("/x");
		expect(desktopStateDbPath({}, "linux", "/h")).toBe("/h/.config/Devin/User/globalStorage/state.vscdb");
		expect(desktopStateDbPath({}, "darwin", "/h")).toContain("Library/Application Support/Devin");
		expect(desktopStateDbPath({ APPDATA: "/a" }, "win32", "/h")).toBe("/a/Devin/User/globalStorage/state.vscdb");
		expect(desktopStateDbPath({}, "win32", "/h")).toContain("AppData/Roaming");
	});

	it("returns null for missing, unreadable, keyless or malformed databases", async () => {
		const dir = tempDir();
		expect(desktopStateDbExists(join(dir, "nope"))).toBeNull();
		expect(await readDevinDesktopApiKey(join(dir, "nope"))).toBeNull();
		const junk = join(dir, "junk.vscdb");
		writeFileSync(junk, "not a database");
		expect(desktopStateDbExists(junk)).toBe(junk);
		expect(await readDevinDesktopApiKey(junk)).toBeNull();

		const sqlite = await import("node:sqlite");
		for (const [name, value] of [
			["short", JSON.stringify({ apiKey: "short" })],
			["spaces", JSON.stringify({ apiKey: "has some spaces in it here" })],
			["badjson", "{"],
			["blank", " "],
			["nokey", JSON.stringify({})],
		] as const) {
			const path = join(dir, `${name}.vscdb`);
			const database = new sqlite.DatabaseSync(path);
			database.exec("CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value TEXT)");
			database.prepare("INSERT INTO ItemTable VALUES (?, ?)").run("windsurfAuthStatus", value);
			database.close();
			expect(await readDevinDesktopApiKey(path), name).toBeNull();
		}
	});
});

describe("client identity", () => {
	it("presents the real CLI version when the binary exists, memoized", async () => {
		vi.stubEnv("DEVIN_CLI", writeFakeDevin(tempDir()));
		expect(await resolveClientIdentity()).toEqual({ ide: "devin-cli", version: "1.2.3", kind: "cli" });
		vi.stubEnv("DEVIN_CLI", join(tempDir(), "gone"));
		expect(await resolveClientIdentity()).toEqual({ ide: "devin-cli", version: "1.2.3", kind: "cli" });
	});

	it("falls back to the Windsurf identity (verified live 2026-11-26) when there is no CLI", async () => {
		vi.stubEnv("HOME", tempDir());
		vi.stubEnv("DEVIN_CLI", join(tempDir(), "gone"));
		if (findDevinBin()) return;
		expect(await resolveClientIdentity()).toEqual({ ...WINDSURF_IDENTITY, kind: "fallback" });
		expect(WINDSURF_IDENTITY).toEqual({ ide: "windsurf", version: "2.0.0" });
	});
});

describe("network helpers", () => {
	it("pins the host and never follows redirects", async () => {
		expect(DEVIN_API_HOST).toBe("https://server.codeium.com");
		const fetchMock = vi.fn(async () => new Response("ok"));
		vi.stubGlobal("fetch", fetchMock);
		await fetchWithRetry("https://x", { method: "POST" });
		expect(fetchMock.mock.calls[0]).toEqual([
			"https://x",
			expect.objectContaining({ redirect: "error", method: "POST" }),
		]);
	});

	it("retries transient failures only, and honours abort", async () => {
		vi.useFakeTimers();
		try {
			const transient = new TypeError("fetch failed");
			const fetchMock = vi.fn().mockRejectedValueOnce(transient).mockResolvedValueOnce(new Response("ok"));
			vi.stubGlobal("fetch", fetchMock);
			const pending = fetchWithRetry("https://x", {}, isTransientNetworkError);
			await vi.advanceTimersByTimeAsync(2000);
			expect((await pending).status).toBe(200);
			expect(fetchMock).toHaveBeenCalledTimes(2);

			const fatal = vi.fn().mockRejectedValue(new Error("bad request"));
			vi.stubGlobal("fetch", fatal);
			await expect(fetchWithRetry("https://x", {}, isTransientNetworkError)).rejects.toThrow("bad request");
			expect(fatal).toHaveBeenCalledTimes(1);

			const always = vi.fn().mockRejectedValue(transient);
			vi.stubGlobal("fetch", always);
			const exhausted = fetchWithRetry("https://x", {}).catch((error: unknown) => error);
			await vi.advanceTimersByTimeAsync(5000);
			expect(await exhausted).toBe(transient);
			expect(always).toHaveBeenCalledTimes(3);

			const controller = new AbortController();
			controller.abort();
			await expect(fetchWithRetry("https://x", {}, undefined, controller.signal)).rejects.toThrow("Aborted");
			const aborting = new AbortController();
			vi.stubGlobal(
				"fetch",
				vi.fn(async () => {
					aborting.abort();
					throw new Error("x");
				}),
			);
			await expect(fetchWithRetry("https://x", {}, undefined, aborting.signal)).rejects.toThrow("Aborted");
		} finally {
			vi.useRealTimers();
		}
	});

	it("classifies transient errors", () => {
		expect(isTransientNetworkError(new TypeError("fetch failed"))).toBe(true);
		expect(isTransientNetworkError(new Error("read ECONNRESET"))).toBe(true);
		expect(isTransientNetworkError(new Error("socket hang up"))).toBe(true);
		expect(isTransientNetworkError(new Error("HTTP 400"))).toBe(false);
		expect(isTransientNetworkError("fetch failed")).toBe(false);
	});
});
