import { invoke } from '@tauri-apps/api/core';
import * as fs from '@tauri-apps/plugin-fs';

export const copyImagesToClipboard = async (
	imagePaths: string[],
	onSuccess?: (message: string) => void,
	onError?: (message: string) => void,
): Promise<void> => {
	if (imagePaths.length === 0) return;

	try {
		await invoke('set_clipboard_files', { paths: imagePaths });
		onSuccess?.(`${imagePaths.length} images copied to clipboard`);
	} catch (error) {
		console.error('Failed to copy to clipboard: ' + error);
		onError?.('Failed to copy to clipboard');
	}
};

export const deleteImages = async (
	imagePaths: string[],
	onConfirm?: (count: number) => Promise<boolean>,
	onSuccess?: (message: string) => void,
	onWarning?: (message: string) => void,
	onError?: (message: string) => void,
): Promise<boolean> => {
	if (imagePaths.length === 0) return false;

	// 確認処理を外部に委譲
	const shouldDelete = onConfirm ? await onConfirm(imagePaths.length) : true;

	if (!shouldDelete) {
		return false; // キャンセルされた場合は選択クリア不要
	}

	try {
		console.log('Starting deletion: ' + JSON.stringify(imagePaths));

		let successCount = 0;
		let errorCount = 0;
		const errors: string[] = [];

		for (const imagePath of imagePaths) {
			try {
				await fs.remove(imagePath);
				successCount++;
				console.log(`Deletion successful: ${imagePath}`);
			} catch (fileErr) {
				errorCount++;
				const errorMsg = `${imagePath}: ${fileErr}`;
				errors.push(errorMsg);
				console.error(`Deletion failed: ${errorMsg}`);
			}
		}

		// 結果に応じて適切な通知
		if (errorCount === 0) {
			onSuccess?.(`${successCount} images deleted successfully`);
		} else if (successCount > 0) {
			onWarning?.(`${successCount} deleted, ${errorCount} failed`);
		} else {
			onError?.(`Failed to delete ${errorCount} images`);
		}

		return true; // 削除処理を実行したので選択クリアが必要
	} catch (err) {
		console.error('Deletion process error: ' + err);
		onError?.(`Deletion process failed: ${err}`);
		return false; // エラーの場合は選択クリア不要
	}
};

export const clearThumbnailCache = async (
	onSuccess?: (message: string) => void,
	onError?: (message: string) => void,
	onComplete?: () => void,
): Promise<void> => {
	try {
		const resultMessage: string = await invoke('clear_thumbnail_cache');
		onSuccess?.(resultMessage);
		onComplete?.();
	} catch (error) {
		console.error('Failed to clear thumbnail cache: ' + error);
		onError?.(error as string);
	}
};

export const clearMetadataCache = async (
	onSuccess?: (message: string) => void,
	onError?: (message: string) => void,
	onComplete?: () => void,
): Promise<void> => {
	try {
		const resultMessage: string = await invoke('clear_metadata_cache');
		onSuccess?.(resultMessage);
		onComplete?.();
	} catch (error) {
		console.error('Failed to clear metadata cache: ' + error);
		onError?.(error as string);
	}
};
