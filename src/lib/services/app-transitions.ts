import { appStore } from '$lib/stores/app-store.svelte';
import { directoryImagePathsStore } from '$lib/stores/directory-image-paths-store.svelte';
import { navigationStore } from '$lib/stores/navigation-store.svelte';
import { path } from '@tauri-apps/api';
import { imageRegistry } from './image-registry';
import { metadataQueue } from './metadata-queue';
import { metadataRegistry } from './metadata-registry';
import { thumbnailQueue } from './thumbnail-queue';
import { thumbnailRegistry } from './thumbnail-registry';

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
	await thumbnailRegistry.clearAll();
	await metadataRegistry.clearAll();
	await imageRegistry.clearAll();
	directoryImagePathsStore.actions.loadImagePaths(directory);
	appStore.actions.transitionToGrid();
};

/**
 * Viewer表示への遷移 - ディレクトリを初期化
 */
export const transitionToViewer = async (initialImagePath: string): Promise<void> => {
	await thumbnailRegistry.clearAll();
	await metadataRegistry.clearAll();
	await imageRegistry.clearAll();
	const directory = await path.dirname(initialImagePath);
	await directoryImagePathsStore.actions.loadImagePaths(directory); // NavigationStoreが使うのでawait必須
	navigationStore.actions.navigateTo(initialImagePath);
	appStore.actions.transitionToViewer();
};
