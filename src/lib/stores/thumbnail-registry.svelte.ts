import { createThumbnailStore, type ThumbnailStore } from './thumbnail-store.svelte';
import { thumbnailQueue } from './thumbnail-queue';

// ストアレジストリ（Map + 個別$state）
const storeRegistry = new Map<string, ThumbnailStore>();

/**
 * サムネイルレジストリ - 個別ストアの管理
 */
export const thumbnailRegistry = {
	/**
	 * ストアを取得（なければ作成）
	 */
	getStore: (imagePath: string): ThumbnailStore => {
		if (!storeRegistry.has(imagePath)) {
			const store = createThumbnailStore(imagePath);
			storeRegistry.set(imagePath, store);
		}
		return storeRegistry.get(imagePath)!;
	},

	/**
	 * 複数画像のサムネイルを事前読み込み
	 */
	preloadThumbnails: async (imagePaths: string[]): Promise<void> => {
		console.log('🔄 Preloading thumbnails for ' + imagePaths.length + ' images');

		const loadPromises = imagePaths.map((imagePath) => {
			const store = thumbnailRegistry.getStore(imagePath);
			if (store.state.loadingStatus === 'unloaded') {
				return store.actions.ensureLoaded();
			}
			return Promise.resolve();
		});

		await Promise.all(loadPromises);
		console.log('✅ Thumbnail preloading completed');
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

		thumbnailQueue.clear('thumbnail');
		storeRegistry.clear();
		console.log('🗑️ All thumbnails cleared');
	},

	/**
	 * サムネイルキューを停止
	 */
	stopQueue: (): void => {
		thumbnailQueue.stop('thumbnail');
	},

	/**
	 * 初期状態にリセット
	 */
	reset: (): void => {
		// 全サムネイルをクリア（clearAll()が全ストアを破棄してstoreRegistry.clear()を呼ぶ）
		thumbnailRegistry.clearAll();
	},

	/**
	 * キューサイズを取得
	 */
	getQueueSize: (): number => {
		return thumbnailQueue.queueSize;
	},

	/**
	 * アクティブジョブ数を取得
	 */
	getActiveJobCount: (): number => {
		return thumbnailQueue.activeJobCount;
	},

	/**
	 * 最大同時実行数を設定
	 */
	setMaxConcurrent: (maxConcurrent: number): void => {
		thumbnailQueue.setMaxConcurrent(maxConcurrent);
	}
};
