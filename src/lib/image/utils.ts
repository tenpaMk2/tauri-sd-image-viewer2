import { stat } from '@tauri-apps/plugin-fs';
import { loadImageWithMetadata } from './image-loader';
import type { ImageMetadata } from './types';

/**
 * 画像メタデータを効率的に作成（1回のIO操作で済む統合版）
 */
export const createImageMetadata = async (imagePath: string): Promise<ImageMetadata> => {
	const filename = imagePath.split('/').pop() || 'unknown';
	const extension = filename.split('.').pop()?.toUpperCase() || '';

	try {
		// ファイルシステム情報を取得
		const fileStats = await stat(imagePath);
		const created = fileStats.birthtime
			? new Date(fileStats.birthtime).toLocaleString('ja-JP')
			: '不明';
		const modified = fileStats.mtime ? new Date(fileStats.mtime).toLocaleString('ja-JP') : '不明';

		// ハイブリッドアプローチで画像とメタデータを効率取得
		const { imageInfo } = await loadImageWithMetadata(imagePath);
		
		const sizeFormatted = formatFileSize(imageInfo.file_size);
		const dimensions = imageInfo.width > 0 && imageInfo.height > 0 
			? `${imageInfo.width} × ${imageInfo.height}` 
			: '不明';

		return {
			filename,
			size: sizeFormatted,
			dimensions,
			format: extension,
			created,
			modified,
			sdParameters: imageInfo.sd_parameters
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
