import { appStore } from '$lib/stores/app-store.svelte';
import { navigationStore } from '$lib/stores/navigation-store.svelte';
import { directoryImagePathsStore } from '$lib/stores/directory-image-paths-store.svelte';

/**
 * Welcome画面への遷移
 */
export const transitionToWelcome = async (): Promise<void> => {
	appStore.actions.transitionToWelcome();
};

/**
 * Grid表示への遷移 - ディレクトリの画像パスを初期化
 */
export const transitionToGrid = async (directory: string): Promise<void> => {
	await directoryImagePathsStore.actions.loadImagePaths(directory);
	appStore.actions.transitionToGrid();
};

/**
 * Viewer表示への遷移 - ナビゲーションを初期化
 */
export const transitionToViewer = async (initialImagePath: string): Promise<void> => {
	await navigationStore.actions.initializeNavigation(initialImagePath);
	appStore.actions.transitionToViewer();
};