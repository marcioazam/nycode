// Runs the CLI in this process: the former body of cli.ts, loaded lazily by core/lifecycle/launch.ts.
import { main } from "../main.ts";
import { setupCli } from "./setup.ts";

/** Sets the process up and starts the CLI with the arguments after the script. */
export function runCli(args: string[]): void {
	setupCli();
	main(args);
}
