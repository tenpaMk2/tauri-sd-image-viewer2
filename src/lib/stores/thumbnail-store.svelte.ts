import { Channel, invoke } from '@tauri-apps/api/core';
import { thumbnailQueue } from '../services/image-file-access-queue-service.svelte';

/**
 * サムネイルロード状態
 */
type LoadingStatus = 'unloaded' | 'queued' | 'loading' | 'loaded' | 'error';

type ThumbnailItemState = {
	thumbnailUrl: string | undefined;
	loadingStatus: LoadingStatus;
	loadError: string | undefined;
	loadPromise: Promise<void> | undefined;
};

// 通常のMapを使用し、valueを$stateでリアクティブ管理
const thumbnailMap = new Map<string, ThumbnailItemState>();

/**
 * サムネイルの読み込み（一度だけ実行される）
 */
const ensureLoaded = async (imagePath: string): Promise<void> => {
	const item = getThumbnailItem(imagePath);

	// 既にロード済みの場合は何もしない
	if (item.loadingStatus === 'loaded') {
		return;
	}

	// 既にロード中の場合は既存のPromiseを待つ
	if (item.loadPromise) {
		return item.loadPromise;
	}

	// 状態を'queued'に変更
	item.loadingStatus = 'queued';

	// キューサービス経由でロード処理を開始
	item.loadPromise = thumbnailQueue.enqueue(imagePath).then(() => {
		item.loadPromise = undefined; // ロード完了時にPromiseをクリア
	});

	return item.loadPromise;
};


/**
 * サムネイルアイテムを取得（なければ作成）
 */
const getThumbnailItem = (imagePath: string): ThumbnailItemState => {
	if (!thumbnailMap.has(imagePath)) {
		const item = $state<ThumbnailItemState>({
			thumbnailUrl: undefined,
			loadingStatus: 'unloaded',
			loadError: undefined,
			loadPromise: undefined
		});
		thumbnailMap.set(imagePath, item);
	}
	return thumbnailMap.get(imagePath)!;
};


/**
 * サムネイルの実際のロード処理（キューサービスから呼ばれる）
 * @internal キューサービス専用メソッド - 直接呼び出し禁止
 */
const loadThumbnail = async (imagePath: string): Promise<void> => {
	const item = getThumbnailItem(imagePath);

	try {
		// ロード開始時に状態を'loading'に変更
		item.loadingStatus = 'loading';
		console.log('🔄 Loading thumbnail: ' + imagePath.split('/').pop());

		const channel = new Channel<Uint8Array>();

		// onmessageをPromise化
		const thumbnailPromise = new Promise<void>((resolve, reject) => {
			channel.onmessage = (data) => {
				console.log(
					'Thumbnail data received: ' + imagePath + ' data size: ' + (data?.length || 'undefined')
				);
				try {
					const blob = new Blob([new Uint8Array(data)], { type: 'image/webp' });
					const thumbnailUrl = URL.createObjectURL(blob);

					console.log('Thumbnail generated successfully: ' + imagePath + ' URL: ' + thumbnailUrl);

					// リアクティブ状態を更新
					item.thumbnailUrl = thumbnailUrl;
					item.loadError = undefined;
					item.loadingStatus = 'loaded';
					resolve(); // データ受信完了時にPromise解決
				} catch (error) {
					console.error('Thumbnail data processing failed: ' + imagePath + ' ' + error);
					item.loadError = 'Failed to process thumbnail data';
					item.loadingStatus = 'error';
					reject(error);
				}
			};
		});

		// invokeは非同期で開始（awaitしない）
		invoke('generate_thumbnail_async', {
			imagePath: imagePath,
			config: null,
			channel
		}).catch((error) => {
			// invokeのエラーだけキャッチ
			item.loadingStatus = 'error';
			item.loadError = error instanceof Error ? error.message : String(error);
		});

		// onmessageのPromiseだけをawait
		await thumbnailPromise;

		console.log('✅ Thumbnail loaded: ' + imagePath.split('/').pop());
	} catch (error) {
		// エラー時の状態変更
		item.loadingStatus = 'error';
		console.error('❌ Thumbnail load failed: ' + imagePath.split('/').pop() + ' ' + error);
		item.loadError = error instanceof Error ? error.message : String(error);
		throw error; // エラーを再スロー
	}
};

/**
 * 複数画像のサムネイルを事前読み込み
 */
const preloadThumbnails = async (imagePaths: string[]): Promise<void> => {
	console.log('🔄 Preloading thumbnails for ' + imagePaths.length + ' images');

	const loadPromises = imagePaths.map((imagePath) => {
		const item = getThumbnailItem(imagePath);
		if (item.loadingStatus === 'unloaded') {
			return ensureLoaded(imagePath);
		}
		return Promise.resolve();
	});

	await Promise.all(loadPromises);
	console.log('✅ Thumbnail preloading completed');
};

/**
 * 未使用のサムネイルをクリア
 */
const clearUnused = (currentImagePaths: string[]): void => {
	const currentPathSet = new Set(currentImagePaths);
	let removedCount = 0;

	for (const [path, item] of thumbnailMap) {
		if (!currentPathSet.has(path)) {
			// BlobURLを解放
			if (item.thumbnailUrl) {
				try {
					URL.revokeObjectURL(item.thumbnailUrl);
				} catch (error) {
					console.warn('Failed to revoke thumbnail URL:', error);
				}
			}
			thumbnailMap.delete(path);
			removedCount++;
		}
	}

	if (removedCount > 0) {
		console.log('🗑️ Cleared ' + removedCount + ' unused thumbnail entries');
	}
};

/**
 * 全サムネイルをクリア
 */
const clearAll = (): void => {
	// 全てのBlobURLを解放
	for (const [, item] of thumbnailMap) {
		if (item.thumbnailUrl) {
			try {
				URL.revokeObjectURL(item.thumbnailUrl);
			} catch (error) {
				console.warn('Failed to revoke thumbnail URL:', error);
			}
		}
	}
	thumbnailMap.clear();
	console.log('🗑️ All thumbnails cleared');
};

/**
 * 初期状態にリセット
 */
const reset = (): void => {
	// 全サムネイルをクリア（clearAll()がthumbnailMap.clear()を呼ぶ）
	clearAll();
};

export const thumbnailStore = {
	actions: {
		getThumbnailItem,
		loadThumbnail,
		ensureLoaded,
		preloadThumbnails,
		clearUnused,
		clearAll,
		reset
	}
};
