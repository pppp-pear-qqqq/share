type Trigger = { path: string; type: string; hour?: number[]; week?: number[] };
type Dict = { trigger: Trigger; word: string[] };

export class NavigatorSettingForm {
	private form = document.getElementById('navigator-setting') as HTMLFormElement;
	private list: HTMLElement;
	private template: HTMLTemplateElement;
	private btn_add: HTMLButtonElement;

	private modal = document.getElementById('navigator-setting-modal') as HTMLDialogElement;
	private form_opt = document.getElementById('navigator-setting-options') as HTMLFormElement;

	// 現在オプションを編集中の行を保持
	private current: HTMLElement | null = null;
	private readonly DB_API_URL = 'https://example.com/api/navigator'; // ★実際のURLに変更

	constructor() {
		this.list = this.form.querySelector<HTMLElement>('[role="list"]')!;
		const section = this.list.parentElement!;
		this.template = section.querySelector('template')!;
		this.btn_add = section.querySelector('.add-item') as HTMLButtonElement;

		this.init();

		// 初期状態で1行追加しておく
		this.add_item();
	}

	private init() {
		// --- 行の追加 ---
		this.btn_add.addEventListener('click', () => this.add_item());

		// --- フォーム送信 (API連携) ---
		this.form.addEventListener('submit', async (e) => {
			e.preventDefault();
			await this.submit();
		});

		// モーダルの「設定を反映」ボタン（submitで自動的に閉じる）
		this.form_opt.addEventListener('submit', (e) => {
			e.preventDefault();
			this.save_opt();
			this.modal.close();
		});

		// キャンセルボタン
		this.form_opt.querySelector('.btn-cancel')?.addEventListener('click', () => {
			this.modal.close();
		});
	}

	private add_item() {
		// テンプレートからクローン
		const clone = this.template.content.cloneNode(true) as DocumentFragment;
		const row = clone.querySelector('.navigator-row') as HTMLElement;

		// 削除ボタン
		row.querySelector('.del')?.addEventListener('click', () => row.remove());

		// オプションボタン（モーダルを開く）
		row.querySelector('.btn-option')?.addEventListener('click', () => this.openModal(row));

		// プレビュー機能（入力されるたびにプレビューを更新）
		const textarea = row.querySelector<HTMLTextAreaElement>('[name="word"]')!;
		const iconImg = row.querySelector<HTMLImageElement>('.icon')!;
		const wordText = row.querySelector<HTMLElement>('.word-text')!;

		textarea.addEventListener('input', () => {
			const text = textarea.value;
			const pos = text.indexOf('|');
			if (pos !== -1) {
				iconImg.src = text.substring(0, pos).trim();
				iconImg.style.display = 'block';
				// セリフ内の \n や生改行を <br> に変換してプレビュー表示
				wordText.innerHTML = text.substring(pos + 1).trim().replace(/\r?\n/g, '<br>');
			} else {
				iconImg.style.display = 'none';
				wordText.innerHTML = text.trim().replace(/\r?\n/g, '<br>');
			}
		});

		this.list.appendChild(row);
	}

	private openModal(row: HTMLElement) {
		this.current = row;

		// 行に保存されている隠しデータをモーダルに復元する
		const hourVal = (row.querySelector<HTMLInputElement>('[name="hour"]'))?.value;
		const weekVal = (row.querySelector<HTMLInputElement>('[name="week"]'))?.value;

		const useHourCb = this.form_opt.querySelector<HTMLInputElement>('[name="use-hour"]')!;
		const hourStart = this.form_opt.querySelector<HTMLInputElement>('[name="hour-start"]')!;
		const hourEnd = this.form_opt.querySelector<HTMLInputElement>('[name="hour-end"]')!;

		if (hourVal) {
			const hours = JSON.parse(hourVal) as number[];
			useHourCb.checked = true;
			hourStart.value = hours[0].toString();
			hourEnd.value = hours[1].toString();
			this.form_opt.querySelector<HTMLElement>('.hour-inputs')!.hidden = false;
		} else {
			useHourCb.checked = false;
			hourStart.value = '';
			hourEnd.value = '';
			this.form_opt.querySelector<HTMLElement>('.hour-inputs')!.hidden = true;
		}

		const useWeekCb = this.form_opt.querySelector('[name="use-week"]') as HTMLInputElement;
		const dayCbs = this.form_opt.querySelectorAll<HTMLInputElement>('[name="day"]');

		if (weekVal) {
			const weeks = JSON.parse(weekVal) as number[];
			useWeekCb.checked = true;
			dayCbs.forEach(cb => cb.checked = weeks.includes(parseInt(cb.value)));
			this.form_opt.querySelector<HTMLElement>('.week-inputs')!.hidden = false;
		} else {
			useWeekCb.checked = false;
			dayCbs.forEach(cb => cb.checked = false);
			this.form_opt.querySelector<HTMLElement>('.week-inputs')!.hidden = true;
		}

		this.modal.showModal();
	}

	private save_opt() {
		if (!this.current) return;

		// モーダルの入力内容を行の隠しフィールドにJSON化して保存
		const useHourCb = this.form_opt.querySelector('[name="use-hour"]') as HTMLInputElement;
		const hourStart = this.form_opt.querySelector('[name="hour-start"]') as HTMLInputElement;
		const hourEnd = this.form_opt.querySelector('[name="hour-end"]') as HTMLInputElement;
		const inputHour = this.current.querySelector('[name="hour"]') as HTMLInputElement;

		if (useHourCb.checked && hourStart.value && hourEnd.value) {
			inputHour.value = JSON.stringify([parseInt(hourStart.value), parseInt(hourEnd.value)]);
		} else {
			inputHour.value = '';
		}

		const useWeekCb = this.form_opt.querySelector('[name="use-week"]') as HTMLInputElement;
		const inputWeek = this.current.querySelector('[name="week"]') as HTMLInputElement;
		const checkedDays = Array.from(this.form_opt.querySelectorAll<HTMLInputElement>('[name="day"]:checked'))
			.map(cb => parseInt(cb.value));

		if (useWeekCb.checked && checkedDays.length > 0) {
			inputWeek.value = JSON.stringify(checkedDays);
		} else {
			inputWeek.value = '';
		}

		// UI上のフィードバック（ボタンの色を変えるなど）
		const btn = this.current.querySelector('.btn-option') as HTMLElement;
		if (inputHour.value || inputWeek.value) {
			btn.style.backgroundColor = '#e0f7fa'; // 設定済みアピール
		} else {
			btn.style.backgroundColor = '';
		}

		this.current = null;
	}

	private async submit() {
		const fd = new FormData(this.form);
		const eno = fd.get('eno') as string;
		const name = fd.get('name') as string;
		const password = fd.get('password') as string;

		const key = `${eno}/${name}`;

		// --- データの収集とマージ ---
		// まったく同じトリガー条件を持つ行を1つの配列にまとめるため Map を使用
		const dictMap = new Map<string, Dict>();
		const rows = this.list.querySelectorAll('.navigator-row');

		rows.forEach(row => {
			const path = (row.querySelector('[name="path"]') as HTMLInputElement).value;
			const type = (row.querySelector('[name="type"]') as HTMLInputElement).value;
			const hourVal = (row.querySelector('[name="hour"]') as HTMLInputElement).value;
			const weekVal = (row.querySelector('[name="week"]') as HTMLInputElement).value;
			// ユーザーが入力した生改行を維持して取得
			const word = (row.querySelector('[name="word"]') as HTMLTextAreaElement).value;

			if (!path || !type || !word) return;

			const trigger: Trigger = { path, type };
			if (hourVal) trigger.hour = JSON.parse(hourVal);
			if (weekVal) trigger.week = JSON.parse(weekVal);

			// 結合キーの作成 (値が完全に一致していれば同じハッシュになる)
			const hashKey = `${path}|${type}|${hourVal}|${weekVal}`;

			if (dictMap.has(hashKey)) {
				// 既存のトリガーがあれば配列にセリフを追加
				dictMap.get(hashKey)!.word.push(word);
			} else {
				// 新規トリガー
				dictMap.set(hashKey, { trigger, word: [word] });
			}
		});

		// Map を配列 (Dict型) に変換し、JSON文字列にする
		const dictArray = Array.from(dictMap.values());
		const valueStr = JSON.stringify(dictArray);

		// --- API送信処理 ---
		const postData = new FormData();
		postData.append('key', key);
		postData.append('value', valueStr);
		postData.append('password', password);

		const submitBtn = this.form.querySelector('.btn-submit') as HTMLButtonElement;
		submitBtn.disabled = true;
		submitBtn.textContent = '送信中...';

		try {
			const res = await fetch(this.DB_API_URL, {
				method: 'POST',
				body: postData
			});

			const resText = await res.text();

			if (!res.ok) {
				throw new Error(`エラー: ${res.status} ${resText}`);
			}

			if (resText === 'Created' || resText === 'Updated') {
				alert(`保存が完了しました！(${resText})`);
			} else {
				alert(`サーバー応答: ${resText}`);
			}
		} catch (err: any) {
			console.error(err);
			alert(err.message || '通信エラーが発生しました');
		} finally {
			submitBtn.disabled = false;
			submitBtn.textContent = 'DBへ登録';
		}
	}
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
	new NavigatorSettingForm();
});
