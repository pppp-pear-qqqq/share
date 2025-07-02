import { Ajax } from "./ajax.js";

const form = document.getElementById('talk');
let lock = [];
const proc = (f, time = 1000) => {
	if (!lock.includes(f)) {
		lock.push(f);
		f();
		setTimeout(() => lock = lock.filter(v => v !== submit), time);
	}
}
const submit = async () => {
	await new Ajax(form).send();
	form.elements.namedItem('content').value = '';
};
const del_icon = () => {
	Array.from(form.querySelector('[name="avatar_url"]').selectedOptions).forEach(e => e.remove());
	let icon_text = Array.from(form.querySelector('[name="avatar_url"]').options).reduce((acc, v) => `${acc}\n${v.value}`, '');
	sessionStorage.setItem('icon', icon_text.trimStart())
};
talk.querySelector('.submit').addEventListener('click', () => proc(submit));
talk.querySelector('.del_icon').addEventListener('click', () => proc(del_icon));

const append_icon = (text) => {
	const e = form.querySelector('[name="avatar_url]"');
	let icon_text = sessionStorage.getItem('icon') ?? '';
	let ret = null;
	text.split(/\n|\r|\n\r/).forEach(line => {
		if (line != '') {
			if (!ret) ret = line;
			icon_text += '\n' + line;
			const opt = document.createElement('option');
			const img = document.createElement('img');
			img.width = 48;
			img.height = 48;
			img.src = line;
			opt.value = line;
			opt.appendChild(img);
			e.appendChild(opt);
		}
	})
	sessionStorage.setItem('icon', icon_text.trimStart());
	return ret;
}
{
	const icon_text = sessionStorage.getItem('icon');
	if (icon_text) form.querySelector('.icon>img').src = append_icon(icon_text) ?? '';
}
document.documentElement.addEventListener('keydown', () => {
	if (!lock.includes('paste')) {
		lock.push('paste');
		navigator.clipboard.readText().then(text => append_icon(text))
	}
})
document.documentElement.addEventListener('keyup', () => lock = lock.filter(v => v !== 'paste'))

form.querySelector('[name="avatar_url"]').addEventListener('focus', () => console.log('icon select'));