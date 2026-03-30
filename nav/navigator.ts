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
	api_url: string,
	is_subdir: boolean,
	is_query_page: boolean,
	duration: number,
	min_interval: number,
	max_interval: number,
	cache_ttl: number,
	close_handler: (e: HTMLElement) => void,
}

class NavigatorToaster {
	// 定数・設定
	private readonly prefix = 'navigator';
	private readonly api_url: string;
	private readonly duration: number;
	private readonly min_interval: number;
	private readonly max_interval: number;
	private readonly cache_ttl: number;
	private readonly close_handler: (e: HTMLElement) => void;

	// 動的パス・キー
	private readonly target_key: string;
	private readonly dict_key: string;
	private readonly visited_key: string;
	private readonly current_path: string;

	// 状態管理
	private dict: Record<string, string[]> | null = null;
	private visited: Set<string> = new Set();
	private handle?: number;

	constructor({ api_url, is_subdir, is_query_page, duration = 8000, min_interval = 10000, max_interval = 20000, cache_ttl = 86400000, close_handler = (e) => e.remove() }: NavigatorToasterOptions) {
		// 定数反映
		this.api_url = api_url;
		this.duration = duration;
		this.min_interval = min_interval;
		this.max_interval = max_interval;
		this.cache_ttl = cache_ttl;
		this.close_handler = close_handler;

		// localStorageのキー設定
		if (is_subdir) {
			// サブディレクトリ取得
			const subdir = ((path) => {
				const array = path.split('/', 2);
				if (array.length === 1 || array[1] === '') return '';
				else return array[1];
			})(location.pathname);
			this.target_key = `${subdir}/${this.prefix}`;
			this.dict_key = `${subdir}/${this.prefix}/save`;
			this.visited_key = `${subdir}/${this.prefix}/access`;
		} else {
			this.target_key = `${this.prefix}`;
			this.dict_key = `${this.prefix}/save`;
			this.visited_key = `${this.prefix}/access`;
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
		const load = localStorage.getItem(this.dict_key);
		if (load) {
			const { timestamp, dict }: { timestamp: number, dict: Record<string, string[]> } = JSON.parse(load);
			const now = Date.now();
			if (timestamp + this.cache_ttl > now) this.dict = dict;
		}

		if (this.dict === null) {
			// 読み込み失敗（期限切れ、または保存されていない）
			const key = localStorage.getItem(this.target_key);
			if (key) {
				// 対象が指定されている
				const query = encodeURIComponent(key);
				let res: Response;
				try {
					res = await fetch(`${this.api_url}?key=${query}`);
				} catch (err) {
					throw new ErrorApiNetwork('ネットワークエラーが発生しました');
				}
				if (res.ok) {
					if (res.headers.get('Content-Type')?.includes('application/json')) {
						// 成功
						try {
							this.dict = await res.json();
						} catch (err) {
							throw new ErrorNavigatorNotFound('対象のナビゲーター設定形式が異常です');
						}
						localStorage.setItem(this.dict_key, JSON.stringify({ timestamp: Date.now(), dict: this.dict }));
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

		if (this.dict !== null) {
			// ここまでで読み込みが成功している
			const load = localStorage.getItem(this.visited_key);
			// SetオブジェクトはそのままJSON化できないため配列を経由する
			this.visited = load ? new Set(JSON.parse(load)) : new Set();
		} else {
			throw new ErrorNavigatorNotFound('ナビゲーターが指定されていません');
		}
	}

	/// トースト発火
	private pop(trigger: 'access-first' | 'access' | 'random') {
		if (this.dict === null) return;

		const words = this.dict[`${this.current_path}?${trigger}`];
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
			this.make_toast(body, icon);
		}
	}

	/// トーストUI生成
	private make_toast(body: string, icon?: string) {
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
			e.addEventListener('click', () => this.close_handler(e));
			if (this.duration > 0) setTimeout(() => this.close_handler(e), this.duration);
		}));
	}

	/// 自動再生の予約
	private reserve_next = () => {
		this.pop('random');
		const wait = Math.random() * (this.max_interval - this.min_interval) + this.min_interval;
		this.handle = window.setTimeout(this.reserve_next, wait);
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
		if (!this.visited.has(this.current_path)) {
			// 初アクセス
			this.pop('access-first');
			this.visited.add(this.current_path);
			// Setを配列に変換してから保存する
			localStorage.setItem(this.visited_key, JSON.stringify(Array.from(this.visited)));
		} else {
			// 2回目以降
			this.pop('access');
		}

		// 初回の定期実行予約
		const wait = Math.random() * (this.max_interval - this.min_interval) + this.min_interval;
		this.handle = window.setTimeout(this.reserve_next, wait);
	}

	/** 自動再生（ランダムトースト）を停止する */
	public stop() {
		if (this.handle !== undefined) {
			clearTimeout(this.handle);
			this.handle = undefined;
		}
	}
}
