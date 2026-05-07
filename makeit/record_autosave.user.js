// ==UserScript==
// @name         記録自動保存
// @namespace    https://pppp-pear-qqqq.github.io/share/
// @version      0.1.0
// @updateURL    https://pppp-pear-qqqq.github.io/share/makeit/record_autosave.user.js
// @downloadURL  https://pppp-pear-qqqq.github.io/share/makeit/record_autosave.user.js
// @description  ショップから目当ての商品を探すのを補助します。
// @author       なしなし
// @match        https://sapphiredevil.sakura.ne.jp/makeit/btest/public_html/record_edit.php
// @icon         https://www.google.com/s2/favicons?sz=64&domain=sakura.ne.jp
// @grant        none
// ==/UserScript==

(function () {
	'use strict';
	const editor = document.querySelector('#editor-area');
	window.addEventListener('popstate', () => {
		const content = editor.value;
		localStorage.setItem('record_autosave', content);
	});
	const content = localStorage.getItem('record_autosave');
	if (content) {
		editor.value = content;
	}
})();
