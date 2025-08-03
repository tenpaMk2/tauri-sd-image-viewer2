import { readDir, readFile } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { detectImageMimeType, type MimeType } from './mime-type';

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
		console.log('ディレクトリ読み込み:', directoryPath);
		const entries = await readDir(directoryPath);
		console.log('ディレクトリエントリ数:', entries.length);

		const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.avif'];
		const imageEntries = entries.filter(
			(entry) =>
				entry.isFile && imageExtensions.some((ext) => entry.name.toLowerCase().endsWith(ext))
		);

		// path.joinを使って正しいパスを構築
		const imageFiles = await Promise.all(
			imageEntries
				.sort((a, b) => a.name.localeCompare(b.name, 'ja', { numeric: true }))
				.map(async (entry) => await join(directoryPath, entry.name))
		);

		console.log('画像ファイル一覧:', imageFiles);
		return imageFiles;
	} catch (error) {
		console.error('Failed to read directory:', error);
		return [];
	}
};

/**
 * 画像ファイルを読み込み、Blob URLを作成
 */
export const loadImage = async (filePath: string): Promise<ImageData> => {
	try {
		const imageData = await readFile(filePath);
		const mimeType: MimeType = (await detectImageMimeType(filePath)) ?? 'image/jpeg';

		const blob = new Blob([new Uint8Array(imageData)], { type: mimeType });
		const url = URL.createObjectURL(blob);

		return {
			url,
			mimeType,
			filePath
		};
	} catch (error) {
		console.error('Failed to load image:', error);
		throw new Error(`画像の読み込みに失敗しました: ${filePath}`);
	}
};
