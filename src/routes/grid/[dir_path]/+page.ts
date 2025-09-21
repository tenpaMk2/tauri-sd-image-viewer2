import {
	createThumbnailQueue,
	createThumbnailStore,
	type ThumbnailStore,
} from '$lib/components/grid/thumbnail-store.svelte';
import {
	createMetadataQueue,
	createMetadataStore,
	type MetadataStore,
} from '$lib/components/metadata/metadata-store.svelte';
import { getDirectoryImages } from '$lib/services/image-directory-service';
import { path } from '@tauri-apps/api';
import type PQueue from 'p-queue';
import type { QueueAddOptions } from 'p-queue';
import type { PageLoad } from './$types';

export type GridPageData = {
	title: string;
	dirPath: string;
	initialImagePaths: string[];
	thumbnailStores: Map<string, ThumbnailStore>;
	thumbnailQueue: PQueue;
	metadataStores: Map<string, MetadataStore>;
	metadataQueue: PQueue;
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

		// 各画像のメタデータストアを事前に作成
		const metadataStores = new Map<string, MetadataStore>();
		for (const imagePath of imagePaths) {
			metadataStores.set(imagePath, createMetadataStore(imagePath));
		}

		// サムネイル専用キューインスタンスを作成
		const thumbnailQueue = createThumbnailQueue();
		// メタデータ専用キューインスタンスを作成
		const metadataQueue = createMetadataQueue();

		// 全サムネイルをp-queueに一括enqueue（AbortSignal対応）
		const thumbnailTasks = Array.from(thumbnailStores.values()).map(
			(store) => (options: QueueAddOptions) => store.actions.load(options.signal),
		);

		thumbnailQueue.addAll(thumbnailTasks).catch((error: unknown) => {
			console.error('Failed to load thumbnails batch: ', error);
		});

		// 全メタデータをp-queueに一括enqueue（AbortSignal対応）
		const metadataTasks = Array.from(metadataStores.values()).map(
			(store) => (options: QueueAddOptions) => store.actions.load(options.signal),
		);

		metadataQueue.addAll(metadataTasks).catch((error: unknown) => {
			console.error('Failed to load metadata batch: ', error);
		});

		return {
			title: (await path.basename(dirPath)) || 'Root',
			dirPath,
			initialImagePaths: imagePaths,
			thumbnailStores,
			thumbnailQueue,
			metadataStores,
			metadataQueue,
		};
	} catch (error) {
		console.error('Failed to load grid page: ' + error);

		// エラー時は空の配列を返す
		return {
			title: `Grid View - ${(await path.basename(dirPath)) || 'Root'} (Error)`,
			dirPath,
			initialImagePaths: [],
			thumbnailStores: new Map(),
			thumbnailQueue: createThumbnailQueue(),
			metadataStores: new Map(),
			metadataQueue: createMetadataQueue(),
		};
	}
};
