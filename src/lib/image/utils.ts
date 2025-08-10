import { basename, dirname } from '@tauri-apps/api/path';
import { stat } from '@tauri-apps/plugin-fs';
import { unifiedMetadataService } from '../services/unified-metadata-service.svelte';
import type { ImageMetadata } from './types';

/**
 * 基本情報のみを軽量作成（サムネイル用）
 */
export const createBasicImageInfo = async (imagePath: string): Promise<{
	filename: string;
	size: string;
	dimensions: string;
	format: string;
}> => {
	const filename = await basename(imagePath);
	const extension = filename.split('.').pop()?.toUpperCase() || '';

	try {
		const basicInfo = await unifiedMetadataService.getBasicInfo(imagePath);
		const sizeFormatted = formatFileSize(basicInfo.file_size);
		const dimensions =
			basicInfo.width > 0 && basicInfo.height > 0
				? `${basicInfo.width} × ${basicInfo.height}`
				: 'Unknown';

		return {
			filename,
			size: sizeFormatted,
			dimensions,
			format: extension,
		};
	} catch (error) {
		console.warn('基本ファイル情報の取得に失敗:', error);
		return {
			filename,
			size: 'Unknown',
			dimensions: 'Unknown',
			format: extension,
		};
	}
};

/**
 * 画像メタデータを効率的に作成
 */
export const createImageMetadata = async (imagePath: string): Promise<ImageMetadata> => {
	const filename = await basename(imagePath);
	const extension = filename.split('.').pop()?.toUpperCase() || '';

	try {
		// ファイルシステム情報を取得
		const fileStats = await stat(imagePath);
		const created = fileStats.birthtime
			? new Date(fileStats.birthtime).toLocaleString('ja-JP')
			: 'Unknown';
		const modified = fileStats.mtime
			? new Date(fileStats.mtime).toLocaleString('ja-JP')
			: 'Unknown';

		// メタデータのみを効率取得
		const imageInfo = await unifiedMetadataService.getFullMetadata(imagePath);

		const sizeFormatted = formatFileSize(imageInfo.file_size);
		const dimensions =
			imageInfo.width > 0 && imageInfo.height > 0
				? `${imageInfo.width} × ${imageInfo.height}`
				: 'Unknown';

		return {
			filename,
			size: sizeFormatted,
			dimensions,
			format: extension,
			created,
			modified,
			sdParameters: imageInfo.sd_parameters,
			exifInfo: imageInfo.exif_info
		};
	} catch (error) {
		console.warn('ファイル情報の取得に失敗:', error);
		return {
			filename,
			size: 'Unknown',
			dimensions: 'Unknown',
			format: extension,
			created: 'Unknown',
			modified: 'Unknown'
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

export const getDirectoryFromPath = async (path: string): Promise<string> => {
	return await dirname(path);
};

export const isDirectory = async (path: string): Promise<boolean> => {
	try {
		const fileStats = await stat(path);
		return fileStats.isDirectory;
	} catch {
		return false;
	}
};

export const isImageFile = (path: string): boolean => {
	const supportedExtensions = ['png', 'jpg', 'jpeg', 'webp'];
	const extension = path.split('.').pop()?.toLowerCase();
	return extension ? supportedExtensions.includes(extension) : false;
};
