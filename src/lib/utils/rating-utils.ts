import { invoke } from '@tauri-apps/api/core';

/**
 * 画像のRating情報を更新する共通関数
 */
export const updateImageRating = async (imagePath: string, rating: number): Promise<void> => {
	if (!imagePath) {
		console.warn('画像パスが指定されていません');
		return;
	}

	try {
		await invoke('write_exif_image_rating', {
			path: imagePath,
			rating: rating
		});
	} catch (error) {
		console.error('Rating更新に失敗:', error);
		throw error;
	}
};
