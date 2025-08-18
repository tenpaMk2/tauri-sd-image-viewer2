import {
	imageMetadataStore,
	type ReactiveImageMetadata
} from '../stores/image-metadata-store.svelte';

/**
 * 新しいストアベース統合メタデータサービス
 * 従来のMetadataServiceを完全に置き換える簡素化されたAPI
 */
export class MetadataService {
	/**
	 * 画像のリアクティブメタデータを取得
	 */
	getReactiveMetadata(imagePath: string): ReactiveImageMetadata {
		return imageMetadataStore.getMetadata(imagePath);
	}

	/**
	 * 画像のメタデータを読み込み（従来互換API）
	 * @deprecated 新しいコードでは getReactiveMetadata() を使用してください
	 */
	async getMetadata(imagePath: string): Promise<any> {
		const metadata = imageMetadataStore.getMetadata(imagePath);
		await metadata.load();

		return {
			width: metadata.width,
			height: metadata.height,
			fileSize: metadata.fileSize,
			mimeType: metadata.mimeType,
			rating: metadata.rating,
			sdParameters: metadata.sdParameters
		};
	}

	/**
	 * レーティング値を取得（従来互換API）
	 * @deprecated 新しいコードでは getReactiveMetadata().rating を使用してください
	 */
	async getRating(imagePath: string): Promise<number | undefined> {
		const metadata = imageMetadataStore.getMetadata(imagePath);

		// 未読み込みの場合は読み込み
		if (!metadata.isLoaded && !metadata.isLoading) {
			await metadata.load();
		}

		return metadata.rating;
	}

	/**
	 * レーティングを更新（従来互換API）
	 * @deprecated 新しいコードでは getReactiveMetadata().updateRating() を使用してください
	 */
	async updateImageRating(imagePath: string, newRating: number): Promise<boolean> {
		const metadata = imageMetadataStore.getMetadata(imagePath);
		return await metadata.updateRating(newRating);
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
	 * メタデータを無効化して強制リロード
	 */
	async refreshMetadata(imagePath: string): Promise<any> {
		const metadata = imageMetadataStore.getMetadata(imagePath);
		await metadata.reload();

		return {
			width: metadata.width,
			height: metadata.height,
			fileSize: metadata.fileSize,
			mimeType: metadata.mimeType,
			rating: metadata.rating,
			sdParameters: metadata.sdParameters
		};
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

	/**
	 * 基本情報のみを軽量取得（従来互換API）
	 * @deprecated 新しいコードでは getReactiveMetadata() を使用してください
	 */
	async getBasicInfo(imagePath: string): Promise<any> {
		const metadata = imageMetadataStore.getMetadata(imagePath);
		await metadata.load();

		return {
			path: imagePath,
			file_size: metadata.fileSize,
			modified_time: Date.now(), // TODO: 実際の更新時刻対応
			width: metadata.width,
			height: metadata.height,
			mime_type: metadata.mimeType,
			rating: metadata.rating
		};
	}

	/**
	 * ファイルが変更されているかチェックして必要に応じてリフレッシュ
	 */
	async checkAndRefreshIfChanged(imagePath: string): Promise<any> {
		// 新しいストアでは常に最新状態なので、そのまま返却
		const metadata = imageMetadataStore.getMetadata(imagePath);

		if (!metadata.isLoaded) {
			await metadata.load();
		}

		return {
			width: metadata.width,
			height: metadata.height,
			fileSize: metadata.fileSize,
			mimeType: metadata.mimeType,
			rating: metadata.rating,
			sdParameters: metadata.sdParameters
		};
	}
}

/**
 * グローバルメタデータサービスインスタンス
 */
export const metadataService = new MetadataService();
