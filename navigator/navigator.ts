// APIの通信自体は成功したが、対象のデータが存在しなかった（またはローカルに設定がない）場合のエラー
class ErrorNavigatorNotFound extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'NavigatorNotFoundError';
	}
}

// APIサーバーが落ちている、ネットワークが切断されているなどのシステムエラー
class ErrorApiNetwork extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ApiNetworkError';
	}
}

class NavigatorToastApp {
	// 定数・設定
	private readonly api = 'https://script.google.com/macros/s/AKfycbxgSjwMISfA0QyEqSB_TfQExdCoo9o3YLiwly7Csg5yczU1-Da7AFeVsFshgTRNyz274Q/exec';
	private readonly prefix = 'navigator';
	private readonly icon_size = 48;
	private readonly wait_min = 10000;
	private readonly wait_max = 20000;
	private readonly lifecycle = 86400000;

	// 動的パス・キー
	private readonly subdir: string;
	private readonly key_path: string;
	private readonly save_path: string;
	private readonly access_path: string;
	private readonly current_path: string;

	// 状態管理
	private navigator: Record<string, string> | null = null;
	private access: Set<string> = new Set();
	private handle?: number;

	constructor() {
		// サブディレクトリ取得
		this.subdir = ((path) => {
			const array = path.split('/', 2);
			if (array.length === 1 || array[1] === '') return '';
			else return array[1];
		})(location.pathname);

		// localStorageのキー設定
		this.key_path = `${this.subdir}/${this.prefix}`;
		this.save_path = `${this.subdir}/${this.prefix}/save`;
		this.access_path = `${this.subdir}/${this.prefix}/access`;

		// 現在パス
		// this.current_path = location.pathname;
		this.current_path = location.pathname + location.search;	// ソラニワはクエリ文字列で表示ページを分ける構造のため含める
	}

	// 汎用関数
	private bake<K extends keyof HTMLElementTagNameMap>(tagName: K, f: (e: HTMLElementTagNameMap[K]) => void) {
		const e = document.createElement(tagName);
		f(e);
		return e;
	}

	/// データ読み込み
	private async load() {
		const load = localStorage.getItem(this.save_path);
		if (load) {
			const { timestamp, data }: { timestamp: number, data: Record<string, string> } = JSON.parse(load);
			const now = Date.now();
			if (timestamp + this.lifecycle > now) this.navigator = data;
		}

		if (!this.navigator) {
			// 読み込み失敗（期限切れ、または保存されていない）
			const key = localStorage.getItem(this.key_path);
			if (key) {
				// 対象が指定されている
				const query = encodeURIComponent(location.host + '/' + this.subdir + '/' + key);
				let res: Response;
				try {
					res = await fetch(`${this.api}?key=${query}`);
				} catch (err) {
					throw new ErrorApiNetwork('ネットワークエラーが発生しました');
				}
				if (res.ok) {
					if (res.headers.get('Content-Type')?.includes('application/json')) {
						// 成功
						try {
							this.navigator = await res.json();
						} catch (err) {
							throw new ErrorNavigatorNotFound('対象のナビゲーター設定形式が異常です');
						}
						localStorage.setItem(this.save_path, JSON.stringify({ timestamp: Date.now(), data: this.navigator }));
					} else {
						// 指定したものが見つからなかった
						throw new ErrorNavigatorNotFound(await res.text());
					}
				} else {
					// APIエラー
					throw new ErrorApiNetwork(`API通信エラー: ${res.status} ${await res.text()}`);
				}
			}
		}

		if (this.navigator) {
			// ここまでで読み込みが成功している
			const load = localStorage.getItem(this.access_path);
			// SetオブジェクトはそのままJSON化できないため配列を経由する
			this.access = load ? new Set(JSON.parse(load)) : new Set();
		} else {
			throw new ErrorNavigatorNotFound('ナビゲーターが指定されていません');
		}
	}

	/// トースト発火
	private pop(trigger: 'access-first' | 'access' | 'random') {
		if (!this.navigator) return;

		const words = this.navigator[`${this.current_path}?${trigger}`];
		if (words) {
			const array = words.split('\n');
			const word = array[Math.floor(Math.random() * array.length)];
			const pos = word.indexOf('|');
			let icon, body;

			if (pos !== -1) {
				icon = word.substring(0, pos).trim();
				body = word.substring(pos + 1).trim();
			} else {
				body = word.trim();
			}
			this.makeToast(body, icon);
		}
	}

	/// トーストUI生成
	private makeToast(body: string, icon?: string) {
		const container_id = `${this.prefix}-container`;
		let container = document.querySelector<HTMLElement>(`body>#${container_id}`);

		if (!container) {
			container = document.body.appendChild(this.bake('div', e => {
				e.id = container_id;
			}));
			// TODO スタイルシート読み込み等
		}

		container.appendChild(this.bake('div', e => {
			e.classList.add(`${this.prefix}-toast`);
			if (icon) e.appendChild(this.bake('img', img => {
				img.classList.add(`${this.prefix}-icon`);
				img.src = icon;
				img.width = this.icon_size;
				img.height = this.icon_size;
			}));
			e.appendChild(this.bake('p', p => {
				p.classList.add(`${this.prefix}-body`);
				p.innerHTML = body;
			}));
			setTimeout(() => e.remove(), this.wait_min);
		}));
	}

	/// 自動再生の予約
	private reserveNext = () => {
		this.pop('random');
		const wait = Math.random() * (this.wait_max - this.wait_min) + this.wait_min;
		this.handle = window.setTimeout(this.reserveNext, wait);
	}

	/** 起動 */
	public async start() {
		try {
			await this.load();
		} catch (err) {
			if (err instanceof ErrorNavigatorNotFound) console.info('ナビゲーターを読み込んでいません: ', err.message);
			else if (err instanceof ErrorApiNetwork) console.error('ナビゲーターの取得に失敗しました: ', err.message);
			else console.error('予期せぬエラーが発生しました: ', err);
			return;
		}

		// アクセス時
		if (!this.access.has(this.current_path)) {
			// 初アクセス
			this.pop('access-first');
			this.access.add(this.current_path);
			// Setを配列に変換してから保存する
			localStorage.setItem(this.access_path, JSON.stringify(Array.from(this.access)));
		} else {
			// 2回目以降
			this.pop('access');
		}

		// 初回の定期実行予約
		const wait = Math.random() * (this.wait_max - this.wait_min) + this.wait_min;
		this.handle = window.setTimeout(this.reserveNext, wait);
	}

	/** 自動再生（ランダムトースト）を停止する */
	public stop() {
		if (this.handle !== undefined) {
			clearTimeout(this.handle);
			this.handle = undefined;
		}
	}
}