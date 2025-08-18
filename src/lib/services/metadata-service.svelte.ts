import { imageMetadataStore, type ReactiveImageMetadata } from '../stores/image-metadata-store.svelte';

/**
 * 新しいストアベース統合メタデータサービス
 */
export class MetadataService {
	/**
	 * 画像のリアクティブメタデータを取得
	 */
	getReactiveMetadata(imagePath: string): ReactiveImageMetadata {
		return imageMetadataStore.getMetadata(imagePath);
	}

	/**
	 * 複数画像のメタデータを事前読み込み
	 */
	async preloadMetadata(imagePaths: string[]): Promise<void> {
		await imageMetadataStore.preloadMetadata(imagePaths);
	}

	/**
	 * 未使用のメタデータをクリア
	 */
	clearUnusedMetadata(currentImagePaths: string[]): void {
		imageMetadataStore.clearUnused(currentImagePaths);
	}

	/**
	 * 全メタデータをクリア
	 */
	clearAllMetadata(): void {
		imageMetadataStore.clearAll();
	}

	/**
	 * キャッシュサイズを取得
	 */
	getCacheSize(): number {
		return imageMetadataStore.cacheSize;
	}

	/**
	 * メタデータがキャッシュされているかチェック
	 */
	hasMetadata(imagePath: string): boolean {
		const metadata = imageMetadataStore.getMetadata(imagePath);
		return metadata.isLoaded;
	}
}

/**
 * グローバルメタデータサービスインスタンス
 */
export const metadataService = new MetadataService();