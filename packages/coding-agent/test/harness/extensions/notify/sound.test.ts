// Sound player of the notify extension: player order, detached spawn and the bell fallback.
import { describe, expect, it, vi } from "vitest";
import { play, playerCommand } from "../../../../src/extensions/notify/sound.ts";

describe("notify sound", () => {
	it("order: canberra, then pw-play with the sound, otherwise none (bell)", () => {
		expect(playerCommand((b) => b === "canberra-gtk-play", true)?.[0]).toBe("canberra-gtk-play");
		expect(playerCommand((b) => b === "pw-play", true)).toEqual([
			"pw-play",
			"/usr/share/sounds/freedesktop/stereo/complete.oga",
		]);
		expect(playerCommand((b) => b === "pw-play", false)).toBeUndefined();
		expect(playerCommand(() => false, true)).toBeUndefined();
	});

	it("spawns the player detached and does not ring the bell", () => {
		const unref = vi.fn();
		const spawnFn = vi.fn(() => ({ unref }));
		const bell = vi.fn();
		play(["canberra-gtk-play", "-i", "complete"], spawnFn, bell);
		expect(spawnFn).toHaveBeenCalledWith("canberra-gtk-play", ["-i", "complete"], {
			stdio: "ignore",
			detached: true,
		});
		expect(unref).toHaveBeenCalled();
		expect(bell).not.toHaveBeenCalled();
	});

	it("falls back to the bell when the spawn throws or there is no player", () => {
		const bell = vi.fn();
		play(
			["x"],
			() => {
				throw new Error("spawn failed");
			},
			bell,
		);
		play(null, vi.fn(), bell);
		expect(bell).toHaveBeenCalledTimes(2);
	});

	it("survives a failing bell (no TTY)", () => {
		expect(() =>
			play(null, vi.fn(), () => {
				throw new Error("no tty");
			}),
		).not.toThrow();
	});
});
