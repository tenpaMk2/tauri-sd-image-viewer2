import { thumbnailQueue } from '$lib/services/thumbnail-queue';
import { createThumbnailStore, type ThumbnailStore } from '$lib/stores/thumbnail-store.svelte';

// ストアレジストリ（Map + 個別$state）
const storeRegistry = new Map<string, ThumbnailStore>();

/**
 * サムネイルレジストリ - 個別ストアの管理
 */
export const thumbnailRegistry = {
	/**
	 * ストアを取得（なければ作成）
	 */
	getOrCreateStore: (imagePath: string): ThumbnailStore => {
		if (!storeRegistry.has(imagePath)) {
			const store = createThumbnailStore(imagePath);
			storeRegistry.set(imagePath, store);
		}
		return storeRegistry.get(imagePath)!;
	},

	/**
	 * 未使用のサムネイルをクリア
	 */
	clearUnused: (currentImagePaths: string[]): void => {
		const currentPathSet = new Set(currentImagePaths);
		let removedCount = 0;

		for (const [path, store] of storeRegistry) {
			if (!currentPathSet.has(path)) {
				// ストアを適切に破棄（レジストリの管理責務）
				store.actions.destroy();
				storeRegistry.delete(path);
				removedCount++;
			}
		}

		if (removedCount > 0) {
			console.log('🗑️ Cleared ' + removedCount + ' unused thumbnail entries');
		}
	},

	/**
	 * 全サムネイルをクリア
	 */
	clearAll: (): void => {
		// 全ストアを適切に破棄
		for (const store of storeRegistry.values()) {
			store.actions.destroy();
		}

		thumbnailQueue.clear();
		storeRegistry.clear();
		console.log('🗑️ All thumbnails cleared');
	},

	/**
	 * 初期状態にリセット
	 */
	reset: (): void => {
		// 全サムネイルをクリア（clearAll()が全ストアを破棄してstoreRegistry.clear()を呼ぶ）
		thumbnailRegistry.clearAll();
	},
};
