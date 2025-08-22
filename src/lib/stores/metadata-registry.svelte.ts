import { createMetadataStore, type MetadataStore } from './metadata-store.svelte';
import { metadataQueue } from './metadata-queue';

// ストアレジストリ（Map + 個別$state）
const storeRegistry = new Map<string, MetadataStore>();

/**
 * メタデータレジストリ - 個別ストアの管理
 */
export const metadataRegistry = {
	/**
	 * ストアを取得（なければ作成）
	 */
	getStore: (imagePath: string): MetadataStore => {
		if (!storeRegistry.has(imagePath)) {
			const store = createMetadataStore(imagePath);
			storeRegistry.set(imagePath, store);
		}
		return storeRegistry.get(imagePath)!;
	},


	/**
	 * 複数画像のメタデータを事前読み込み
	 */
	preloadMetadata: async (imagePaths: string[]): Promise<void> => {
		const loadPromises = imagePaths.map((imagePath) => {
			const store = metadataRegistry.getStore(imagePath);
			if (store.state.loadingStatus === 'unloaded') {
				return store.actions.ensureLoaded();
			}
			return Promise.resolve();
		});

		await Promise.all(loadPromises);
	},

	/**
	 * 未使用のメタデータをクリア
	 */
	clearUnused: (currentImagePaths: string[]): void => {
		const currentPathSet = new Set(currentImagePaths);

		for (const [path, store] of storeRegistry) {
			if (!currentPathSet.has(path)) {
				// ストアを適切に破棄（レジストリの管理責務）
				store.actions.destroy();
				storeRegistry.delete(path);
			}
		}
	},

	/**
	 * 全メタデータをクリア
	 */
	clearAll: (): void => {
		// 全ストアを適切に破棄
		for (const store of storeRegistry.values()) {
			store.actions.destroy();
		}
		
		metadataQueue.clear('metadata');
		storeRegistry.clear();
	},

	/**
	 * メタデータキューを停止
	 */
	stopQueue: (): void => {
		metadataQueue.stop('metadata');
	},

	/**
	 * 同期的にレーティングマップを取得（フィルタリング用）
	 */
	getRatingsMapSync: (imagePaths: string[]): Map<string, number | undefined> => {
		const ratingsMap = new Map<string, number | undefined>();

		for (const imagePath of imagePaths) {
			const store = storeRegistry.get(imagePath);
			// メタデータが存在し、ロード済みの場合のみレーティングを取得
			if (store && store.state.loadingStatus === 'loaded') {
				ratingsMap.set(imagePath, store.state.rating);
			} else {
				// 未ロードの場合は undefined（未評価）として扱う
				ratingsMap.set(imagePath, undefined);
			}
		}

		return ratingsMap;
	},

	/**
	 * Rating書き込み処理を待機
	 */
	waitForAllRatingWrites: async (): Promise<void> => {
		// 現在の実装では即座に完了（必要に応じて実装を追加）
		return;
	},

	/**
	 * 初期状態にリセット
	 */
	reset: (): void => {
		// 全メタデータをクリア（clearAll()が全ストアを破棄してstoreRegistry.clear()を呼ぶ）
		metadataRegistry.clearAll();
	},

	/**
	 * キューサイズを取得
	 */
	getQueueSize: (): number => {
		return metadataQueue.queueSize;
	},

	/**
	 * アクティブジョブ数を取得
	 */
	getActiveJobCount: (): number => {
		return metadataQueue.activeJobCount;
	},

	/**
	 * 最大同時実行数を設定
	 */
	setMaxConcurrent: (maxConcurrent: number): void => {
		metadataQueue.setMaxConcurrent(maxConcurrent);
	}
};