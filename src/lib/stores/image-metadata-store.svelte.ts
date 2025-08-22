import { invoke } from '@tauri-apps/api/core';
import { metadataQueue } from '../services/image-file-access-queue-service.svelte';
import type { ImageMetadataInfo, SdParameters } from '../types/shared-types';

/**
 * メタデータロード状態
 */
type LoadingStatus = 'unloaded' | 'queued' | 'loading' | 'loaded' | 'error';

type MetadataItemState = {
	// 基本情報（undefinedは未ロード状態）
	filename: string | undefined;
	width: number | undefined;
	height: number | undefined;
	fileSize: number | undefined;
	mimeType: string | undefined;
	// 評価・メタデータ（undefinedは未ロード状態）
	rating: number | undefined;
	sdParameters: SdParameters | undefined;
	// ロード状態管理
	loadingStatus: LoadingStatus;
	loadError: string | undefined;
	loadPromise: Promise<void> | undefined;
};

// 通常のMapを使用し、valueを$stateでリアクティブ管理
const metadataMap = new Map<string, MetadataItemState>();

/**
 * メタデータアイテムを取得（なければ作成）
 */
const getMetadataItem = (imagePath: string): MetadataItemState => {
	if (!metadataMap.has(imagePath)) {
		const item = $state<MetadataItemState>({
			filename: undefined,
			width: undefined,
			height: undefined,
			fileSize: undefined,
			mimeType: undefined,
			rating: undefined,
			sdParameters: undefined,
			loadingStatus: 'unloaded',
			loadError: undefined,
			loadPromise: undefined
		});
		metadataMap.set(imagePath, item);
	}
	return metadataMap.get(imagePath)!;
};

/**
 * メタデータの読み込み（一度だけ実行される）
 */
const ensureLoaded = async (imagePath: string): Promise<void> => {
	const item = getMetadataItem(imagePath);

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
	item.loadPromise = metadataQueue.enqueue(imagePath).then(() => {
		item.loadPromise = undefined; // ロード完了時にPromiseをクリア
	});

	return item.loadPromise;
};

/**
 * メタデータの実際のロード処理（キューサービスから呼ばれる）
 * @internal キューサービス専用メソッド - 直接呼び出し禁止
 */
const loadMetadata = async (imagePath: string): Promise<void> => {
	const item = getMetadataItem(imagePath);

	try {
		// ロード開始時に状態を'loading'に変更
		item.loadingStatus = 'loading';

		// Rust側からメタデータを取得
		const metadata = await invoke<ImageMetadataInfo>('read_image_metadata', {
			path: imagePath
		});

		// すべての状態プロパティを一度に設定
		item.filename = imagePath.split('/').pop() || 'Unknown';
		item.width = metadata.width;
		item.height = metadata.height;
		item.fileSize = metadata.file_size;
		item.mimeType = metadata.mime_type;
		item.rating = metadata.rating ?? undefined;
		item.sdParameters = metadata.sd_parameters ?? undefined;

		// ロード状態を更新
		item.loadingStatus = 'loaded';
	} catch (error) {
		// エラー時の状態変更
		item.loadingStatus = 'error';
		item.loadError = String(error);
		throw error; // エラーを再スロー
	}
};

/**
 * Rating更新
 */
const updateRating = async (imagePath: string, newRating: number): Promise<boolean> => {
	try {
		// Rust側でRating更新
		await invoke('write_xmp_image_rating', {
			srcPath: imagePath,
			rating: newRating
		});

		// リアクティブ状態を即座に更新
		const item = getMetadataItem(imagePath);
		item.rating = newRating;

		return true;
	} catch (error) {
		return false;
	}
};

/**
 * メタデータの強制リロード
 */
const reloadMetadata = async (imagePath: string): Promise<void> => {
	const item = getMetadataItem(imagePath);

	// すべての状態をundefinedにしてリセット
	item.filename = undefined;
	item.width = undefined;
	item.height = undefined;
	item.fileSize = undefined;
	item.mimeType = undefined;
	item.rating = undefined;
	item.sdParameters = undefined;
	item.loadError = undefined;
	item.loadPromise = undefined;
	item.loadingStatus = 'unloaded';

	await ensureLoaded(imagePath);
};

/**
 * 複数画像のメタデータを事前読み込み
 */
const preloadMetadata = async (imagePaths: string[]): Promise<void> => {
	const loadPromises = imagePaths.map((imagePath) => {
		const item = getMetadataItem(imagePath);
		if (item.loadingStatus === 'unloaded') {
			return ensureLoaded(imagePath);
		}
		return Promise.resolve();
	});

	await Promise.all(loadPromises);
};

/**
 * 未使用のメタデータをクリア
 */
const clearUnused = (currentImagePaths: string[]): void => {
	const currentPathSet = new Set(currentImagePaths);

	for (const [path] of metadataMap) {
		if (!currentPathSet.has(path)) {
			metadataMap.delete(path);
		}
	}
};

/**
 * 全メタデータをクリア
 */
const clearAll = (): void => {
	metadataMap.clear();
};

/**
 * 同期的にレーティングマップを取得（フィルタリング用）
 */
const getRatingsMapSync = (imagePaths: string[]): Map<string, number | undefined> => {
	const ratingsMap = new Map<string, number | undefined>();

	for (const imagePath of imagePaths) {
		const item = metadataMap.get(imagePath);
		// メタデータが存在し、ロード済みの場合のみレーティングを取得
		if (item && item.loadingStatus === 'loaded') {
			ratingsMap.set(imagePath, item.rating);
		} else {
			// 未ロードの場合は undefined（未評価）として扱う
			ratingsMap.set(imagePath, undefined);
		}
	}

	return ratingsMap;
};

/**
 * Rating書き込み処理を待機
 */
const waitForAllRatingWrites = async (): Promise<void> => {
	// 現在の実装では即座に完了（必要に応じて実装を追加）
	return;
};

/**
 * 初期状態にリセット
 */
const reset = (): void => {
	// 全メタデータをクリア（clearAll()がmetadataMap.clear()を呼ぶ）
	clearAll();
};

// プロパティアクセス用のヘルパー関数
const getRating = (imagePath: string): number | undefined => {
	const item = metadataMap.get(imagePath);
	return item?.rating;
};

const getWidth = (imagePath: string): number | undefined => {
	const item = metadataMap.get(imagePath);
	return item?.width;
};

const getHeight = (imagePath: string): number | undefined => {
	const item = metadataMap.get(imagePath);
	return item?.height;
};

const getFileSize = (imagePath: string): number | undefined => {
	const item = metadataMap.get(imagePath);
	return item?.fileSize;
};

const getMimeType = (imagePath: string): string | undefined => {
	const item = metadataMap.get(imagePath);
	return item?.mimeType;
};

const getSdParameters = (imagePath: string): SdParameters | undefined => {
	const item = metadataMap.get(imagePath);
	return item?.sdParameters;
};

const getLoadingStatus = (imagePath: string): LoadingStatus => {
	const item = metadataMap.get(imagePath);
	return item?.loadingStatus || 'unloaded';
};

const getLoadError = (imagePath: string): string | undefined => {
	const item = metadataMap.get(imagePath);
	return item?.loadError;
};

export const imageMetadataStore = {
	actions: {
		getMetadataItem,
		ensureLoaded,
		loadMetadata,
		updateRating,
		reloadMetadata,
		preloadMetadata,
		clearUnused,
		clearAll,
		getRatingsMapSync,
		waitForAllRatingWrites,
		reset,
		// プロパティアクセス用
		getRating,
		getWidth,
		getHeight,
		getFileSize,
		getMimeType,
		getSdParameters,
		getLoadingStatus,
		getLoadError
	}
};
