// Fixture extension of the native display tests, loaded with -e into the built CLI: the REAL status-line, the REAL fleet UI
// (registerFleetUi, over a mock source whose stop() only writes a marker file) and the REAL PlanSection with 20 synthetic
// tasks. NYCODE_NATIVE_CFG (JSON) says what to show, NYCODE_NATIVE_MARKER where stop() writes, NYCODE_NATIVE_TRACE where the
// raw terminal input is recorded (the failure message of a test prints it).
import { appendFileSync, writeFileSync } from "node:fs";
import type { ExtensionAPI } from "../../../../src/core/extensions/types.ts";
import { PlanSection } from "../../../../src/extensions/plan-mode/section.ts";
import statusLine from "../../../../src/extensions/status-line/index.ts";
import type { FleetSource, RunRecord } from "../../../../src/extensions/subagent/fleet/types.ts";
import { registerFleetUi } from "../../../../src/extensions/subagent/fleet-ui/index.ts";

interface Cfg {
	plan: boolean;
	agents: boolean;
	transcript?: boolean;
}

const cfg = JSON.parse(process.env.NYCODE_NATIVE_CFG ?? "{}") as Cfg;
const marker = process.env.NYCODE_NATIVE_MARKER ?? "";
const trace = process.env.NYCODE_NATIVE_TRACE;
const now = Date.now();

const rec = (id: string, agent: string): RunRecord => ({
	v: 1,
	id,
	parentId: null,
	depth: 1,
	agent,
	task: "fixture task",
	background: true,
	state: "running",
	provider: "fake",
	model: "m1",
	effort: "medium",
	modelSeen: true,
	effortSeen: true,
	startedAt: now - 60000,
	updatedAt: now,
	turns: 1,
	toolCalls: 1,
	tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, context: 1000 },
	cost: 0,
	ownerPid: process.pid,
	activity: "Fixture work",
});

const records: RunRecord[] = cfg.agents ? [rec("a1", "gate-runner"), rec("a2", "swarm-worker")] : [];
const source: FleetSource = {
	list: () => records,
	readTranscript: () => ({ items: [], next: 0 }),
	onChange: () => () => {},
	hasForeground: () => false,
	detachForeground: () => 0,
	send: () => "not-running",
	stop: (id) => {
		writeFileSync(marker, id, { flag: "a" });
		return "stopping";
	},
};

export default function (nycode: ExtensionAPI) {
	registerFleetUi(nycode, () => source);
	statusLine(nycode);
	const plan = new PlanSection();
	nycode.on("session_start", (_event, ctx) => {
		if (trace && ctx.hasUI) {
			ctx.ui.onTerminalInput((data) => {
				appendFileSync(trace, `${Date.now()} input ${JSON.stringify(data)}\n`);
				return undefined;
			});
		}
		if (cfg.plan) {
			const tasks = Array.from({ length: 20 }, (_, i) => ({
				step: i + 1,
				text: `TASK-${String(i + 1).padStart(2, "0")}`,
				completed: i < 3,
			}));
			plan.update(ctx, tasks);
		}
		if (cfg.transcript) {
			const lines = Array.from({ length: 150 }, (_, i) => `LINE-${String(i + 1).padStart(3, "0")}`).join("\n");
			nycode.sendMessage({ customType: "fixture", content: lines, display: true });
		}
	});
	nycode.on("session_shutdown", () => plan.shutdown());
}
