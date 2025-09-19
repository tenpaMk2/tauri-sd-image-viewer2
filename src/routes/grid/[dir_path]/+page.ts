import { getDirectoryImages } from '$lib/services/image-directory-service';
import {
	createThumbnailStore,
	thumbnailQueue,
	type ThumbnailStore,
} from '$lib/stores/thumbnail-store.svelte';
import { path } from '@tauri-apps/api';
import type { QueueAddOptions } from 'p-queue';
import type { PageLoad } from './$types';

export type GridPageData = {
	title: string;
	dirPath: string;
	imagePaths: string[];
	thumbnailStores: Map<string, ThumbnailStore>;
};

export const load: PageLoad = async ({ params }): Promise<GridPageData> => {
	const dirPath = decodeURIComponent(params.dir_path);

	try {
		// ディレクトリから画像ファイル一覧を取得
		const imagePaths = await getDirectoryImages(dirPath);

		// 各画像のサムネイルストアを事前に作成
		const thumbnailStores = new Map<string, ThumbnailStore>();
		for (const imagePath of imagePaths) {
			thumbnailStores.set(imagePath, createThumbnailStore(imagePath));
		}

		// 全サムネイルをp-queueに一括enqueue（AbortSignal対応）
		const thumbnailTasks = Array.from(thumbnailStores.values()).map(
			(store) => (options: QueueAddOptions) => store.actions.load(options.signal),
		);

		thumbnailQueue.addAll(thumbnailTasks).catch((error: unknown) => {
			console.error('Failed to load thumbnails batch: ', error);
		});

		return {
			title: (await path.basename(dirPath)) || 'Root',
			dirPath,
			imagePaths,
			thumbnailStores,
		};
	} catch (error) {
		console.error('Failed to load grid page: ' + error);

		// エラー時は空の配列を返す
		return {
			title: `Grid View - ${dirPath.split('/').pop() || 'Root'} (Error)`,
			dirPath,
			imagePaths: [],
			thumbnailStores: new Map(),
		};
	}
};
