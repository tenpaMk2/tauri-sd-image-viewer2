/**
 * Unix timestampを読みやすい日付文字列に変換
 * @param timestamp Unix timestamp (seconds)
 * @returns フォーマット済み日付文字列 (YYYY-MM-DD hh:mm:ss)
 */
export const formatTimestamp = (timestamp: number): string => {
	const date = new Date(timestamp * 1000); // JavaScript Dateはミリ秒なので*1000

	// Intl.DateTimeFormatでISO 8601形式（YYYY-MM-DD hh:mm:ss）
	const formatter = new Intl.DateTimeFormat('ja-JP', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	});

	// ja-JPロケールは「/」区切りなので「-」に変換
	return formatter.format(date).replace(/\//g, '-');
};

/**
 * Unix timestampを相対時間形式で表示
 * @param timestamp Unix timestamp (seconds)
 * @returns 相対時間文字列 (例: "2 hours ago", "3 days ago")
 */
export const formatRelativeTime = (timestamp: number): string => {
	const now = Date.now() / 1000; // 現在時刻をUnix timestampに変換
	const diffSeconds = now - timestamp;

	if (diffSeconds < 60) {
		return 'Just now';
	} else if (diffSeconds < 3600) {
		const minutes = Math.floor(diffSeconds / 60);
		return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
	} else if (diffSeconds < 86400) {
		const hours = Math.floor(diffSeconds / 3600);
		return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
	} else if (diffSeconds < 2592000) {
		const days = Math.floor(diffSeconds / 86400);
		return `${days} ${days === 1 ? 'day' : 'days'} ago`;
	} else {
		// 1ヶ月以上古い場合は通常の日付表示
		return formatTimestamp(timestamp);
	}
};
