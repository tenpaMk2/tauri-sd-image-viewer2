import { invoke } from '@tauri-apps/api/core';
import type { ImageMetadataInfo, SdParameters } from '../types/shared-types';

/**
 * リアクティブな画像メタデータ
 */
export class ReactiveImageMetadata {
	imagePath: string;

	// 基本情報
	filename = $state<string | undefined>(undefined);
	width = $state<number | undefined>(undefined);
	height = $state<number | undefined>(undefined);
	fileSize = $state<number | undefined>(undefined);
	mimeType = $state<string | undefined>(undefined);

	// 評価・メタデータ
	rating = $state<number | undefined>(undefined);
	sdParameters = $state<SdParameters | undefined>(undefined);

	// 読み込み状態
	isLoading = $state(false);
	isLoaded = $state(false);
	loadError = $state<string | undefined>(undefined);

	constructor(imagePath: string) {
		this.imagePath = imagePath;
	}

	/**
	 * 必要に応じて自動読み込みを実行
	 */
	private ensureLoaded(): void {
		if (!this.isLoaded && !this.isLoading) {
			this.load();
		}
	}

	/**
	 * 自動読み込み付きのratingアクセサ
	 */
	get autoRating(): number | undefined {
		this.ensureLoaded();
		return this.rating;
	}

	/**
	 * 自動読み込み付きのsdParametersアクセサ
	 */
	get autoSdParameters(): SdParameters | undefined {
		this.ensureLoaded();
		return this.sdParameters;
	}

	/**
	 * 自動読み込み付きの基本情報アクセサ
	 */
	get autoWidth(): number | undefined {
		this.ensureLoaded();
		return this.width;
	}

	get autoHeight(): number | undefined {
		this.ensureLoaded();
		return this.height;
	}

	get autoFileSize(): number | undefined {
		this.ensureLoaded();
		return this.fileSize;
	}

	get autoMimeType(): string | undefined {
		this.ensureLoaded();
		return this.mimeType;
	}

	/**
	 * メタデータの非同期読み込み
	 */
	async load(): Promise<void> {
		if (this.isLoaded || this.isLoading) return;

		this.isLoading = true;
		this.loadError = undefined;

		try {
			console.log('🔄 Loading metadata: ' + this.imagePath.split('/').pop());

			// Rust側からメタデータを取得
			const metadata = await invoke<ImageMetadataInfo>('read_image_metadata', {
				path: this.imagePath
			});

			// リアクティブ状態を更新
			this.filename = this.imagePath.split('/').pop() || 'Unknown';
			this.width = metadata.width;
			this.height = metadata.height;
			this.fileSize = metadata.file_size;
			this.mimeType = metadata.mime_type;
			this.rating = metadata.rating ?? undefined;
			this.sdParameters = metadata.sd_parameters ?? undefined;

			this.isLoaded = true;
			console.log(
				'✅ Metadata loaded: ' + this.imagePath.split('/').pop() + ' rating=' + this.rating
			);
		} catch (error) {
			console.error('❌ Metadata load failed: ' + this.imagePath.split('/').pop() + ' ' + error);
			this.loadError = error instanceof Error ? error.message : String(error);
		} finally {
			this.isLoading = false;
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
		this.isLoaded = false;
		this.loadError = undefined;
		await this.load();
	}

	/**
	 * 強制再読み込み（旧関数名に対応）
	 */
	async forceReload(): Promise<void> {
		return this.reload();
	}

	/**
	 * デバッグ用の状態取得
	 */
	get debugInfo() {
		return {
			imagePath: this.imagePath,
			rating: this.rating,
			isLoaded: this.isLoaded,
			isLoading: this.isLoading,
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
			this.metadataMap.set(imagePath, new ReactiveImageMetadata(imagePath));
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
			if (!metadata.isLoaded && !metadata.isLoading) {
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

		for (const [path, metadata] of this.metadataMap) {
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
	 * 現在のキャッシュサイズ取得
	 */
	get cacheSize(): number {
		return this.metadataMap.size;
	}

	/**
	 * Rating書き込み処理を待機
	 */
	async waitForAllRatingWrites(): Promise<void> {
		// 現在の実装では即座に完了（必要に応じて実装を追加）
		return;
	}

	/**
	 * 強制再読み込み（特定画像のキャッシュを無効化して再読み込み）
	 */
	async forceReload(imagePath: string): Promise<void> {
		const metadata = this.metadataMap.get(imagePath);
		if (metadata) {
			await metadata.reload();
		}
	}

	/**
	 * ファイル削除後のキャッシュクリア（内部処理：削除された画像のメタデータキャッシュを無効化）
	 */
	invalidateMetadata(imagePath: string): void {
		const metadata = this.metadataMap.get(imagePath);
		if (metadata) {
			// 状態をリセット
			metadata.isLoaded = false;
			metadata.loadError = undefined;
			metadata.filename = undefined;
			metadata.width = undefined;
			metadata.height = undefined;
			metadata.fileSize = undefined;
			metadata.mimeType = undefined;
			metadata.rating = undefined;
			metadata.sdParameters = undefined;
		}
	}

	/**
	 * デバッグ用の状態取得
	 */
	get debugInfo() {
		const entries = Array.from(this.metadataMap.entries()).map(([path, metadata]) => ({
			path: path.split('/').pop(),
			...metadata.debugInfo
		}));

		return {
			cacheSize: this.cacheSize,
			entries
		};
	}
}

/**
 * グローバルインスタンス
 */
export const imageMetadataStore = new ImageMetadataStore();

/**
 * 開発用: グローバルに公開
 */
if (typeof window !== 'undefined') {
	(window as any).imageMetadataStore = imageMetadataStore;
}
