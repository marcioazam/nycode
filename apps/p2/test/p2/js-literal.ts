/** A JavaScript literal safe to embed in generated code. */

/**
 * A JavaScript source literal for `value`.
 * `JSON.stringify` leaves `<` in the text, and that ends a surrounding script element.
 */
export function jsLiteral(value: unknown): string {
	return JSON.stringify(value).replace(/[<>\u2028\u2029]/g, (character) => {
		if (character === "<") return "\\u003c";
		if (character === ">") return "\\u003e";
		if (character === "\u2028") return "\\u2028";
		return "\\u2029";
	});
}
