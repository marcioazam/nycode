// Built-in `devin` provider: Devin subscription models through the local Devin CLI sign-in. nycode keeps the tools,
// the loop and the session; only the model call goes to Devin (no ACP, none of Devin's harness).
//
// Ported from an MIT-licensed Devin provider extension (MIT, Copyright (c) 2026 Kashyab Ambarani and contributors;
// attribution in NOTICE and ./LICENSE), reviewed by the third-party intake of 2026-11-26. Changes from upstream and
// the risk of the undocumented endpoint are recorded in docs/harness/devin-provider-2026-11-26.md.
import type { ExtensionAPI } from "../../core/extensions/types.ts";
import { registerDevinCommands } from "./commands.ts";
import { registerDevinProvider } from "./provider.ts";

export default function devinExtension(nycode: ExtensionAPI): void {
	const provider = registerDevinProvider(nycode);
	registerDevinCommands(nycode, provider);
}
