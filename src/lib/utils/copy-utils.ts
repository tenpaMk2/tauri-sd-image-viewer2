import { invoke } from '@tauri-apps/api/core';

/**
 * クリップボードにテキストをコピーする共通関数
 */
export const copyToClipboard = async (text: string): Promise<void> => {
	try {
		await navigator.clipboard.writeText(text);
	} catch (error) {
		console.error('クリップボードへのコピーに失敗: ' + error);
		throw error;
	}
};

/**
 * クリップボードにファイルをコピーする共通関数
 */
export const copyFileToClipboard = async (paths: string[]): Promise<void> => {
	try {
		await invoke('set_clipboard_files', { paths });
	} catch (error) {
		console.error('Failed to copy files to clipboard: ' + error);
		throw error;
	}
};
