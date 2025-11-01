const walker = document.createTreeWalker(
	document.querySelector('main'),
	NodeFilter.SHOW_TEXT,
	null,
	false
);

const regex = /\[([^\]]+)\]/g;
const textNodes = [];

// まずテキストノードを収集（後で安全に変換）
let node;
while ((node = walker.nextNode())) {
	if (regex.test(node.textContent)) {
		textNodes.push(node);
	}
	regex.lastIndex = 0; // RegExp の状態をリセット
}

// テキストノードを置換
for (const textNode of textNodes) {
	const html = textNode.textContent.replace(
		regex,
		(_, text) => `<span class="status">${text}</span>`
	);
	if (textNode.textContent !== html) {
		const frag = document.createRange().createContextualFragment(html);
		textNode.parentNode.replaceChild(frag, textNode);
	}
}

