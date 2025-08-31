import { metadataQueue } from '$lib/services/metadata-queue';
import { createMetadataStore, type MetadataStore } from '$lib/stores/metadata-store.svelte';

// ストアレジストリ（Map + 個別$state）
const storeRegistry = new Map<string, MetadataStore>();

/**
 * メタデータレジストリ - 個別ストアの管理
 */
export const metadataRegistry = {
	/**
	 * ストアを取得（なければ作成）
	 */
	getOrCreateStore: (imagePath: string): MetadataStore => {
		if (!storeRegistry.has(imagePath)) {
			const store = createMetadataStore(imagePath);
			storeRegistry.set(imagePath, store);
		}
		return storeRegistry.get(imagePath)!;
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

		metadataQueue.clearPendingTasks();
		storeRegistry.clear();
	},

	/**
	 * 初期状態にリセット
	 */
	reset: (): void => {
		// 全メタデータをクリア（clearAll()が全ストアを破棄してstoreRegistry.clear()を呼ぶ）
		metadataRegistry.clearAll();
	},
};
