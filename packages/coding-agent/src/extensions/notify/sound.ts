/**
 * Local sound for the end of a turn. Player order: canberra-gtk-play, pw-play with the freedesktop sound, TTY bell.
 * The decision (when to play, `notify.sound`) lives in index.ts; this file only plays.
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs";

const COMPLETE_SOUND = "/usr/share/sounds/freedesktop/stereo/complete.oga";

function onPath(bin: string): boolean {
	return (process.env.PATH ?? "").split(":").some((dir) => dir && fs.existsSync(`${dir}/${bin}`));
}

export function playerCommand(
	exists: (bin: string) => boolean = onPath,
	hasSound: boolean = fs.existsSync(COMPLETE_SOUND),
): string[] | undefined {
	if (exists("canberra-gtk-play")) return ["canberra-gtk-play", "-i", "complete", "-d", "nycode turn complete"];
	if (hasSound && exists("pw-play")) return ["pw-play", COMPLETE_SOUND];
	return undefined;
}

type Spawn = (cmd: string, args: string[], opts: { stdio: "ignore"; detached: true }) => { unref(): void };
const bellTty = () => fs.writeFileSync("/dev/tty", "\x07");

/** Plays with the local player; without one, or if it fails, rings the TTY bell. `spawnFn` and `bell` are injectable so tests never make a real sound. */
export function play(
	command: string[] | null = playerCommand() ?? null,
	spawnFn: Spawn = spawn,
	bell: () => void = bellTty,
): void {
	if (command) {
		try {
			spawnFn(command[0], command.slice(1), { stdio: "ignore", detached: true }).unref();
			return;
		} catch {
			// falls back to the bell
		}
	}
	try {
		bell();
	} catch {
		// no TTY: nothing to do
	}
}
