// ==UserScript==
// @name         北摩のシティマップをちょっと軽くするやつ
// @namespace    https://pppp-pear-qqqq.github.io/share/kitama_citymap_lightweight.user.js
// @version      2025-05-08
// @description  1000件以上のアイコンを一気に読み込むとかいう信じられない仕様をやや緩和
// @author       なしなし
// @match        https://wdrb.work/otherside/field.php
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wdrb.work
// @grant        none
// @run-at       document-body
// ==/UserScript==
'use strict';document.querySelectorAll('.move_command .area_charalist img').forEach(e=>{e.dataset.s=e.src;e.removeAttribute('src');});
const o=new MutationObserver(r=>{r.forEach(i=>{const t=i.target;if(!t.classList.contains('loaded')){t.querySelectorAll('.area_charalist img').forEach(e=>e.src=e.dataset.s);t.classList.add('loaded');}})});
document.querySelectorAll('.move_command').forEach(e=>o.observe(e,{attributes:true,attributeFilter:['style']}));