/**
 * 画像削除ユーティリティ
 */

export const deleteSelectedImages = async (
	selectedImages: Set<string>
): Promise<{
	successCount: number;
	errorCount: number;
	errors: string[];
}> => {
	if (selectedImages.size === 0) {
		return { successCount: 0, errorCount: 0, errors: [] };
	}

	const confirmDelete = confirm(
		`${selectedImages.size}個の画像を削除しますか？\n\n削除された画像は復元できません。`
	);
	if (!confirmDelete) {
		return { successCount: 0, errorCount: 0, errors: [] };
	}

	try {
		const { remove } = await import('@tauri-apps/plugin-fs');

		console.log('削除開始:', Array.from(selectedImages));

		let successCount = 0;
		let errorCount = 0;
		const errors: string[] = [];

		for (const imagePath of selectedImages) {
			try {
				await remove(imagePath);
				successCount++;
				console.log(`削除成功: ${imagePath}`);
			} catch (fileErr) {
				errorCount++;
				const errorMsg = `${imagePath}: ${fileErr}`;
				errors.push(errorMsg);
				console.error(`削除失敗: ${errorMsg}`);
			}
		}

		// エラーがある場合のみユーザーに通知
		if (0 < errorCount) {
			alert(
				`削除完了: ${successCount}個成功, ${errorCount}個失敗\n\n失敗したファイル:\n${errors.slice(0, 5).join('\n')}${5 < errors.length ? '\n...' : ''}`
			);
		} else {
			console.log(`${successCount}個の画像を削除しました。`);
		}

		return { successCount, errorCount, errors };
	} catch (err) {
		console.error('削除処理エラー:', err);
		alert(`削除処理に失敗しました: ${err}`);
		throw err;
	}
};
