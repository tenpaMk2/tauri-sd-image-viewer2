import { SvelteSet } from 'svelte/reactivity';

// 画像グリッド表示専用のストア
export type GridState = {
	selectedImages: SvelteSet<string>;
	showFilterPanel: boolean;
	filteredImageCount: number;
	lastSelectedIndex: number;
	showOptionsModal: boolean;
};

export type GridActions = {
	toggleImageSelection: (
		imagePath: string,
		imageFiles: string[],
		shiftKey?: boolean,
		metaKey?: boolean
	) => void;
	toggleSelectAll: (imageFiles: string[]) => void;
	clearSelection: () => void;
	toggleFilterPanel: () => void;
	toggleOptionsModal: () => void;
	closeOptionsModal: () => void;
	// その他グリッド固有のアクション
};

let gridState: GridState = $state({
	selectedImages: new SvelteSet(),
	showFilterPanel: false,
	filteredImageCount: 0,
	lastSelectedIndex: -1,
	showOptionsModal: false
});

// 画像選択ロジックを専用関数として分離
const toggleImageSelection = (
	imagePath: string,
	imageFiles: string[],
	shiftKey: boolean = false,
	metaKey: boolean = false
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

export const gridStore = {
	state: gridState,
	actions: {
		toggleImageSelection,
		toggleSelectAll,
		clearSelection,
		toggleFilterPanel,
		toggleOptionsModal,
		closeOptionsModal
	}
};
