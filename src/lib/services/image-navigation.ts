import { directoryImagePathsStore } from '$lib/stores/directory-image-paths-store.svelte';
import { navigationStore } from '$lib/stores/navigation-store.svelte';
import { path } from '@tauri-apps/api';
import { metadataRegistry } from './metadata-registry';

/**
 * 指定された画像への遷移 - メタデータロードを開始
 * ディレクトリが異なる場合は自動的に初期化される
 */
export const navigateToImage = async (imagePath: string): Promise<void> => {
	console.log('🎯 navigateToImage called: ' + imagePath.split('/').pop());

	// ディレクトリ変更判定
	const currentDir = directoryImagePathsStore.state.currentDirectory;
	const targetDir = await path.dirname(imagePath);

	// ディレクトリが異なる場合は初期化が必要
	if (currentDir !== targetDir) {
		console.log('📁 Directory changed, initializing: ' + targetDir);
		await directoryImagePathsStore.actions.loadImagePaths(targetDir);
	}

	// ナビゲーション実行
	navigationStore.actions.navigateTo(imagePath);

	// 新しい画像のメタデータロードを開始または再開
	const metadataStore = metadataRegistry.getOrCreateStore(navigationStore.state.currentImagePath);
	metadataStore.actions.ensureLoaded().catch((error) => {
		console.error(
			'Failed to load metadata for: ' +
				navigationStore.state.currentImagePath.split('/').pop() +
				', error: ' +
				error,
		);
	});
};

/**
 * 次の画像への遷移 - メタデータロードを開始
 */
export const navigateToNext = async (): Promise<void> => {
	const nextImagePath = navigationStore.deriveds.nextImagePath;
	if (!nextImagePath) {
		console.log('❌ No next image available');
		return;
	}

	await navigateToImage(nextImagePath);
};

/**
 * 前の画像への遷移 - メタデータロードを開始
 */
export const navigateToPrevious = async (): Promise<void> => {
	const previousImagePath = navigationStore.deriveds.previousImagePath;
	if (!previousImagePath) {
		console.log('❌ No previous image available');
		return;
	}

	await navigateToImage(previousImagePath);
};

/**
 * 最後の画像への遷移 - メタデータロードを開始
 */
export const navigateToLast = async (): Promise<void> => {
	const lastImagePath = navigationStore.deriveds.lastImagePath;
	if (!lastImagePath) {
		console.log('❌ No last image available');
		return;
	}

	await navigateToImage(lastImagePath);
};
