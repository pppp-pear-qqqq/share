const ContentService: any = 0;
const SpreadsheetApp: any = 0;

function doGet(e: any) {
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

	// 見つかった場合、そのセルの「行番号」を取得し、同じ行のB列（2列目）の値を取得
	const rowIndex = match.getRow();
	const result = sheet.getRange(rowIndex, 2).getValue();

	// 結果をJSON形式で返す
	return ContentService.createTextOutput(result).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e: any) {
	// 引数を取得
	let key, value;
	if (e.postData && e.postData.type === "application/json") {
		// Json
		const requestData = JSON.parse(e.postData.contents);
		key = requestData.key;
		value = requestData.value;
	} else {
		// Form
		key = e.parameter.key;
		value = e.parameter.value;
	}

	// キーや値がない場合は処理を中断
	if (!key || !value) {
		return ContentService.createTextOutput("キーまたは値が不足しています").setMimeType(ContentService.MimeType.TEXT);
	}

	// スプレッドシートを取得して行を追加
	const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("db");
	sheet.appendRow([key, value]);

	// 完了レスポンスを返す
	return ContentService.createTextOutput("Ok").setMimeType(ContentService.MimeType.TEXT);
}