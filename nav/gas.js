function doGet(e) {
	// リクエストのクエリパラメータから 'key' を取得 (?key=検索文字)
	const key = e.parameter.key;

	// キーワードが指定されていない場合のエラーハンドリング
	if (!key) {
		return ContentService.createTextOutput("キーが指定されていません").setMimeType(ContentService.MimeType.TEXT);
	}

	// スプレッドシートを取得
	const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("db");

	// 検索
	const textFinder = sheet.getRange("A:A").createTextFinder(key).matchEntireCell(true);
	const match = textFinder.findNext(); // 最初の一致するセルを取得

	// 見つからなかった場合
	if (!match) {
		return ContentService.createTextOutput("対応するデータがありません").setMimeType(ContentService.MimeType.TEXT);
	}

	// 見つかった場合、そのセルの行番号を取得し、同じ行の値（2列目）を取得
	const rowIndex = match.getRow();
	const result = sheet.getRange(rowIndex, 2).getValue();

	// 結果をJSON形式で返す
	return ContentService.createTextOutput(result).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
	// 引数を取得
	let key, value, password;
	try {
		if (e.postData && e.postData.type === "application/json") {
			const requestData = JSON.parse(e.postData.contents);
			key = requestData.key;
			value = requestData.value;
			password = requestData.password;
		} else {
			key = e.parameter.key;
			value = e.parameter.value;
			password = e.parameter.password;
		}
	} catch (err) {
		return ContentService.createTextOutput("データ形式が不正です").setMimeType(ContentService.MimeType.TEXT);
	}

	// キーや値がない場合は処理を中断
	if (!key || !value || !password) {
		return ContentService.createTextOutput("キー, 値, パスワードのいずれかが不足しています").setMimeType(ContentService.MimeType.TEXT);
	}

	// パスワードハッシュ化
	const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(password));
	const hashedPassword = rawHash.map(function (byte) {
		return ('0' + (byte & 0xFF).toString(16)).slice(-2);
	}).join('');

	// スプレッドシートを取得
	const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("db");

	// 検索
	const textFinder = sheet.getRange("A:A").createTextFinder(key).matchEntireCell(true);
	const match = textFinder.findNext(); // 最初の一致するセルを取得

	if (match) {
		// 見つかった場合、そのセルの行番号を取得し、同じ行のパスワード（3列目）を取得
		const rowIndex = match.getRow();
		const savedPassword = sheet.getRange(rowIndex, 3).getValue();

		// パスワード一致検証
		if (hashedPassword === String(savedPassword)) {
			// 更新
			sheet.getRange(rowIndex, 1, 1, 2).setValues([[key, value]]);
		} else {
			return ContentService.createTextOutput("キーまたはパスワードが正しくありません").setMimeType(ContentService.MimeType.TEXT);
		}
	} else {
		// 見つからなければ新規作成
		sheet.appendRow([key, value, hashedPassword]);
	}

	// 完了レスポンスを返す
	return ContentService.createTextOutput("Ok").setMimeType(ContentService.MimeType.TEXT);
}