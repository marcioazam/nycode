// Incremental parser for Connect stream frames, with a hard cap on frame size.
// Derived from the framing loop of pi-devin-plus 0.1.3 (MIT), see ../LICENSE.

/** Largest frame payload accepted (compressed). A 4 GiB length in a header must not make the reader buffer forever. */
export const MAX_FRAME_BYTES = 16 * 1024 * 1024;

export interface ConnectFrame {
	flags: number;
	payload: Buffer;
}

/** Splits a byte stream into Connect frames (1 flags byte, 4-byte big-endian length, payload). */
export class ConnectFrameParser {
	private readonly queue: Buffer[] = [];
	private queued = 0;

	/** Feeds one chunk and returns the frames it completed. Throws when a frame header announces more than MAX_FRAME_BYTES. */
	push(chunk: Uint8Array): ConnectFrame[] {
		this.queue.push(Buffer.from(chunk));
		this.queued += chunk.length;
		const frames: ConnectFrame[] = [];
		while (this.queued >= 5) {
			const header = this.peek(5);
			const len = header.readUInt32BE(1);
			if (len > MAX_FRAME_BYTES)
				throw new Error(`Devin stream frame of ${len} bytes exceeds the ${MAX_FRAME_BYTES} byte limit`);
			if (this.queued < 5 + len) break;
			this.drop(5);
			const payload = this.peek(len);
			this.drop(len);
			frames.push({ flags: header[0], payload });
		}
		return frames;
	}

	private peek(n: number): Buffer {
		const first = this.queue[0];
		if (first && first.length >= n) return first.subarray(0, n);
		return Buffer.concat(this.queue, this.queued).subarray(0, n);
	}

	private drop(n: number): void {
		this.queued -= n;
		let remaining = n;
		while (remaining > 0 && this.queue.length > 0) {
			const head = this.queue[0];
			if (head.length <= remaining) {
				this.queue.shift();
				remaining -= head.length;
			} else {
				this.queue[0] = head.subarray(remaining);
				remaining = 0;
			}
		}
	}
}
