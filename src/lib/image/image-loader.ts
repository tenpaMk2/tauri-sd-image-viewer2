import { readDir, readFile } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { detectImageMimeType, SUPPORTED_IMAGE_EXTS } from './mime-type';
import type { ImageData, MimeType } from './types';

/**
 * ディレクトリ内の画像ファイル一覧を取得
 */
export const getImageFiles = async (directoryPath: string): Promise<string[]> => {
	try {
		console.log('ディレクトリ読み込み:', directoryPath);
		const entries = await readDir(directoryPath);
		console.log('ディレクトリエントリ数:', entries.length);

		const imageExtensions = SUPPORTED_IMAGE_EXTS.map((ext) => `.${ext}`);
		const imageEntries = entries.filter(
			(entry) =>
				entry.isFile && imageExtensions.some((ext) => entry.name.toLowerCase().endsWith(ext))
		);

		// path.joinを使って正しいパスを構築
		const imageFiles = await Promise.all(
			imageEntries
				.sort((a, b) => a.name.localeCompare(b.name, 'ja', { numeric: true }))
				.map(async (entry): Promise<string> => await join(directoryPath, entry.name))
		);

		console.log('画像ファイル一覧:', imageFiles);
		return imageFiles;
	} catch (error) {
		console.error('ディレクトリの読み込みに失敗しました:', directoryPath, error);
		throw new Error(`ディレクトリの読み込みに失敗しました: ${directoryPath}`);
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
			throw new Error(`サポートされていない画像形式: ${filePath}`);
		}
		const mimeType: MimeType = detectedMimeType;

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
