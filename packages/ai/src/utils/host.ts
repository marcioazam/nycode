/** Hostname checks for a provider base URL. A substring of the whole URL is not a host. */

/**
 * True when `baseUrl`'s hostname is `host` or a subdomain of it.
 * An unparseable URL does not match. `https://evil.example/api.openai.com` and
 * `https://api.openai.com.evil.example` do not match `api.openai.com`.
 */
export function baseUrlHostIs(baseUrl: string, host: string): boolean {
	let hostname: string;
	try {
		hostname = new URL(baseUrl).hostname.toLowerCase();
	} catch {
		return false;
	}
	const expected = host.toLowerCase().replace(/\.+$/, "");
	return hostname === expected || hostname.endsWith(`.${expected}`);
}

/**
 * True when `baseUrl`'s hostname starts with `prefix` or contains it after a dot.
 * `prefix` includes its trailing dot, so `api.moonshot.` matches `api.moonshot.cn` and not `notapi.moonshot.cn`.
 */
export function baseUrlHostHasLabelPrefix(baseUrl: string, prefix: string): boolean {
	let hostname: string;
	try {
		hostname = new URL(baseUrl).hostname.toLowerCase();
	} catch {
		return false;
	}
	const expected = prefix.toLowerCase();
	return hostname.startsWith(expected) || hostname.includes(`.${expected}`);
}
