import { SvelteSet } from 'svelte/reactivity';

export const SELECTION_CONTEXT = Symbol('selectionContext');

export type SelectionContext = {
	state: {
		selectedImagePaths: SvelteSet<string>;
		lastSelectedIndex: number | null;
	};
	actions: {
		clear: () => void;
		add: (imagePath: string, index: number) => void;
		delete: (imagePath: string) => void;
		toggle: (imagePath: string, index: number) => void;
		selectRange: (startIndex: number, endIndex: number, imagePaths: string[]) => void;
		selectAll: (imagePaths: string[]) => void;
		removeHiddenImages: (visibleImagePaths: string[]) => void;
	};
};
