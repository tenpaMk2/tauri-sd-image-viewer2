import { appStore } from '$lib/stores/app-store.svelte';
import { directoryImagePathsStore } from '$lib/stores/directory-image-paths-store.svelte';
import { navigationStore } from '$lib/stores/navigation-store.svelte';
import { path } from '@tauri-apps/api';
import { metadataQueue } from './metadata-queue';
import { thumbnailQueue } from './thumbnail-queue';

/**
 * Welcome画面への遷移
 */
export const transitionToWelcome = async (): Promise<void> => {
	appStore.actions.transitionToWelcome();
	thumbnailQueue.clearPendingTasks();
	metadataQueue.clearPendingTasks();
};

/**
 * Grid表示への遷移 - ディレクトリの画像パスを初期化
 */
export const transitionToGrid = async (directory: string): Promise<void> => {
	directoryImagePathsStore.actions.loadImagePaths(directory);
	appStore.actions.transitionToGrid();
};

/**
 * Viewer表示への遷移 - ディレクトリを初期化
 */
export const transitionToViewer = async (initialImagePath: string): Promise<void> => {
	const directory = await path.dirname(initialImagePath);
	await directoryImagePathsStore.actions.loadImagePaths(directory);
	navigationStore.actions.navigateTo(initialImagePath);
	thumbnailQueue.clearPendingTasks();
	metadataQueue.clearPendingTasks();
	appStore.actions.transitionToViewer();
};
