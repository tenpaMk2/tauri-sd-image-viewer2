import { stat } from '@tauri-apps/plugin-fs';
import type { ImageMetadata } from './types';

export const createImageMetadata = async (imagePath: string): Promise<ImageMetadata> => {
	const filename = imagePath.split('/').pop() || 'unknown';
	const extension = filename.split('.').pop()?.toUpperCase() || '';

	try {
		const fileStats = await stat(imagePath);
		const fileSizeBytes = fileStats.size;
		const sizeFormatted = formatFileSize(fileSizeBytes);
		const created = fileStats.birthtime
			? new Date(fileStats.birthtime).toLocaleString('ja-JP')
			: '不明';
		const modified = fileStats.mtime ? new Date(fileStats.mtime).toLocaleString('ja-JP') : '不明';

		return {
			filename,
			size: sizeFormatted,
			dimensions: '不明', // 画像の実際の解像度は別途取得が必要
			format: extension,
			created,
			modified
		};
	} catch (error) {
		console.warn('ファイル情報の取得に失敗:', error);
		return {
			filename,
			size: '不明',
			dimensions: '不明',
			format: extension,
			created: '不明',
			modified: '不明'
		};
	}
};

const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return '0 B';

	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const getDirectoryFromPath = (path: string): string => {
	return path.substring(0, path.lastIndexOf('/'));
};
