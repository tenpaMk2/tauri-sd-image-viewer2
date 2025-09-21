import { path } from '@tauri-apps/api';
import * as fs from '@tauri-apps/plugin-fs';
import { SUPPORTED_IMAGE_EXTS } from './mime-type';

/**
 * ディレクトリから画像ファイル一覧を取得
 * @param directoryPath ディレクトリパス
 * @returns 画像ファイルのフルパス配列（自然順ソート済み）
 */
export const getDirectoryImages = async (directoryPath: string): Promise<string[]> => {
	try {
		const entries = await fs.readDir(directoryPath);
		const imageExtensions = SUPPORTED_IMAGE_EXTS.map((ext) => `.${ext}`);

		const imageEntries = entries.filter(
			(entry) =>
				entry.isFile && imageExtensions.some((ext) => entry.name.toLowerCase().endsWith(ext)),
		);

		const imagePaths = await Promise.all(
			imageEntries
				.sort((a, b) => a.name.localeCompare(b.name, 'ja', { numeric: true }))
				.map(async (entry): Promise<string> => await path.join(directoryPath, entry.name)),
		);

		return imagePaths;
	} catch (error) {
		console.error('Failed to read directory: ' + directoryPath + ' ' + error);
		throw new Error(`Failed to load directory: ${directoryPath}`);
	}
};
