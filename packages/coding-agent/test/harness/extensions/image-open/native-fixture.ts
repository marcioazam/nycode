// Fixture of the native click test: a message renderer that draws one Image, loaded with -e next to the extension under test.
// With NYCODE_IMGFIX_TRACE set it also records, with timestamps, what the click path sees (the failure message of the test
// prints it): every raw terminal input chunk, every mouse event the Image receives, and every notification.
import { appendFileSync } from "node:fs";
import { Image } from "@nycode/tui";
import type { ExtensionAPI } from "../../../../src/core/extensions/types.ts";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

type MouseHandler = (this: unknown, event: unknown) => unknown;

export default function (nycode: ExtensionAPI) {
	const file = process.env.NYCODE_IMGFIX_TRACE;
	const trace = (kind: string, data: unknown): void => {
		if (file) appendFileSync(file, `${Date.now()} ${kind} ${JSON.stringify(data)}\n`);
	};
	nycode.registerMessageRenderer("imgfix", () => {
		trace("render", "image component created");
		return new Image(PNG, "image/png", { fallbackColor: (s: string) => s }, { filename: "fixture.png" });
	});
	nycode.on("session_start", (_event, ctx) => {
		if (file && ctx.hasUI) {
			ctx.ui.onTerminalInput((data) => {
				trace("input", data);
				return undefined;
			});
			const notify = ctx.ui.notify.bind(ctx.ui);
			ctx.ui.notify = (message, type) => {
				trace("notify", message);
				notify(message, type);
			};
			const proto = Image.prototype as unknown as { handleMouse?: MouseHandler };
			const original = proto.handleMouse;
			if (original) {
				proto.handleMouse = function (event) {
					const result = original.call(this, event);
					trace("image-mouse", { event, result });
					return result;
				};
			}
		}
		trace("session_start", { hasUI: ctx.hasUI });
		nycode.sendMessage({ customType: "imgfix", content: "x", display: true });
	});
}
