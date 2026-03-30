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

type NavigatorToasterOptions = {
	api: string,
	is_subdir: boolean,
	is_query_page: boolean,
	auto_remove: number,
	random_wait_min: number,
	random_wait_max: number,
	lifecycle: number,
}

class NavigatorToaster {
	// 定数・設定
	private readonly prefix = 'navigator';
	private readonly api: string;
	private readonly auto_remove: number;
	private readonly random_wait_min: number;
	private readonly random_wait_max: number;
	private readonly lifecycle: number;

	// 動的パス・キー
	private readonly key_path: string;
	private readonly save_path: string;
	private readonly access_path: string;
	private readonly current_path: string;

	// 状態管理
	private navigator: Record<string, string[]> | null = null;
	private access: Set<string> = new Set();
	private handle?: number;

	constructor({ api, is_subdir, is_query_page, auto_remove = 8000, random_wait_min = 10000, random_wait_max = 20000, lifecycle = 86400000 }: NavigatorToasterOptions) {
		// 定数反映
		this.api = api;
		this.auto_remove = auto_remove;
		this.random_wait_min = random_wait_min;
		this.random_wait_max = random_wait_max;
		this.lifecycle = lifecycle;

		// localStorageのキー設定
		if (is_subdir) {
			// サブディレクトリ取得
			const subdir = ((path) => {
				const array = path.split('/', 2);
				if (array.length === 1 || array[1] === '') return '';
				else return array[1];
			})(location.pathname);
			this.key_path = `${subdir}/${this.prefix}`;
			this.save_path = `${subdir}/${this.prefix}/save`;
			this.access_path = `${subdir}/${this.prefix}/access`;
		} else {
			this.key_path = `${this.prefix}`;
			this.save_path = `${this.prefix}/save`;
			this.access_path = `${this.prefix}/access`;
		}

		// 現在パス
		if (is_query_page) {
			// クエリ文字列で表示ページを分ける構造の場合
			this.current_path = location.pathname + location.search;
		} else {
			this.current_path = location.pathname;
		}
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
			const { timestamp, data }: { timestamp: number, data: Record<string, string[]> } = JSON.parse(load);
			const now = Date.now();
			if (timestamp + this.lifecycle > now) this.navigator = data;
		}

		if (this.navigator === null) {
			// 読み込み失敗（期限切れ、または保存されていない）
			const key = localStorage.getItem(this.key_path);
			if (key) {
				// 対象が指定されている
				const query = encodeURIComponent(key);
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

		if (this.navigator !== null) {
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
		if (this.navigator === null) return;

		const words = this.navigator[`${this.current_path}?${trigger}`];
		if (words) {
			const word = words[Math.floor(Math.random() * words.length)];
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
		}

		container.appendChild(this.bake('div', e => {
			e.classList.add(`${this.prefix}-toast`);
			if (icon) e.appendChild(this.bake('img', img => {
				img.classList.add(`${this.prefix}-icon`);
				img.src = icon;
			}));
			e.appendChild(this.bake('p', p => {
				p.classList.add(`${this.prefix}-body`);
				p.innerHTML = body;
			}));
			e.addEventListener('click', () => e.remove());
			setTimeout(() => e.remove(), this.auto_remove);
		}));
	}

	/// 自動再生の予約
	private reserveNext = () => {
		this.pop('random');
		const wait = Math.random() * (this.random_wait_max - this.random_wait_min) + this.random_wait_min;
		this.handle = window.setTimeout(this.reserveNext, wait);
	}

	/** 起動 */
	public async start() {
		try {
			await this.load();
		} catch (err) {
			if (err instanceof ErrorNavigatorNotFound) console.info('ナビゲーターを読み込んでいません\n', err.message);
			else if (err instanceof ErrorApiNetwork) console.error('ナビゲーターの取得に失敗しました\n', err.message);
			else console.error('予期せぬエラーが発生しました\n', err);
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
		const wait = Math.random() * (this.random_wait_max - this.random_wait_min) + this.random_wait_min;
		this.handle = window.setTimeout(this.reserveNext, wait);
	}

	/** 自動再生（ランダムトースト）を停止する */
	public stop() {
		if (this.handle !== undefined) {
			clearTimeout(this.handle);
			this.handle = undefined;
		}
	}

	public set_navigator() {

	}
}
