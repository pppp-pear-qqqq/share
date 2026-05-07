// ==UserScript==
// @name         ショップ商品検索
// @namespace    https://pppp-pear-qqqq.github.io/share/
// @version      0.1.0
// @updateURL    https://pppp-pear-qqqq.github.io/share/makeit/find_shop_item.user.js
// @downloadURL  https://pppp-pear-qqqq.github.io/share/makeit/find_shop_item.user.js
// @description  ショップから目当ての商品を探すのを補助します。
// @author       なしなし
// @match        https://sapphiredevil.sakura.ne.jp/makeit/btest/public_html/shop.php?shop_id=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=sakura.ne.jp
// @grant        none
// ==/UserScript==

(function () {
	'use strict';
	function bake(tagName, f) {
		const e = document.createElement(tagName);
		f(e);
		return e;
	}

	function findItem(search) {
		const items = document.querySelectorAll('.item-name-main');
		for (const item of items) {
			if (item.textContent.includes(search)) {
				item.scrollIntoView();
				alert(`find "${item.textContent.trim()}"`);
				return;
			}
		}
	}

	const black_list = [305, 313, 347, 365, 380, 392, 397, 403];

	const search_item = localStorage.getItem('find_shop_item_search') || '';

	document.querySelector('.container>div').appendChild(bake('div', e => {
		e.style.display = 'flex';
		e.style.gap = '4px';
		e.style.flexWrap = 'wrap';
		e.style.alignItems = 'center';
		const shop_id = Number(new URLSearchParams(location.search).get('shop_id'));
		e.appendChild(bake('a', e => {
			e.textContent = '<- 前へ';
			let target = shop_id - 1;
			while (black_list.includes(target)) target = --target;
			if (target < 1) return;
			e.href = `${location.pathname}?shop_id=${target}`;
		}))
		e.appendChild(bake('a', e => {
			e.textContent = '次へ ->';
			let target = shop_id + 1;
			while (black_list.includes(target)) target = ++target;
			e.href = `${location.pathname}?shop_id=${target}`;
		}))
		e.appendChild(bake('input', e => {
			e.type = 'text';
			e.placeholder = '検索対象';
			e.value = search_item;
			e.addEventListener('input', () => {
				localStorage.setItem('find_shop_item_search', e.value);
				if (e.value !== '') findItem(e.value);
			});
		}))
	}));

	if (search_item !== '') findItem(search_item);
})();
