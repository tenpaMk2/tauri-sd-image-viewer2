import { toastStore } from '$lib/components/ui/toast-store.svelte';
import { invoke } from '@tauri-apps/api/core';

/**
 * クリップボードにテキストをコピーする共通関数
 */
export const copyText = async (text: string): Promise<void> => {
	try {
		await navigator.clipboard.writeText(text);
		console.log('Succeeded to copy text to clipboard:', text);
		toastStore.actions.showSuccessToast('Succeeded to copy text to clipboard');
	} catch (error) {
		console.error('Failed to copy text to clipboard: ', error);
		toastStore.actions.showErrorToast('Failed to copy text to clipboard');
		throw error;
	}
};

/**
 * クリップボードに複数ファイルをコピーする共通関数
 */
export const copyFiles = async (paths: string[]): Promise<void> => {
	try {
		await invoke('set_clipboard_files', { paths });

		console.log('Succeeded to copy files to clipboard:', paths);
		toastStore.actions.showSuccessToast('Succeeded to copy files to clipboard');
	} catch (error) {
		console.error('Failed to copy files to clipboard:', error);
		toastStore.actions.showErrorToast('Failed to copy files to clipboard');
		throw error;
	}
};
