import type { TUI } from "../tui.ts";
import { Text } from "./text.ts";

export interface LoaderIndicatorOptions {
	/** Animation frames. Use an empty array to hide the indicator. */
	frames?: string[];
	/** Frame interval in milliseconds for animated indicators. */
	intervalMs?: number;
}

const DEFAULT_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const DEFAULT_INTERVAL_MS = 80;

/**
 * Loader component that updates with an optional spinning animation.
 *
 * The frame comes from the clock, so any render shows the current one. The timer wakes half a frame after each
 * boundary and asks for a render only when no other render showed the new frame yet: next to another animation
 * (a status shimmer at 30 fps) the spinner adds no frames of its own.
 */
export class Loader extends Text {
	private frames = [...DEFAULT_FRAMES];
	private intervalMs = DEFAULT_INTERVAL_MS;
	private currentFrame = 0;
	private startedAt = 0;
	private intervalId: NodeJS.Timeout | null = null;
	private ui: TUI | null = null;
	private renderIndicatorVerbatim = false;
	private spinnerColorFn: (str: string) => string;
	private messageColorFn: (str: string) => string;
	private message: string = "Loading...";

	constructor(
		ui: TUI,
		spinnerColorFn: (str: string) => string,
		messageColorFn: (str: string) => string,
		message: string = "Loading...",
		indicator?: LoaderIndicatorOptions,
	) {
		super("", 1, 0);
		this.ui = ui;
		this.spinnerColorFn = spinnerColorFn;
		this.messageColorFn = messageColorFn;
		this.message = message;
		this.setIndicator(indicator);
	}

	render(width: number): string[] {
		this.syncFrame();
		return ["", ...super.render(width)];
	}

	start(): void {
		this.startedAt = performance.now() - this.currentFrame * this.intervalMs;
		this.updateDisplay();
		this.restartAnimation();
	}

	stop(): void {
		if (this.intervalId) {
			clearTimeout(this.intervalId);
			this.intervalId = null;
		}
	}

	setMessage(message: string): void {
		this.message = message;
		this.updateDisplay();
	}

	override invalidate(): void {
		super.invalidate();
		this.updateDisplay();
	}

	setIndicator(indicator?: LoaderIndicatorOptions): void {
		this.renderIndicatorVerbatim = indicator !== undefined;
		this.frames = indicator?.frames !== undefined ? [...indicator.frames] : [...DEFAULT_FRAMES];
		this.intervalMs = indicator?.intervalMs && indicator.intervalMs > 0 ? indicator.intervalMs : DEFAULT_INTERVAL_MS;
		this.currentFrame = 0;
		this.start();
	}

	private restartAnimation(): void {
		this.stop();
		if (this.frames.length <= 1) {
			return;
		}
		const schedule = (): void => {
			const elapsed = performance.now() - this.startedAt;
			const delay = (Math.floor(elapsed / this.intervalMs) + 1.5) * this.intervalMs - elapsed;
			this.intervalId = setTimeout(() => {
				if (this.syncFrame()) this.ui?.requestRender();
				schedule();
			}, delay);
		};
		schedule();
	}

	/** Moves to the frame the clock says; true when it changed (nothing showed it yet). */
	private syncFrame(): boolean {
		if (!this.intervalId) return false;
		const frame = Math.floor((performance.now() - this.startedAt) / this.intervalMs) % this.frames.length;
		if (frame === this.currentFrame) return false;
		this.currentFrame = frame;
		this.updateText();
		return true;
	}

	protected getRenderedIndicator(): string {
		this.syncFrame();
		const frame = this.frames[this.currentFrame] ?? "";
		return this.renderIndicatorVerbatim ? frame : this.spinnerColorFn(frame);
	}

	private updateDisplay(): void {
		this.updateText();
		if (this.ui) {
			this.ui.requestRender();
		}
	}

	private updateText(): void {
		const renderedFrame = this.getRenderedIndicator();
		const indicator = renderedFrame.length > 0 ? `${renderedFrame} ` : "";
		this.setText(`${indicator}${this.messageColorFn(this.message)}`);
	}
}
