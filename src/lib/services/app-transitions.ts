import { appStore } from '$lib/stores/app-store.svelte';
import { directoryImagePathsStore } from '$lib/stores/directory-image-paths-store.svelte';
import { navigationStore } from '$lib/stores/navigation-store.svelte';
import { metadataQueue } from './metadata-queue';
import { thumbnailQueue } from './thumbnail-queue';

/**
 * Welcome画面への遷移
 */
export const transitionToWelcome = async (): Promise<void> => {
	appStore.actions.transitionToWelcome();
	thumbnailQueue.clear();
	metadataQueue.clear();
};

/**
 * Grid表示への遷移 - ディレクトリの画像パスを初期化
 */
export const transitionToGrid = async (directory: string): Promise<void> => {
	directoryImagePathsStore.actions.loadImagePaths(directory);
	appStore.actions.transitionToGrid();
};

/**
 * Viewer表示への遷移 - ナビゲーションを初期化
 */
export const transitionToViewer = async (initialImagePath: string): Promise<void> => {
	navigationStore.actions.initializeNavigation(initialImagePath);
	thumbnailQueue.clear();
	metadataQueue.clear();
	appStore.actions.transitionToViewer();
};
