import { path } from '@tauri-apps/api';
import { stat } from '@tauri-apps/plugin-fs';

const SUPPORTED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

const isImageFile = async (input: string): Promise<boolean> => {
	const extension = (await path.extname(input)).toLocaleLowerCase();
	return SUPPORTED_EXTENSIONS.includes(extension);
};

const isDirectory = async (input: string): Promise<boolean> => {
	try {
		const fileStats = await stat(input);
		return fileStats.isDirectory;
	} catch {
		return false;
	}
};

type DragAndDropResult = {
	kind: 'file' | 'directory';
	path: string;
};

/**
 * ドラッグ&ドロップサービス - ファイルドロップの処理を担当
 */
export const dragAndDropService = {
	/**
	 * ドロップされたパスを処理
	 */
	handleDroppedPaths: async (paths: string[]): Promise<DragAndDropResult | null> => {
		if (paths.length === 0) return null;

		const firstPath = paths[0];

		try {
			if (await isDirectory(firstPath)) {
				return { path: firstPath, kind: 'directory' };
			} else if (await isImageFile(firstPath)) {
				return { path: firstPath, kind: 'file' };
			}
			return null;
		} catch (error) {
			console.error('Error processing dropped path: ' + error);
			return null;
		}
	}
};
