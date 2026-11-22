// Report of hook failures to the diagnostics inbox ($NYCODE_DIAG_INBOX); never throws.
import { appendFileSync } from "node:fs";

const field = (value: unknown): string =>
	String(value).replaceAll("\r", "").replaceAll("\t", "\\t").replaceAll("\n", "\\n");

/** Appends one tab-separated line (severity, source, kind, message, optional detail) to the inbox, when one is set. */
export function report(severity: number, source: string, kind: string, message: string, detail = ""): void {
	const inbox = process.env.NYCODE_DIAG_INBOX;
	if (!inbox) return;
	const fields = [String(severity), source, kind, message, ...(detail ? [detail] : [])];
	try {
		appendFileSync(inbox, `${fields.map(field).join("\t")}\n`, "utf8");
	} catch {
		// The diagnostics inbox never breaks the caller.
	}
}
