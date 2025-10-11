// ==UserScript==
// @name         ソラニワいっぱい購入mod
// @namespace    https://pppp-pear-qqqq.github.io/share/clst/shop_multi_buy.js
// @version      2025-10-11
// @description  いっぱい購入します
// @author       なしなし
// @match        https://soraniwa.428.st/gf/?mode=shop
// @icon         https://www.google.com/s2/favicons?sz=64&domain=428.st
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    async function* multi_buy(ino, num) {
        const data = new FormData();
        data.append('mode', 'keizoku02_item_post');
        data.append('action', 'buy');
        data.append('ino', String(ino));
        for (let i = 0; i < num; ++i) {
            const r = await fetch('.', {
                method: 'POST',
                redirect: 'manual',
                body: data,
            });
            if (r.status >= 400 && r.status < 600) throw new Error(r.status);
            yield i;
        }
        return;
    }

    const f = document.querySelector('.framearea>form');
    const b = f.querySelector('input[type="submit"]');
    const p = b.parentElement;
    const i = p.insertBefore(document.createElement('input'), b);
    i.type = 'text';
    i.name = 'mod-num';
    i.size = 1;
    p.insertBefore(document.createTextNode('　個　'), b);
    p.appendChild(document.createTextNode('複数購入時のウェイトms（1000以上推奨、変更不要）　'));
    const w = p.appendChild(document.createElement('input'));
    w.type = 'text';
    w.name = 'mod-wait';
    w.size = 1;
    w.value = '1200';
    b.addEventListener('click', async e => {
        if (i.value === '') return;
        e.preventDefault();
        try {
            const num = Number(i.value);
            const m = p.insertBefore(document.createElement('span'), b.nextElementSibling.nextElementSibling);
            const s = Number(w.value);
            m.innerText = '処理中';
            for await (const r of multi_buy(f.elements.namedItem('ino').value, num)) {
                console.log(`${r} / ${num}`);
                m.innerText += '.';
                await new Promise(r => setTimeout(r, s));
            }
            m.remove();
            alert('購入完了しました');
        } catch (e) {
            alert(e.message);
        }
    })})();
