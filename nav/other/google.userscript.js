// ==UserScript==
// @name         Google Navigator
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  ナビゲーターシステムをGoogleでテストする
// @author       You
// @match        *://www.google.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=google.com
// @require      https://pppp-pear-qqqq.github.io/share/nav/navigator.min.js
// @resource     toastCSS https://pppp-pear-qqqq.github.io/share/nav/style/soraniwa.css
// @grant        GM_addStyle
// @grant        GM_getResourceText
// ==/UserScript==

(function () {
	'use strict';

	// 1. CSSの適用（Googleの厳格なCSPを貫通してスタイルを当てる）
	const cssString = GM_getResourceText('toastCSS');
	GM_addStyle(cssString);

	// 2. アプリの起動
	try {
		// コンストラクタに設定値を渡してインスタンス化
		const app = new NavigatorToaster({
			api: 'https://script.google.com/macros/s/AKfycbznftumO8l0a4w3xj1xAb0jN9cIQGzfN2JmirTnoaDEostWukJ7EP5t0IUAF10h4Zbv/exec',
			is_subdir: false,// Google検索はサブディレクトリ分割ではないので false
			is_query_page: true,// 検索ワード(?q=xxx)でページが変わるので true が適切です
		});
		app.start();
	} catch (e) {
		console.error('ナビゲーターの起動に失敗しました:', e);
	}
})();
