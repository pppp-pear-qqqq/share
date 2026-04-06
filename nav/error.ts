// APIの通信自体は成功したが、対象のデータが存在しなかった（またはローカルに設定がない）場合のエラー
export class ErrorNavigatorNotFound extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'NavigatorNotFoundError';
	}
}

// APIサーバーが落ちている、ネットワークが切断されているなどのシステムエラー
export class ErrorApiNetwork extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ApiNetworkError';
	}
}
