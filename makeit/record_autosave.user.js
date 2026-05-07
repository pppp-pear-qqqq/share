// ==UserScript==
// @name         記録自動保存
// @namespace    https://pppp-pear-qqqq.github.io/share/
// @version      0.1.0
// @updateURL    https://pppp-pear-qqqq.github.io/share/makeit/record_autosave.user.js
// @downloadURL  https://pppp-pear-qqqq.github.io/share/makeit/record_autosave.user.js
// @description  ページ遷移時にタイトルと本文を自動保存して、次の表示時に読み込みます。
// @author       なしなし
// @match        https://sapphiredevil.sakura.ne.jp/makeit/btest/public_html/record_edit.php
// @icon         https://www.google.com/s2/favicons?sz=64&domain=sakura.ne.jp
// @grant        none
// ==/UserScript==

(function () {
	'use strict';
	const title = document.querySelector('[name="title"]');
	const body = document.querySelector('#editor-area');
	title.value = localStorage.getItem('record_autosave/title') ?? '';
	body.value = localStorage.getItem('record_autosave/body') ?? '';

	window.addEventListener('unload', () => {
		localStorage.setItem('record_autosave/title', title.value);
		localStorage.setItem('record_autosave/body', body.value);
	});
})();
