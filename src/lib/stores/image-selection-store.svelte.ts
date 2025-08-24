import { navigationStore } from '$lib/stores/navigation-store.svelte';
import { SvelteSet } from 'svelte/reactivity';

type MutableImageSelectionState = {
	selectedImages: SvelteSet<string>;
	lastSelectedIndex: number;
};

export type ImageSelectionState = Readonly<MutableImageSelectionState>;

const INITIAL_IMAGE_SELECTION_STATE: MutableImageSelectionState = {
	selectedImages: new SvelteSet(),
	lastSelectedIndex: -1,
};

let imageSelectionState = $state<MutableImageSelectionState>({
	selectedImages: new SvelteSet(),
	lastSelectedIndex: -1,
});

const toggleImageSelection = (
	imagePath: string,
	shiftKey: boolean = false,
	metaKey: boolean = false,
) => {
	const imageFiles = navigationStore.state.directoryImagePaths;
	const currentIndex = imageFiles.indexOf(imagePath);

	if (shiftKey && imageSelectionState.lastSelectedIndex !== -1) {
		// Shift+Click: 範囲選択
		const startIndex = Math.min(imageSelectionState.lastSelectedIndex, currentIndex);
		const endIndex = Math.max(imageSelectionState.lastSelectedIndex, currentIndex);

		const newSelection = new SvelteSet(imageSelectionState.selectedImages);
		for (let i = startIndex; i <= endIndex; i++) {
			newSelection.add(imageFiles[i]);
		}
		imageSelectionState.selectedImages = newSelection;
	} else if (metaKey) {
		// Cmd+Click (macOS) または Ctrl+Click (Windows/Linux): 複数選択
		const newSelection = new SvelteSet(imageSelectionState.selectedImages);
		if (imageSelectionState.selectedImages.has(imagePath)) {
			// 既に選択されている場合は選択解除
			newSelection.delete(imagePath);
		} else {
			// 新しく選択に追加
			newSelection.add(imagePath);
			imageSelectionState.lastSelectedIndex = currentIndex;
		}
		imageSelectionState.selectedImages = newSelection;
	} else {
		// 通常クリック: 単独選択（既存選択をクリア）
		if (imageSelectionState.selectedImages.has(imagePath)) {
			// 既に選択されている場合は選択解除
			imageSelectionState.selectedImages = new SvelteSet();
			imageSelectionState.lastSelectedIndex = -1;
		} else {
			// 新しく選択（他の選択はクリア）
			imageSelectionState.selectedImages = new SvelteSet([imagePath]);
			imageSelectionState.lastSelectedIndex = currentIndex;
		}
	}
};

const toggleSelectAll = () => {
	const imageFiles = navigationStore.state.directoryImagePaths;
	if (imageSelectionState.selectedImages.size === imageFiles.length) {
		imageSelectionState.selectedImages = new SvelteSet();
	} else {
		imageSelectionState.selectedImages = new SvelteSet(imageFiles);
	}
};

const clearSelection = () => {
	imageSelectionState.selectedImages = new SvelteSet();
	imageSelectionState.lastSelectedIndex = -1;
};

const reset = () => {
	imageSelectionState.selectedImages = new SvelteSet();
	imageSelectionState.lastSelectedIndex = INITIAL_IMAGE_SELECTION_STATE.lastSelectedIndex;
};

export const imageSelectionStore = {
	state: imageSelectionState as ImageSelectionState,
	actions: {
		toggleImageSelection,
		toggleSelectAll,
		clearSelection,
		reset,
	},
};
