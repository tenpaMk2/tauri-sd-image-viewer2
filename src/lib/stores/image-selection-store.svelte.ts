import { directoryImagePathsStore } from '$lib/stores/directory-image-paths-store.svelte';
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

const _state = $state<MutableImageSelectionState>({ ...INITIAL_IMAGE_SELECTION_STATE });

const toggleImageSelection = (
	imagePath: string,
	shiftKey: boolean = false,
	metaKey: boolean = false,
) => {
	const imagePaths = directoryImagePathsStore.state.imagePaths;
	if (!imagePaths) return;

	const currentIndex = imagePaths.indexOf(imagePath);

	if (shiftKey && _state.lastSelectedIndex !== -1) {
		// Shift+Click: 範囲選択
		const startIndex = Math.min(_state.lastSelectedIndex, currentIndex);
		const endIndex = Math.max(_state.lastSelectedIndex, currentIndex);

		const newSelection = new SvelteSet(_state.selectedImages);
		for (let i = startIndex; i <= endIndex; i++) {
			newSelection.add(imagePaths[i]);
		}
		_state.selectedImages = newSelection;
	} else if (metaKey) {
		// Cmd+Click (macOS) または Ctrl+Click (Windows/Linux): 複数選択
		const newSelection = new SvelteSet(_state.selectedImages);
		if (_state.selectedImages.has(imagePath)) {
			// 既に選択されている場合は選択解除
			newSelection.delete(imagePath);
		} else {
			// 新しく選択に追加
			newSelection.add(imagePath);
			_state.lastSelectedIndex = currentIndex;
		}
		_state.selectedImages = newSelection;
	} else {
		// 通常クリック: 単独選択（既存選択をクリア）
		if (_state.selectedImages.has(imagePath)) {
			// 既に選択されている場合は選択解除
			_state.selectedImages = new SvelteSet();
			_state.lastSelectedIndex = -1;
		} else {
			// 新しく選択（他の選択はクリア）
			_state.selectedImages = new SvelteSet([imagePath]);
			_state.lastSelectedIndex = currentIndex;
		}
	}
};

const toggleSelectAll = () => {
	const imagePaths = directoryImagePathsStore.state.imagePaths;
	if (!imagePaths) return;

	if (_state.selectedImages.size === imagePaths.length) {
		_state.selectedImages = new SvelteSet();
	} else {
		_state.selectedImages = new SvelteSet(imagePaths);
	}
};

const clearSelection = () => {
	_state.selectedImages = new SvelteSet();
	_state.lastSelectedIndex = -1;
};

const reset = () => {
	_state.selectedImages = new SvelteSet();
	_state.lastSelectedIndex = INITIAL_IMAGE_SELECTION_STATE.lastSelectedIndex;
};

export const imageSelectionStore = {
	state: _state as ImageSelectionState,
	actions: {
		toggleImageSelection,
		toggleSelectAll,
		clearSelection,
		reset,
	},
};
