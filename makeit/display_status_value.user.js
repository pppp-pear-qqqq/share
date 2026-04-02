// ==UserScript==
// @name         ステータス数値化
// @namespace    https://pppp-pear-qqqq.github.io/share/
// @version      0.1.0
// @updateURL    https://pppp-pear-qqqq.github.io/share/makeit/display_status_value.user.js
// @downloadURL  https://pppp-pear-qqqq.github.io/share/makeit/display_status_value.user.js
// @description  プロフィール編集画面でのステータスを数値化します。調整に便利。人のステータスが数値で見えるようになったりはしません。
// @author       なしなし
// @match        https://sapphiredevil.sakura.ne.jp/makeit/btest/public_html/profile_edit.php
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    function bake(tagName, f) {
		const e = document.createElement(tagName);
		f(e);
		return e;
	}

    document.querySelectorAll('.status-item').forEach(e=>{
        const label=e.querySelector('.status-label');
        const value=label.appendChild(bake('span',e=>{
            e.classList.add('status-value');
        }));
        const slider=e.querySelector('input[type="range"]');
		slider.removeAttribute('oninput')
        value.textContent=slider.value;
        slider.addEventListener('input',()=>{
            value.textContent=slider.value;
        });
    });
})();
