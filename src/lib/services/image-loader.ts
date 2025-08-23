import { detectImageMimeType, SUPPORTED_IMAGE_EXTS, type MimeType } from '$lib/services/mime-type';
import { join } from '@tauri-apps/api/path';
import { readDir, readFile } from '@tauri-apps/plugin-fs';

export type ImageData = {
	url: string;
	mimeType: MimeType;
	filePath: string;
};

/**
 * ディレクトリ内の画像ファイル一覧を取得
 */
export const getImageFiles = async (directoryPath: string): Promise<string[]> => {
	try {
		console.log('Reading directory: ' + directoryPath);
		const entries = await readDir(directoryPath);
		console.log('Directory entry count: ' + entries.length);

		const imageExtensions = SUPPORTED_IMAGE_EXTS.map((ext) => `.${ext}`);
		const imageEntries = entries.filter(
			(entry) =>
				entry.isFile && imageExtensions.some((ext) => entry.name.toLowerCase().endsWith(ext)),
		);
		console.log('Filtered image entries count:', imageEntries.length);

		// path.joinを使って正しいパスを構築
		const imageFiles = await Promise.all(
			imageEntries
				.sort((a, b) => a.name.localeCompare(b.name, 'ja', { numeric: true }))
				.map(async (entry): Promise<string> => await join(directoryPath, entry.name)),
		);

		console.log('Image file list completed: ' + imageFiles.length + ' files');
		return imageFiles;
	} catch (error) {
		console.error('Failed to read directory: ' + directoryPath + ' Error:', error);
		throw new Error(`Failed to load directory: ${directoryPath}. Original error: ${error}`);
	}
};

/**
 * 画像ファイルを読み込み、Blob URLを作成
 */
export const loadImage = async (filePath: string): Promise<ImageData> => {
	try {
		const imageData = await readFile(filePath);
		const detectedMimeType = await detectImageMimeType(filePath);
		if (!detectedMimeType) {
			throw new Error(`Unsupported image format: ${filePath}`);
		}
		const mimeType: MimeType = detectedMimeType;

		const blob = new Blob([new Uint8Array(imageData)], { type: mimeType });
		const url = URL.createObjectURL(blob);

		return {
			url,
			mimeType,
			filePath,
		};
	} catch (error) {
		console.error('Failed to load image: ' + error);
		throw new Error(`Failed to load image: ${filePath}`);
	}
};
