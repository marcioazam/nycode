// Minimal protobuf and Connect stream-frame codec used by the Devin (Codeium) wire protocol.
// Ported from pi-devin-plus 0.1.3 (MIT), see ../LICENSE.
import * as zlib from "node:zlib";

/** Encodes a non-negative integer as a protobuf varint. */
export function encodeVarint(value: number | bigint): Buffer {
	const bytes: number[] = [];
	let v = BigInt(value);
	if (v < 0n) throw new RangeError(`encodeVarint: negative input (${value})`);
	while (v > 127n) {
		bytes.push(Number(v & 0x7fn) | 0x80);
		v >>= 7n;
	}
	bytes.push(Number(v));
	return Buffer.from(bytes);
}

function encodeTag(fieldNum: number, wire: number): Buffer {
	return encodeVarint((fieldNum << 3) | wire);
}

/** Encodes a length-delimited UTF-8 string field. */
export function encodeString(fieldNum: number, s: string): Buffer {
	const buf = Buffer.from(s, "utf8");
	return Buffer.concat([encodeTag(fieldNum, 2), encodeVarint(buf.length), buf]);
}

/** Encodes an embedded message field. */
export function encodeMessage(fieldNum: number, body: Buffer): Buffer {
	return Buffer.concat([encodeTag(fieldNum, 2), encodeVarint(body.length), body]);
}

/** Encodes a varint field. */
export function encodeVarintField(fieldNum: number, v: number | bigint): Buffer {
	return Buffer.concat([encodeTag(fieldNum, 0), encodeVarint(v)]);
}

/** Encodes a 64-bit double field. */
export function encodeFixed64Field(fieldNum: number, v: number): Buffer {
	const b = Buffer.alloc(8);
	b.writeDoubleLE(v, 0);
	return Buffer.concat([encodeTag(fieldNum, 1), b]);
}

/** Encodes a google.protobuf.Timestamp body for the current instant. */
export function encodeTimestampBody(now: number = Date.now()): Buffer {
	const seconds = Math.floor(now / 1000);
	const nanos = (now % 1000) * 1_000_000;
	return Buffer.concat([encodeVarintField(1, seconds), nanos > 0 ? encodeVarintField(2, nanos) : Buffer.alloc(0)]);
}

/** Decodes a varint at `offset`; returns the value and the next offset. */
export function decodeVarint(buf: Buffer, offset: number): [bigint, number] {
	let res = 0n;
	let shift = 0n;
	let i = offset;
	while (i < buf.length) {
		// A valid 64-bit varint is at most 10 bytes.
		if (i - offset >= 10) throw new Error("varint too long");
		const b = buf[i++];
		res |= BigInt(b & 0x7f) << shift;
		if (!(b & 0x80)) return [res, i];
		shift += 7n;
	}
	throw new Error("truncated varint");
}

export interface ProtoField {
	num: number;
	wire: number;
	value: bigint | Buffer;
}

/** Iterates the top-level fields of a protobuf message; stops silently at truncated or unknown wire data. */
export function* iterFields(buf: Buffer): Generator<ProtoField> {
	let i = 0;
	while (i < buf.length) {
		const [tagBig, next] = decodeVarint(buf, i);
		i = next;
		const tag = Number(tagBig);
		const num = tag >> 3;
		const wire = tag & 0x7;
		if (wire === 0) {
			const [v, after] = decodeVarint(buf, i);
			i = after;
			yield { num, wire, value: v };
		} else if (wire === 1) {
			if (i + 8 > buf.length) return;
			yield { num, wire, value: buf.subarray(i, i + 8) };
			i += 8;
		} else if (wire === 2) {
			const [n, after] = decodeVarint(buf, i);
			i = after;
			const len = Number(n);
			if (i + len > buf.length) return;
			yield { num, wire, value: buf.subarray(i, i + len) };
			i += len;
		} else if (wire === 5) {
			if (i + 4 > buf.length) return;
			yield { num, wire, value: buf.subarray(i, i + 4) };
			i += 4;
		} else {
			return;
		}
	}
}

/** Wraps a message in one Connect stream frame (flags byte + big-endian length), gzip-compressed by default. */
export function frameConnectStream(body: Buffer, compress = true): Buffer {
	const payload = compress ? zlib.gzipSync(body) : body;
	const header = Buffer.alloc(5);
	header[0] = compress ? 0x01 : 0;
	header.writeUInt32BE(payload.length, 1);
	return Buffer.concat([header, payload]);
}
