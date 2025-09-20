import { SvelteSet } from 'svelte/reactivity';

export const SELECTION_STATE = Symbol('selectionState');

export type SelectionState = {
	selectedImagePaths: SvelteSet<string>;
	lastSelectedIndex: number | null;
};
