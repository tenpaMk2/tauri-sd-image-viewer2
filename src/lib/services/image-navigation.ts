import { directoryImagePathsStore } from '$lib/stores/directory-image-paths-store.svelte';
import { navigationStore } from '$lib/stores/navigation-store.svelte';
import { viewerUIStore } from '$lib/stores/viewer-ui-store.svelte';
import { path } from '@tauri-apps/api';
import { imageRegistry } from './image-registry';
import { metadataRegistry } from './metadata-registry';

// 画像をdestroyするヘルパー関数
const destroyImage = (imagePath: string, label: string): void => {
	try {
		const removed = imageRegistry.removeStore(imagePath);
		if (removed) {
			console.log('🗑️ Destroyed ' + label + ': ' + imagePath.split('/').pop());
		} else {
			console.log('⚠️ No store found to destroy for ' + label + ': ' + imagePath.split('/').pop());
		}
	} catch (error) {
		console.warn('Failed to destroy ' + label + ':', error);
	}
};

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

		// 現在の3ファイル（前・現在・次）を全てdestroy（別ディレクトリなので）
		const { deriveds } = navigationStore;
		if (deriveds.hasPrevious && deriveds.previousImagePath) {
			destroyImage(deriveds.previousImagePath, 'previous image');
		}
		if (navigationStore.state.currentImagePath) {
			destroyImage(navigationStore.state.currentImagePath, 'current image');
		}
		if (deriveds.hasNext && deriveds.nextImagePath) {
			destroyImage(deriveds.nextImagePath, 'next image');
		}

		await directoryImagePathsStore.actions.loadImagePaths(targetDir);
		navigationStore.actions.navigateTo(imagePath);
	} else {
		// 同じディレクトリ内での移動
		console.log('🔄 Same directory navigation');

		// 現在の隣接画像セット（nullを除く）
		const { deriveds } = navigationStore;
		const currentAdjacent = new Set(
			[deriveds.previousImagePath, deriveds.nextImagePath].filter(
				(path): path is string => path !== null,
			),
		);

		// target画像の隣接画像セット
		const imagePaths = directoryImagePathsStore.state.imagePaths || [];
		const targetIndex = imagePaths.findIndex((path) => path === imagePath);
		if (targetIndex === -1) {
			console.error('❌ Target image not found in current directory');
			return;
		}

		const targetAdjacent = new Set(
			[
				0 < targetIndex ? imagePaths[targetIndex - 1] : null,
				targetIndex < imagePaths.length - 1 ? imagePaths[targetIndex + 1] : null,
			].filter((path): path is string => path !== null),
		);

		// 削除すべき画像 = 現在の隣接画像 - targetの隣接画像（差集合）
		const toDestroy = currentAdjacent.difference(targetAdjacent);
		for (const imagePath of toDestroy) {
			destroyImage(imagePath, 'no longer adjacent');
		}

		navigationStore.actions.navigateTo(imagePath);
	}

	// 新しい画像のメタデータロードを開始または再開
	const metadataStore = metadataRegistry.getOrCreateStore(navigationStore.state.currentImagePath);
	metadataStore.actions.ensureLoaded();
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

	viewerUIStore.actions.stopAutoNavigation();
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

	viewerUIStore.actions.stopAutoNavigation();
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
