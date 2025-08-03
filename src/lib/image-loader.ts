import { readDir, readFile } from '@tauri-apps/plugin-fs';
import { detectImageMimeType, type MimeType } from './mime-type';

export type ImageData = {
	url: string;
	mimeType: MimeType;
	filePath: string;
};

/**
 * 同一ディレクトリ内の画像ファイル一覧を取得
 */
export const getImageFiles = async (imagePath: string): Promise<string[]> => {
	try {
		const dirname = imagePath.substring(0, imagePath.lastIndexOf('/'));
		const entries = await readDir(dirname);

		const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
		const imageFiles = entries
			.filter(
				(entry) =>
					entry.isFile && imageExtensions.some((ext) => entry.name.toLowerCase().endsWith(ext))
			)
			.map((entry) => `${dirname}/${entry.name}`)
			.sort((a, b) => a.localeCompare(b, 'ja', { numeric: true }));

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

		const blob = new Blob([imageData], { type: mimeType });
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
