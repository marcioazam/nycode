// One-shot loopback HTTP server that receives the sign-in redirect. Logic from JoShMiQueL/devin-core
// auth/loopback.ts (MIT, Copyright (c) JoShMiQueL), see ../../LICENSE.
import { createServer, type Server } from "node:http";

/** Path the web app's safe-redirect check requires. */
export const CALLBACK_PATH = "/callback";

/** An armed listener must not outlive an abandoned sign-in. */
const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;

export interface CallbackServer {
	redirectUri: string;
	/** Rejects on timeout or `close()`. */
	code: Promise<string>;
	close(): void;
}

const page = (title: string, body: string) =>
	`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:system-ui;margin:3rem"><h1>${title}</h1><p>${body}</p></body></html>`;

/** Binds 127.0.0.1 on a free port and waits for `/callback?code=…&state=…` with the expected state. */
export function startCallbackServer(state: string, timeoutMs: number = CALLBACK_TIMEOUT_MS): Promise<CallbackServer> {
	return new Promise((resolve, reject) => {
		let settle: (code: string) => void = () => {};
		let fail: (error: Error) => void = () => {};
		const code = new Promise<string>((res, rej) => {
			settle = res;
			fail = rej;
		});
		// The caller may never await `code` (cancelled before the redirect): do not crash on the rejection.
		code.catch(() => {});

		let timer: ReturnType<typeof setTimeout> | undefined;
		let stopped = false;
		const server: Server = createServer((req, res) => {
			const reply = (title: string, body: string, status = 200) => {
				res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
				res.end(page(title, body));
			};
			// The request line is network input: a malformed target (`GET http://[`) must not throw out of the handler.
			if (!URL.canParse(req.url ?? "/", "http://127.0.0.1")) return reply("Bad request", "", 400);
			const url = new URL(req.url ?? "/", "http://127.0.0.1");
			if (url.pathname !== CALLBACK_PATH) return reply("Not found", "", 404);
			if (url.searchParams.get("state") !== state) {
				return reply("Invalid state parameter", "Please start the sign-in again.", 400);
			}
			const received = url.searchParams.get("code");
			if (!received) return reply("No authorization code received", "Please return to the terminal.", 400);
			settle(received);
			return reply("Signed in to Devin", "You can close this tab and return to the terminal.");
		});
		const stop = () => {
			if (stopped) return;
			stopped = true;
			if (timer) clearTimeout(timer);
			server.close();
		};

		server.on("error", reject);
		server.listen(0, "127.0.0.1", () => {
			timer = setTimeout(() => {
				fail(new Error(`Devin sign-in timed out after ${Math.round(timeoutMs / 1000)}s`));
				stop();
			}, timeoutMs);
			const address = server.address();
			const port = typeof address === "object" && address ? address.port : 0;
			resolve({
				redirectUri: `http://127.0.0.1:${port}${CALLBACK_PATH}`,
				code,
				close: () => {
					fail(new Error("Devin sign-in cancelled"));
					stop();
				},
			});
		});
	});
}
