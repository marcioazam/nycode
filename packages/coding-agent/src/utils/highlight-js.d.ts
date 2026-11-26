// highlight.js ships types for `highlight.js`, `highlight.js/lib/core(.js)` and `highlight.js/lib/languages/*`, but
// not for the `.js` spelling of the grammar modules. A second declaration of `highlight.js/lib/core.js` here would
// merge with the shipped one and the winner would depend on file order, so only the missing modules are declared.

declare module "highlight.js/lib/index.js" {
	import type { HLJSApi } from "highlight.js";
	const hljs: HLJSApi;
	export default hljs;
}

declare module "highlight.js/lib/languages/*.js" {
	import type { LanguageFn } from "highlight.js";
	const language: LanguageFn;
	export default language;
}
