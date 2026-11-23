import { userInfo } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { getAgentDir } from "../src/config.ts";
import { plansDir } from "../src/extensions/plan-mode/utils.ts";

// The suite once left 1,260 session directories and 3,509 plan files in the developer's real agent directory.
it("runs against a throwaway home, never the user's agent directory", () => {
	const real = join(userInfo().homedir, ".nycode", "agent"); // from the password database, not from $HOME
	expect(getAgentDir().startsWith(real)).toBe(false);
	expect(plansDir().startsWith(real)).toBe(false);
});
