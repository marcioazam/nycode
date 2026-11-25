// The in-process hooks of the core: `{ "type": "internal", "name": "<name>" }` runs the function registered here instead
// of a process. The result has the shape of a command hook's: exit code, stdout (the JSON the hook prints) and stderr.
import { coreNotes } from "./core-notes.ts";

export interface InternalHookResult {
	code: number;
	stdout: string;
	stderr: string;
}

/** An internal hook: the event payload in, what a command hook would have printed and exited with out. */
export type InternalHook = (payload: Record<string, unknown>) => Promise<InternalHookResult>;

const REGISTRY: ReadonlyMap<string, InternalHook> = new Map([["core-notes", coreNotes]]);

/** The internal hook registered under `name`, or undefined when there is none. */
export const internalHook = (name: unknown): InternalHook | undefined =>
	typeof name === "string" ? REGISTRY.get(name) : undefined;

/** The registered names, for the configuration error that names the valid ones. */
export const internalHookNames = (): string[] => [...REGISTRY.keys()];
