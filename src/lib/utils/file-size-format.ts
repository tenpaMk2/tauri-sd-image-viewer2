/**
 * ファイルサイズをバイト単位で表示する（ユーザーのロケールに合わせた桁区切り文字付き）
 * @param bytes ファイルサイズ（バイト）
 * @returns フォーマットされたファイルサイズ文字列
 */
export const formatFileSize = (bytes: number): string => {
	const formatter = new Intl.NumberFormat(undefined, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	});

	return `${formatter.format(bytes)} Byte`;
};
