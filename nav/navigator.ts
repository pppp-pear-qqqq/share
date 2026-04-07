import { ErrorApiNetwork, ErrorNavigatorNotFound } from './error.ts';
import { bake } from './utils.ts';

interface UserNavigatorOptions {
	db_api: string,
	is_subdir: boolean,
	is_query_page: boolean,
	is_replace_toast: boolean,
	duration: number,
	min_interval: number,
	max_interval: number,
	cache_ttl: number,
	close_handler: (e: HTMLElement) => void,
}

type Trigger = { path: string, type: string, hour?: number[], week?: number[] }
type Dict = { trigger: Trigger; word: string[] }[];

class UserNavigator {
	// インスタンス
	public static instance: UserNavigator;
	// 定数・設定
	private readonly prefix = 'navigator';
	private readonly db_api: string;
	private readonly is_replace_toast: boolean;
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
	private dict: Dict | null = null;
	private click_list: string[] = [];
	private visited: Set<string> = new Set();
	private handle?: ReturnType<typeof setTimeout>;

	constructor({ db_api, is_subdir, is_query_page, is_replace_toast = true, duration = 0, min_interval = 10000, max_interval = 20000, cache_ttl = 86400000, close_handler = (e) => e.remove() }: UserNavigatorOptions) {
		// 定数反映
		this.db_api = db_api;
		this.is_replace_toast = is_replace_toast;
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

		UserNavigator.instance = this;
	}

	/// データ読み込み
	private async load() {
		const load = localStorage.getItem(this.dict_key);
		if (load) {
			const { timestamp, dict }: { timestamp: number, dict: Dict } = JSON.parse(load);
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
					res = await fetch(`${this.db_api}?key=${query}`);
				} catch (err) {
					throw new ErrorApiNetwork('ネットワークエラーが発生しました');
				}
				if (!res.ok) throw new ErrorApiNetwork(`API通信エラー: ${res.status} ${await res.text()}`);	// APIエラー
				if (!res.headers.get('Content-Type')?.includes('application/json')) throw new ErrorNavigatorNotFound(await res.text());	// 指定したものが見つからなかった
				// 成功
				try {
					this.dict = await res.json();
				} catch (err) {
					throw new ErrorNavigatorNotFound('対象のナビゲーター設定形式が異常です');
				}
				localStorage.setItem(this.dict_key, JSON.stringify({ timestamp: Date.now(), dict: this.dict }));
			}
		}

		if (this.dict === null) throw new ErrorNavigatorNotFound('ナビゲーターが指定されていません');

		// クリック反応要素をリストアップ
		this.click_list = [...new Set(this.dict
			.filter((item) => item.trigger.type.startsWith('click'))
			.map((item) => item.trigger.type.substring('click'.length))
		)];

		const visited = localStorage.getItem(this.visited_key);
		// SetオブジェクトはそのままJSON化できないため配列を経由する
		this.visited = visited ? new Set(JSON.parse(visited)) : new Set();
	}

	private get_word(...conditions: ((trigger: Trigger) => boolean)[]) {
		const words = this.dict?.find((item) => conditions.every((c) => c(item.trigger)))?.word;
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
			return { body, icon };
		}
	}

	/// DOM生成
	private make_dom(body: string, icon?: string) {
		const container_id = `${this.prefix}-container`;
		let container = document.querySelector<HTMLElement>(`body>#${container_id}`);

		if (!container) {
			container = document.body.appendChild(bake('div', e => {
				e.id = container_id;
			}));
		}
		if (this.is_replace_toast) container.replaceChildren();
		container.appendChild(bake('div', e => {
			e.classList.add(`${this.prefix}-toast`);
			if (icon) e.appendChild(bake('img', img => {
				img.classList.add(`${this.prefix}-icon`);
				img.src = icon;
			}));
			e.appendChild(bake('p', p => {
				p.classList.add(`${this.prefix}-body`);
				p.innerHTML = body;
			}));
			e.addEventListener('click', () => this.close_handler(e));
			if (this.duration > 0) setTimeout(() => this.close_handler(e), this.duration);
		}));
	}

	/// 自動再生の予約
	private reserve_next = () => {
		this.talk('random');
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
			this.talk('access-first');
			this.visited.add(this.current_path);
			// Setを配列に変換してから保存する
			localStorage.setItem(this.visited_key, JSON.stringify(Array.from(this.visited)));
		} else {
			// 2回目以降
			this.talk('access');
		}

		// 初回の定期実行予約
		const wait = Math.random() * (this.max_interval - this.min_interval) + this.min_interval;
		this.handle = window.setTimeout(this.reserve_next, wait);
	}

	/** トーストを表示する */
	public talk(type: string) {
		let type_cond;
		switch (type) {
			case 'access-first':
				type_cond = (item: Trigger) => item.type === 'access-first' || item.type === 'access' || item.type === 'random';
				break;
			case 'access':
				type_cond = (item: Trigger) => item.type === 'access' || item.type === 'random';
				break;
			case 'random':
				type_cond = (item: Trigger) => item.type === 'random';
				break;
			// case 'toast-success':
			// 	type_condition = (item: Trigger) => item.type === 'toast-success' || item.type === 'toast';
			// 	break;
			// case 'toast-error':
			// 	type_condition = (item: Trigger) => item.type === 'toast-error' || item.type === 'toast';
			// 	break;
			// case 'toast':
			// 	type_condition = (item: Trigger) => item.type === 'toast';
			// 	break;
			case 'disable':
				return;
			default:
				type_cond = (item: Trigger) => item.type === type;
		}

		const path_cond = (item: Trigger) => item.path === this.current_path || item.path === '*';

		const date = new Date();
		const hour = date.getHours();
		const hour_cond = (item: Trigger) => {
			if (!item.hour) return true;
			const [start, end] = item.hour;
			return start <= end
				? (start <= hour && hour <= end)
				: (start <= hour || hour <= end)
		};
		const week = date.getDay();
		const week_cond = (item: Trigger) => {
			if (!item.week) return true;
			return item.week.includes(week);
		};

		const word = this.get_word(path_cond, type_cond, hour_cond, week_cond);
		if (word) this.make_dom(word.body, word.icon);
	}

	/** クリック時条件を検索してtalk実行 */
	public talk_by_click(event: Event) {
		const item = this.click_list.find((item) => (event.target as HTMLElement | null)?.closest(item));
		if (item) this.talk(`click${item}`);
	}

	/** 自動再生の停止 */
	public stop() {
		if (this.handle !== undefined) {
			clearTimeout(this.handle);
			this.handle = undefined;
		}
	}

	public get has_click_list() {
		return this.click_list.length > 0;
	}
}

document.addEventListener('DOMContentLoaded', () => {
	setTimeout(() => {
		const nav = UserNavigator.instance;
		if (nav && nav.has_click_list) document.body.addEventListener('click', (ev) => nav.talk_by_click(ev));
	}, 1000);
});
