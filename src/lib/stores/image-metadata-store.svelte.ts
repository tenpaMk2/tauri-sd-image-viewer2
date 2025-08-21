import { invoke } from '@tauri-apps/api/core';
import { metadataQueueService } from '../services/metadata-queue-service.svelte';
import type { ImageMetadataInfo, SdParameters } from '../types/shared-types';

/**
 * メタデータロード状態
 */
type LoadingStatus = 'unloaded' | 'loading' | 'loaded';

/**
 * リアクティブな画像メタデータ（Promiseベース）
 */
export class ReactiveImageMetadata {
	imagePath: string;

	// 基本情報（$stateで管理、undefinedは未ロード状態）
	filename = $state<string | undefined>(undefined);
	width = $state<number | undefined>(undefined);
	height = $state<number | undefined>(undefined);
	fileSize = $state<number | undefined>(undefined);
	mimeType = $state<string | undefined>(undefined);

	// 評価・メタデータ（$stateで管理、undefinedは未ロード状態）
	rating = $state<number | undefined>(undefined);
	sdParameters = $state<SdParameters | undefined>(undefined);

	// ロード状態管理
	loadingStatus = $state<LoadingStatus>('unloaded');
	loadError = $state<string | undefined>(undefined);

	// 内部管理用
	private loadPromise?: Promise<void>;

	constructor(imagePath: string) {
		this.imagePath = imagePath;
	}


	/**
	 * メタデータの読み込み（一度だけ実行される）
	 */
	private async ensureLoaded(): Promise<void> {
		// 既にロード済みの場合は何もしない
		if (this.loadingStatus === 'loaded') {
			return;
		}

		// 既にロード中の場合は既存のPromiseを待つ
		if (this.loadPromise) {
			return this.loadPromise;
		}

		// キューサービス経由でロード処理を開始
		this.loadPromise = metadataQueueService.enqueue(this.imagePath).then(() => {
			this.loadPromise = undefined; // ロード完了時にPromiseをクリア
		});

		return this.loadPromise;
	}

	/**
	 * 自動ロードを開始する共通処理
	 */
	private triggerAutoLoad(propertyName: string): void {
		if (this.loadingStatus === 'unloaded') {
			this.loadingStatus = 'loading';
			this.ensureLoaded()
				.then(() => {
					this.loadingStatus = 'loaded';
				})
				.catch((error) => {
					this.loadingStatus = 'unloaded';
					console.error(
						'❌ Auto-load failed for ' +
							propertyName +
							': ' +
							this.imagePath.split('/').pop() +
							' ' +
							error
					);
				});
		}
	}
	/**
	 * Rating を同期的に取得（リアクティブ、自動ロード付き）
	 */
	get ratingValue(): number | undefined {
		this.triggerAutoLoad('rating');
		return this.rating;
	}

	/**
	 * SD Parameters を同期的に取得（リアクティブ、自動ロード付き）
	 */
	get sdParametersValue(): SdParameters | undefined {
		this.triggerAutoLoad('sdParameters');
		return this.sdParameters;
	}

	/**
	 * Width を同期的に取得（リアクティブ、自動ロード付き）
	 */
	get widthValue(): number | undefined {
		this.triggerAutoLoad('width');
		return this.width;
	}

	/**
	 * Height を同期的に取得（リアクティブ、自動ロード付き）
	 */
	get heightValue(): number | undefined {
		this.triggerAutoLoad('height');
		return this.height;
	}

	/**
	 * FileSize を同期的に取得（リアクティブ、自動ロード付き）
	 */
	get fileSizeValue(): number | undefined {
		this.triggerAutoLoad('fileSize');
		return this.fileSize;
	}

	/**
	 * MimeType を同期的に取得（リアクティブ、自動ロード付き）
	 */
	get mimeTypeValue(): string | undefined {
		this.triggerAutoLoad('mimeType');
		return this.mimeType;
	}

	/**
	 * メタデータの実際のロード処理（キューサービスから呼ばれる）
	 * @internal キューサービス専用メソッド - 直接呼び出し禁止
	 */
	async load(): Promise<void> {
		try {
			console.log('🔄 Loading metadata: ' + this.imagePath.split('/').pop());

			// Rust側からメタデータを取得
			const metadata = await invoke<ImageMetadataInfo>('read_image_metadata', {
				path: this.imagePath
			});

			// すべての$stateプロパティを一度に設定
			this.filename = this.imagePath.split('/').pop() || 'Unknown';
			this.width = metadata.width;
			this.height = metadata.height;
			this.fileSize = metadata.file_size;
			this.mimeType = metadata.mime_type;
			this.rating = metadata.rating ?? undefined;
			this.sdParameters = metadata.sd_parameters ?? undefined;

			// ロード状態を更新
			this.loadingStatus = 'loaded';

			console.log(
				'✅ Metadata loaded: ' + this.imagePath.split('/').pop() + ' rating=' + this.rating
			);
		} catch (error) {
			console.error('❌ Metadata load failed: ' + this.imagePath.split('/').pop() + ' ' + error);
			throw error; // エラーを再スロー
		}
	}

	/**
	 * Rating更新
	 */
	async updateRating(newRating: number): Promise<boolean> {
		try {
			console.log('🔄 Updating rating: ' + this.imagePath.split('/').pop() + ' -> ' + newRating);

			// Rust側でRating更新
			await invoke('write_xmp_image_rating', {
				srcPath: this.imagePath,
				rating: newRating
			});

			// リアクティブ状態を即座に更新
			this.rating = newRating;
			console.log('✅ Rating updated: ' + this.imagePath.split('/').pop() + ' = ' + newRating);

			return true;
		} catch (error) {
			console.error('❌ Rating update failed: ' + this.imagePath.split('/').pop() + ' ' + error);
			return false;
		}
	}

	/**
	 * メタデータの強制リロード
	 */
	async reload(): Promise<void> {
		// すべての$stateをundefinedにしてリセット
		this.filename = undefined;
		this.width = undefined;
		this.height = undefined;
		this.fileSize = undefined;
		this.mimeType = undefined;
		this.rating = undefined;
		this.sdParameters = undefined;
		this.loadError = undefined;
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
			rating: this.rating,
			loadingStatus: this.loadingStatus,
			loadError: this.loadError
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
			console.log('🆕 Creating metadata store: ' + imagePath.split('/').pop());
			const metadata = new ReactiveImageMetadata(imagePath);
			this.metadataMap.set(imagePath, metadata);

			// 新しいインスタンス作成時に自動的にロードを開始
			if (metadata.loadingStatus === 'unloaded') {
				metadata.load().catch((error: unknown) => {
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
		console.log('🔄 Preloading metadata for ' + imagePaths.length + ' images');

		const loadPromises = imagePaths.map((imagePath) => {
			const metadata = this.getMetadata(imagePath);
			if (metadata.loadingStatus === 'unloaded') {
				return metadata.load();
			}
			return Promise.resolve();
		});

		await Promise.all(loadPromises);
		console.log('✅ Preloading completed');
	}

	/**
	 * 未使用のメタデータをクリア
	 */
	clearUnused(currentImagePaths: string[]): void {
		const currentPathSet = new Set(currentImagePaths);
		let removedCount = 0;

		for (const [path] of this.metadataMap) {
			if (!currentPathSet.has(path)) {
				this.metadataMap.delete(path);
				removedCount++;
			}
		}

		if (removedCount > 0) {
			console.log('🗑️ Cleared ' + removedCount + ' unused metadata entries');
		}
	}

	/**
	 * 全メタデータをクリア
	 */
	clearAll(): void {
		this.metadataMap.clear();
		console.log('🗑️ All metadata cleared');
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
