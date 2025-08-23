import { invoke } from '@tauri-apps/api/core';
import { SvelteSet } from 'svelte/reactivity';
import { deleteSelectedImages as performDelete } from '../utils/delete-images';
import { toastStore } from './toast-store.svelte';

type MutableGridState = {
	selectedImages: SvelteSet<string>;
	showFilterPanel: boolean;
	filteredImageCount: number;
	lastSelectedIndex: number;
	showOptionsModal: boolean;
};

// 画像グリッド表示専用のストア
export type GridState = Readonly<MutableGridState>;

const INITIAL_GRID_STATE: MutableGridState = {
	selectedImages: new SvelteSet(),
	showFilterPanel: false,
	filteredImageCount: 0,
	lastSelectedIndex: -1,
	showOptionsModal: false,
};

let gridState = $state<MutableGridState>({
	selectedImages: new SvelteSet(),
	showFilterPanel: false,
	filteredImageCount: 0,
	lastSelectedIndex: -1,
	showOptionsModal: false,
});

// 画像選択ロジックを専用関数として分離
const toggleImageSelection = (
	imagePath: string,
	imageFiles: string[],
	shiftKey: boolean = false,
	metaKey: boolean = false,
) => {
	const currentIndex = imageFiles.indexOf(imagePath);

	if (shiftKey && gridState.lastSelectedIndex !== -1) {
		// Shift+Click: 範囲選択
		const startIndex = Math.min(gridState.lastSelectedIndex, currentIndex);
		const endIndex = Math.max(gridState.lastSelectedIndex, currentIndex);

		const newSelection = new SvelteSet(gridState.selectedImages);
		for (let i = startIndex; i <= endIndex; i++) {
			newSelection.add(imageFiles[i]);
		}
		gridState.selectedImages = newSelection;
	} else if (metaKey) {
		// Cmd+Click (macOS) または Ctrl+Click (Windows/Linux): 複数選択
		const newSelection = new SvelteSet(gridState.selectedImages);
		if (gridState.selectedImages.has(imagePath)) {
			// 既に選択されている場合は選択解除
			newSelection.delete(imagePath);
		} else {
			// 新しく選択に追加
			newSelection.add(imagePath);
			gridState.lastSelectedIndex = currentIndex;
		}
		gridState.selectedImages = newSelection;
	} else {
		// 通常クリック: 単独選択（既存選択をクリア）
		if (gridState.selectedImages.has(imagePath)) {
			// 既に選択されている場合は選択解除
			gridState.selectedImages = new SvelteSet();
			gridState.lastSelectedIndex = -1;
		} else {
			// 新しく選択（他の選択はクリア）
			gridState.selectedImages = new SvelteSet([imagePath]);
			gridState.lastSelectedIndex = currentIndex;
		}
	}
};

const toggleSelectAll = (imageFiles: string[]) => {
	if (gridState.selectedImages.size === imageFiles.length) {
		gridState.selectedImages = new SvelteSet();
	} else {
		gridState.selectedImages = new SvelteSet(imageFiles);
	}
};

const clearSelection = () => {
	gridState.selectedImages = new SvelteSet();
	gridState.lastSelectedIndex = -1;
};

const toggleFilterPanel = () => {
	gridState.showFilterPanel = !gridState.showFilterPanel;
};

const toggleOptionsModal = () => {
	gridState.showOptionsModal = !gridState.showOptionsModal;
};

const closeOptionsModal = () => {
	gridState.showOptionsModal = false;
};

// キャッシュ削除
const clearCache = async (selectedDirectory: string) => {
	try {
		await invoke('clear_thumbnail_cache');
		toastStore.actions.showSuccessToast('Thumbnail cache cleared');
		closeOptionsModal();
	} catch (error) {
		console.error('Failed to clear cache: ' + error);
		toastStore.actions.showErrorToast('Failed to clear cache');
	}
};

// 選択画像削除
const deleteSelectedImages = async (selectedDirectory: string) => {
	if (gridState.selectedImages.size === 0) return;

	try {
		await performDelete(gridState.selectedImages);
		clearSelection();
	} catch (err) {
		// エラーはperformDelete内で処理済み
	}
};

// クリップボード機能
const copySelectedToClipboard = async (): Promise<void> => {
	if (gridState.selectedImages.size === 0) return;

	const paths = Array.from(gridState.selectedImages);
	try {
		await invoke('set_clipboard_files', { paths });
		toastStore.actions.showSuccessToast(
			`${gridState.selectedImages.size} images copied to clipboard`,
		);
	} catch (error) {
		console.error('Failed to copy to clipboard: ' + error);
		toastStore.actions.showErrorToast('Failed to copy to clipboard');
	}
};

// Gridページ離脱時のクリーンアップ
const cleanup = (currentImageFiles: string[]) => {
	// このメソッドは現在使用しない（app-store側で管理）
	// 将来的にGrid固有のクリーンアップが必要になった場合に使用
};

const reset = () => {
	// 初期状態に完全リセット
	gridState.selectedImages = new SvelteSet();
	gridState.showFilterPanel = INITIAL_GRID_STATE.showFilterPanel;
	gridState.filteredImageCount = INITIAL_GRID_STATE.filteredImageCount;
	gridState.lastSelectedIndex = INITIAL_GRID_STATE.lastSelectedIndex;
	gridState.showOptionsModal = INITIAL_GRID_STATE.showOptionsModal;
};

export const gridStore = {
	state: gridState as GridState,
	actions: {
		toggleImageSelection,
		toggleSelectAll,
		clearSelection,
		toggleFilterPanel,
		toggleOptionsModal,
		closeOptionsModal,
		clearCache,
		deleteSelectedImages,
		copySelectedToClipboard,
		cleanup,
		reset,
	},
};
