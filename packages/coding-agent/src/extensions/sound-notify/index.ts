/**
 * Plays a local sound when the nycode turn finally ends (port of the harness hook sound-notify.py, itself from
 * ~/.codex/bin/codex-sound-notify).
 *
 * `agent_settled` is the real end: after retries, compaction and continuations (/goal, plan gate), so a turn plays
 * once. Only in the main interactive session: nothing in subagents (NYCODE_SUBAGENT=1) nor without UI (`-p`), so evals
 * and lanes do not play in series. Player order: canberra-gtk-play, pw-play with the freedesktop sound, TTY bell.
 * Switched by `notify.sound` (NYCODE_SOUND_NOTIFY wins), on by default. Complements the notify extension (terminal
 * notification only when "away").
 *
 * Single owner of the decision: alone, it plays on every end of turn. When the avisos extension announces
 * `nycode-harness:notify-owner`, this extension stops deciding and only plays on `nycode-harness:aviso-som`, which
 * avisos emits for the events in the `som` list of avisos.json (and on "Testar agora").
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import type { ExtensionAPI } from "../../core/extensions/types.ts";
import { resolveNycodeSettings } from "../../core/settings-nycode.ts";

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

/** Player local; se não houver ou falhar, bell no TTY. `spawnFn` e `bell` são injetáveis nos testes (nunca tocam som real). */
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

export const OWNER_CHANNEL = "nycode-harness:notify-owner";
export const SOUND_CHANNEL = "nycode-harness:aviso-som";

export function setup(
	nycode: ExtensionAPI,
	tocar: () => void = () => play(),
	env: Record<string, string | undefined> = process.env,
): void {
	if (env.NYCODE_SUBAGENT === "1") return;
	let avisosDecide = false;
	nycode.events?.on(OWNER_CHANNEL, () => {
		avisosDecide = true;
	});
	nycode.events?.on(SOUND_CHANNEL, () => {
		if (avisosDecide) tocar();
	});
	nycode.on("agent_settled", async (_event, ctx) => {
		if (!avisosDecide && ctx.hasUI && resolveNycodeSettings(nycode.getSettings(), env).notify.sound) tocar();
	});
}

export default function (nycode: ExtensionAPI) {
	setup(nycode);
}
