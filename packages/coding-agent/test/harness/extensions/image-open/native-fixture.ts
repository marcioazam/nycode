// Fixture of the native click test: a message renderer that draws one Image, loaded with -e next to the extension under test.
import { Image } from "@nycode/tui";
import type { ExtensionAPI } from "../../../../src/core/extensions/types.ts";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export default function (nycode: ExtensionAPI) {
	nycode.registerMessageRenderer(
		"imgfix",
		() => new Image(PNG, "image/png", { fallbackColor: (s: string) => s }, { filename: "fixture.png" }),
	);
	nycode.on("session_start", () => nycode.sendMessage({ customType: "imgfix", content: "x", display: true }));
}
