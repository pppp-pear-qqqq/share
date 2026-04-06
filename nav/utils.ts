export function bake<K extends keyof HTMLElementTagNameMap>(tagName: K, f: (e: HTMLElementTagNameMap[K]) => void) {
	const e = document.createElement(tagName);
	f(e);
	return e;
}
