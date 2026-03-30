document.getElementById('navigator-form').addEventListener('submit', function (e) {
	e.preventDefault();
	const eno = this.children.namedItem('eno').value;
	const name = this.children.namedItem('name').value;
	/** @type {HTMLTableElement} */
	const words = this.querySelector('.words');
	let word_list = {};
	for (let i = 0; i < words.tBodies[0].rows.length; ++i) {
		const row = words.tBodies[0].rows[i];
		word_list[row.children.namedItem('path').value + '?' + row.children.namedItem('trigger').value] = row.children.namedItem('word').value;
	}
	fetch(this.action, {
		method: this.method.toUpperCase(),
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ key: eno + '/' + name, words: word_list }),
	}).then((res) => {
		if (!res.ok) throw new Error(res.statusText);
	}).catch((e) => {
		console.error(e);
	});
});
