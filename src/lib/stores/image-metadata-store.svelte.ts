import { invoke } from '@tauri-apps/api/core';
import { metadataQueue } from '../services/image-file-access-queue-service.svelte';
import type { ImageMetadataInfo, SdParameters } from '../types/shared-types';

/**
 * メタデータロード状態
 */
type LoadingStatus = 'unloaded' | 'queued' | 'loading' | 'loaded' | 'error';

/**
 * メタデータの状態管理型定義
 */
type MetadataState = {
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
};

/**
 * リアクティブな画像メタデータ（Promiseベース）
 */
export class ReactiveImageMetadata {
	imagePath: string;

	// 全状態をオブジェクトにまとめて$stateで管理（Svelte 5推奨パターン）
	state = $state<MetadataState>({
		filename: undefined,
		width: undefined,
		height: undefined,
		fileSize: undefined,
		mimeType: undefined,
		rating: undefined,
		sdParameters: undefined,
		loadingStatus: 'unloaded',
		loadError: undefined
	});

	get loadingStatus(): LoadingStatus {
		return this.state.loadingStatus;
	}

	set loadingStatus(value: LoadingStatus) {
		this.state.loadingStatus = value;
	}

	// 直接プロパティアクセス用getter（互換性維持）
	get rating(): number | undefined {
		return this.state.rating;
	}

	get filename(): string | undefined {
		return this.state.filename;
	}

	get width(): number | undefined {
		return this.state.width;
	}

	get height(): number | undefined {
		return this.state.height;
	}

	get fileSize(): number | undefined {
		return this.state.fileSize;
	}

	get mimeType(): string | undefined {
		return this.state.mimeType;
	}

	get sdParameters(): SdParameters | undefined {
		return this.state.sdParameters;
	}

	get loadError(): string | undefined {
		return this.state.loadError;
	}

	// 内部管理用
	private loadPromise?: Promise<void>;

	constructor(imagePath: string) {
		this.imagePath = imagePath;
	}

	/**
	 * メタデータの読み込み（一度だけ実行される）
	 */
	async ensureLoaded(): Promise<void> {
		// 既にロード済みの場合は何もしない
		if (this.loadingStatus === 'loaded') {
			return;
		}

		// 既にロード中の場合は既存のPromiseを待つ
		if (this.loadPromise) {
			return this.loadPromise;
		}

		// 状態を'queued'に変更
		this.loadingStatus = 'queued';

		// キューサービス経由でロード処理を開始
		this.loadPromise = metadataQueue.enqueue(this.imagePath).then(() => {
			this.loadPromise = undefined; // ロード完了時にPromiseをクリア
		});

		return this.loadPromise;
	}

	/**
	 * Rating を同期的に取得（リアクティブ）
	 */
	get ratingValue(): number | undefined {
		return this.state.rating;
	}

	/**
	 * SD Parameters を同期的に取得（リアクティブ）
	 */
	get sdParametersValue(): SdParameters | undefined {
		return this.state.sdParameters;
	}

	/**
	 * Width を同期的に取得（リアクティブ）
	 */
	get widthValue(): number | undefined {
		return this.state.width;
	}

	/**
	 * Height を同期的に取得（リアクティブ）
	 */
	get heightValue(): number | undefined {
		return this.state.height;
	}

	/**
	 * FileSize を同期的に取得（リアクティブ）
	 */
	get fileSizeValue(): number | undefined {
		return this.state.fileSize;
	}

	/**
	 * MimeType を同期的に取得（リアクティブ）
	 */
	get mimeTypeValue(): string | undefined {
		return this.state.mimeType;
	} /**
	 * メタデータの実際のロード処理（キューサービスから呼ばれる）
	 * @internal キューサービス専用メソッド - 直接呼び出し禁止
	 */
	async load(): Promise<void> {
		try {
			// ロード開始時に状態を'loading'に変更
			this.loadingStatus = 'loading';

			// Rust側からメタデータを取得
			const metadata = await invoke<ImageMetadataInfo>('read_image_metadata', {
				path: this.imagePath
			});

			// すべての状態プロパティを一度に設定
			this.state.filename = this.imagePath.split('/').pop() || 'Unknown';
			this.state.width = metadata.width;
			this.state.height = metadata.height;
			this.state.fileSize = metadata.file_size;
			this.state.mimeType = metadata.mime_type;
			this.state.rating = metadata.rating ?? undefined;
			this.state.sdParameters = metadata.sd_parameters ?? undefined;

			// ロード状態を更新
			this.loadingStatus = 'loaded';
		} catch (error) {
			// エラー時の状態変更
			this.loadingStatus = 'error';
			this.state.loadError = String(error);
			throw error; // エラーを再スロー
		}
	}

	/**
	 * Rating更新
	 */
	async updateRating(newRating: number): Promise<boolean> {
		try {
			// Rust側でRating更新
			await invoke('write_xmp_image_rating', {
				srcPath: this.imagePath,
				rating: newRating
			});

			// リアクティブ状態を即座に更新
			this.state.rating = newRating;

			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * メタデータの強制リロード
	 */
	async reload(): Promise<void> {
		// すべての状態をundefinedにしてリセット
		this.state.filename = undefined;
		this.state.width = undefined;
		this.state.height = undefined;
		this.state.fileSize = undefined;
		this.state.mimeType = undefined;
		this.state.rating = undefined;
		this.state.sdParameters = undefined;
		this.state.loadError = undefined;
		this.loadPromise = undefined;
		this.loadingStatus = 'unloaded';

		await this.ensureLoaded();
	}

	/**
	 * デバッグ用の状態取得
	 */
	get debugInfo() {
		return {
			imagePath: this.imagePath,
			rating: this.state.rating,
			loadingStatus: this.loadingStatus,
			loadError: this.state.loadError
		};
	}
}

/**
 * グローバル画像メタデータストア
 */
class ImageMetadataStore {
	// 各画像のリアクティブメタデータ
	private metadataMap = new Map<string, ReactiveImageMetadata>();

	/**
	 * 画像のメタデータストアを取得（なければ作成）
	 */
	getMetadata(imagePath: string): ReactiveImageMetadata {
		if (!this.metadataMap.has(imagePath)) {
			const metadata = new ReactiveImageMetadata(imagePath);
			this.metadataMap.set(imagePath, metadata);

			// Store作成時に自動的にロードを開始
			if (metadata.loadingStatus === 'unloaded') {
				metadata.ensureLoaded().catch((error: unknown) => {
					console.error(
						'Failed to auto-load metadata for ' + imagePath.split('/').pop() + ': ' + error
					);
				});
			}
		}
		return this.metadataMap.get(imagePath)!;
	}
	/**
	 * 複数画像のメタデータを事前読み込み
	 */
	async preloadMetadata(imagePaths: string[]): Promise<void> {
		const loadPromises = imagePaths.map((imagePath) => {
			const metadata = this.getMetadata(imagePath);
			if (metadata.loadingStatus === 'unloaded') {
				return metadata.ensureLoaded();
			}
			return Promise.resolve();
		});

		await Promise.all(loadPromises);
	}

	/**
	 * 未使用のメタデータをクリア
	 */
	clearUnused(currentImagePaths: string[]): void {
		const currentPathSet = new Set(currentImagePaths);

		for (const [path] of this.metadataMap) {
			if (!currentPathSet.has(path)) {
				this.metadataMap.delete(path);
			}
		}
	}

	/**
	 * 全メタデータをクリア
	 */
	clearAll(): void {
		this.metadataMap.clear();
	}

	/**
	 * 同期的にレーティングマップを取得（フィルタリング用）
	 */
	getRatingsMapSync(imagePaths: string[]): Map<string, number | undefined> {
		const ratingsMap = new Map<string, number | undefined>();

		for (const imagePath of imagePaths) {
			const metadata = this.metadataMap.get(imagePath);
			// メタデータが存在し、ロード済みの場合のみレーティングを取得
			if (metadata && metadata.loadingStatus === 'loaded') {
				ratingsMap.set(imagePath, metadata.ratingValue);
			} else {
				// 未ロードの場合は undefined（未評価）として扱う
				ratingsMap.set(imagePath, undefined);
			}
		}

		return ratingsMap;
	}

	/**
	 * Rating書き込み処理を待機
	 */
	async waitForAllRatingWrites(): Promise<void> {
		// 現在の実装では即座に完了（必要に応じて実装を追加）
		return;
	}
}

/**
 * グローバルインスタンス
 */
export const imageMetadataStore = new ImageMetadataStore();
