// Rewrites package-lock.json to match package.json. Does not install packages or run scripts.
import { spawnSync } from "node:child_process";

const result = spawnSync("npm", ["install", "--package-lock-only", "--ignore-scripts"], {
	stdio: "inherit",
});
process.exit(result.status === null ? 1 : result.status);
