/**
 * クリップボードにテキストをコピーする共通関数
 */
export const copyToClipboard = async (text: string): Promise<void> => {
	try {
		await navigator.clipboard.writeText(text);
	} catch (error) {
		console.error('クリップボードへのコピーに失敗: ' + error);
		throw error;
	}
};
