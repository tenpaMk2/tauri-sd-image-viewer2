import { deleteSelectedImages as performDelete } from '../utils/delete-images';

type GridViewState = {
	isSelectionMode: boolean;
	selectedImages: Set<string>;
	refreshTrigger: number;
	imageFiles: string[];
};

type GridViewHook = {
	state: GridViewState;
	actions: {
		toggleSelectionMode: () => void;
		toggleImageSelection: (imagePath: string) => void;
		toggleSelectAll: () => void;
		deleteSelectedImages: () => Promise<void>;
		handleImageFilesLoaded: (files: string[]) => void;
	};
};

export const createGridViewHook = (): GridViewHook => {
	let state = $state<GridViewState>({
		isSelectionMode: false,
		selectedImages: new Set<string>(),
		refreshTrigger: 0,
		imageFiles: []
	});

	const toggleSelectionMode = () => {
		state.isSelectionMode = !state.isSelectionMode;
		if (!state.isSelectionMode) {
			state.selectedImages = new Set();
		}
	};

	const toggleImageSelection = (imagePath: string) => {
		const newSelection = new Set(state.selectedImages);
		if (newSelection.has(imagePath)) {
			newSelection.delete(imagePath);
		} else {
			newSelection.add(imagePath);
		}
		state.selectedImages = newSelection;
	};

	const toggleSelectAll = () => {
		if (state.selectedImages.size === state.imageFiles.length) {
			state.selectedImages = new Set();
		} else {
			state.selectedImages = new Set(state.imageFiles);
		}
	};

	const deleteSelectedImages = async () => {
		try {
			await performDelete(state.selectedImages);
			state.selectedImages = new Set();
			state.refreshTrigger = Date.now();
		} catch (err) {
			// エラーはperformDelete内で処理済み
		}
	};

	const handleImageFilesLoaded = (files: string[]) => {
		state.imageFiles = files;
	};

	return {
		state,
		actions: {
			toggleSelectionMode,
			toggleImageSelection,
			toggleSelectAll,
			deleteSelectedImages,
			handleImageFilesLoaded
		}
	};
};
