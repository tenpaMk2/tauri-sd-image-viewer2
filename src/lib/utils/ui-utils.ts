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

/**
 * ファイルサイズを人間に読みやすい形式にフォーマット
 */
export const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return '0 B';

	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * 日時を人間に読みやすい形式にフォーマット
 */
export const formatDateTime = (dateString: string): string => {
	try {
		const date = new Date(dateString);
		return date.toLocaleString('ja-JP', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	} catch (error) {
		return dateString; // フォーマットに失敗した場合は元の文字列を返す
	}
};

/**
 * 条件付きクラス名の結合
 */
export const classNames = (...classes: (string | undefined | null | false)[]): string => {
	return classes.filter(Boolean).join(' ');
};
