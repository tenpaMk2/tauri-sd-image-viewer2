import { appStore } from '$lib/stores/app-store.svelte';
import { directoryImagePathsStore } from '$lib/stores/directory-image-paths-store.svelte';
import { navigationStore } from '$lib/stores/navigation-store.svelte';
import { path } from '@tauri-apps/api';
import { imageRegistry } from './image-registry';
import { metadataRegistry } from './metadata-registry';
import { thumbnailRegistry } from './thumbnail-registry';

/**
 * Welcome画面への遷移
 */
export const transitionToWelcome = async (): Promise<void> => {
	// まずトランジションすることが大事。
	await appStore.actions.transitionToWelcome();

	// その後、関連するストアを初期化
	await thumbnailRegistry.clearAll();
	await metadataRegistry.clearAll();
	await imageRegistry.clearAll();
	// TODO: 画像ビューやタグアグリのストアも初期化
};

/**
 * Grid表示への遷移 - ディレクトリの画像パスを初期化
 */
export const transitionToGrid = async (directory: string): Promise<void> => {
	// まずトランジションすることが大事。
	await appStore.actions.transitionToGrid();

	// その後、関連するストアを初期化
	await thumbnailRegistry.clearAll();
	await metadataRegistry.clearAll();
	await imageRegistry.clearAll();
	await directoryImagePathsStore.actions.loadImagePaths(directory);
};

/**
 * Viewer表示への遷移 - ディレクトリを初期化
 */
export const transitionToViewer = async (initialImagePath: string): Promise<void> => {
	// まずトランジションすることが大事。
	await appStore.actions.transitionToViewer();

	// その後、関連するストアを初期化
	await thumbnailRegistry.clearAll();
	await metadataRegistry.clearAll();
	await imageRegistry.clearAll();
	const directory = await path.dirname(initialImagePath);
	await directoryImagePathsStore.actions.loadImagePaths(directory); // NavigationStoreが使うのでawait必須
	await navigationStore.actions.navigateTo(initialImagePath);
};
