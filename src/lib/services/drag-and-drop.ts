import { SUPPORTED_IMAGE_EXTS } from '$lib/services/mime-type';
import { path } from '@tauri-apps/api';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { stat } from '@tauri-apps/plugin-fs';

const isImageFile = async (input: string): Promise<boolean> => {
	const extension = (await path.extname(input)).toLowerCase().replace('.', '');
	return (SUPPORTED_IMAGE_EXTS as readonly string[]).includes(extension);
};

const isDirectory = async (input: string): Promise<boolean> => {
	try {
		const fileStats = await stat(input);
		return fileStats.isDirectory;
	} catch {
		return false;
	}
};

export type DragAndDropResult = {
	kind: 'file' | 'directory';
	path: string;
};

type DragDropHandler = (result: DragAndDropResult) => void;

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
	},

	/**
	 * Tauriドラッグ&ドロップイベントリスナーを設定
	 */
	setupDragDropListener: async (onDrop: DragDropHandler): Promise<() => void> => {
		console.log('Setting up drag & drop listener');

		const webview = getCurrentWebview();
		const unlisten = await webview.onDragDropEvent(async (event) => {
			console.log('Drag drop event:', event);

			if (event.payload.type !== 'drop' || (event.payload.paths ?? []).length === 0) {
				return;
			}

			console.log('Files dropped:', event.payload.paths);

			const result = await dragAndDropService.handleDroppedPaths(event.payload.paths);
			if (result) {
				onDrop(result);
			} else {
				console.log('Dropped item is not a supported file or directory');
			}
		});

		return unlisten;
	},
};
