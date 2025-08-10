import { invoke } from '@tauri-apps/api/core';
import type { ImageMetadata } from '../image/types';
import { createImageMetadata } from '../image/utils';
import type { BasicImageInfo, ThumbnailCacheInfo } from '../types/shared-types';

/**
 * 軽量ファイル情報（変更検出用）
 */
type LightweightFileInfo = {
	fileHash: string;
};

/**
 * 統合メタデータキャッシュエントリ
 */
type UnifiedMetadataEntry = {
	imageMetadata: ImageMetadata;
	thumbnailCacheInfo?: ThumbnailCacheInfo;
	fileInfo: LightweightFileInfo;
	cachedAt: number;
};

/**
 * 統合メタデータサービス
 * グリッド表示（サムネイル）とシングル表示（ビューワー）の両方に対応
 */
export class UnifiedMetadataService {
	private cache = new Map<string, UnifiedMetadataEntry>();
	private loadingPromises = new Map<string, Promise<UnifiedMetadataEntry>>();
	private maxCacheSize = 100;

	// Rating書き込み中のファイルを管理（リアクティブ）
	// Setの代わりに配列を使用してより確実なリアクティビティを実現
	private writingFilesArray = $state<string[]>([]);


	/**
	 * 基本情報のみを軽量取得
	 */
	async getBasicInfo(imagePath: string): Promise<BasicImageInfo> {
		try {
			return await invoke<BasicImageInfo>('read_image_metadata_basic', { path: imagePath });
		} catch (error) {
			console.error('基本情報の取得に失敗: ' + imagePath + ' ' + error);
			throw new Error(`Failed to get basic info: ${imagePath}`);
		}
	}


	/**
	 * 画像メタデータを取得（キャッシュ対応）
	 */
	async getMetadata(imagePath: string): Promise<ImageMetadata> {
		const entry = await this.getUnifiedEntry(imagePath);
		return entry.imageMetadata;
	}

	/**
	 * サムネイル情報を取得
	 */
	async getThumbnailInfo(imagePath: string): Promise<ThumbnailCacheInfo | undefined> {
		try {
			const entry = await this.getUnifiedEntry(imagePath);
			return entry.thumbnailCacheInfo;
		} catch {
			return undefined;
		}
	}

	/**
	 * レーティング値を取得
	 */
	async getRating(imagePath: string): Promise<number | undefined> {
		try {
			// Rust側の軽量APIを直接使用
			const rating = await invoke<number | null>('read_image_metadata_rating', { path: imagePath });
			return rating ?? undefined;
		} catch (error) {
			console.warn('軽量Rating取得に失敗、キャッシュから取得:', imagePath, error);
			// フォールバック: キャッシュから取得
			const cacheInfo = await this.getThumbnailInfo(imagePath);
			return cacheInfo?.rating;
		}
	}

	/**
	 * レーティングを更新（ロック制御付き）
	 */
	async updateImageRating(imagePath: string, newRating: number): Promise<boolean> {
		// 既に書き込み中の場合は拒否
		if (this.writingFilesArray.includes(imagePath)) {
			console.warn('Rating書き込み中のためスキップ:', imagePath);
			return false;
		}

		// ロック取得（配列に追加）
		this.writingFilesArray.push(imagePath);

		try {
			await invoke('write_exif_image_rating', {
				path: imagePath,
				rating: newRating
			});

			// ファイル変更によりキャッシュを無効化（次回アクセス時に新しいハッシュで再読み込み）
			this.invalidateMetadata(imagePath);
			return true;
		} catch (error) {
			console.error('Rating更新に失敗: ' + imagePath + ' ' + error);
			return false;
		} finally {
			// ロック解除（配列から削除）
			const index = this.writingFilesArray.indexOf(imagePath);
			if (index > -1) {
				this.writingFilesArray.splice(index, 1);
			}
		}
	}

	/**
	 * 統合エントリを取得（内部メソッド）
	 */
	private async getUnifiedEntry(imagePath: string): Promise<UnifiedMetadataEntry> {
		// 既存キャッシュをチェック
		const cached = this.cache.get(imagePath);
		if (cached) {
			// 軽量変更検出
			if (await this.isFileUnchanged(imagePath, cached.fileInfo)) {
				return cached;
			}
			// 変更されている場合はキャッシュを削除
			this.cache.delete(imagePath);
		}

		// 読み込み中かチェック
		if (this.loadingPromises.has(imagePath)) {
			return await this.loadingPromises.get(imagePath)!;
		}

		// 新規読み込み
		const loadingPromise = this.loadAndCacheUnifiedEntry(imagePath);
		this.loadingPromises.set(imagePath, loadingPromise);

		try {
			const entry = await loadingPromise;
			return entry;
		} finally {
			this.loadingPromises.delete(imagePath);
		}
	}

	/**
	 * 統合エントリを読み込んでキャッシュ
	 */
	private async loadAndCacheUnifiedEntry(imagePath: string): Promise<UnifiedMetadataEntry> {
		// キャッシュサイズ制限チェック
		if (this.cache.size >= this.maxCacheSize) {
			this.evictOldestEntries(20);
		}

		// 現在のファイル情報を取得
		const fileInfo = await this.getCurrentFileInfo(imagePath);

		// 画像メタデータを取得
		const imageMetadata = await createImageMetadata(imagePath);

		// 統合エントリを作成
		const entry: UnifiedMetadataEntry = {
			imageMetadata,
			thumbnailCacheInfo: undefined, // 必要時に個別設定
			fileInfo,
			cachedAt: Date.now()
		};

		this.cache.set(imagePath, entry);
		return entry;
	}

	/**
	 * サムネイルキャッシュ情報を設定（GridPageからの呼び出し用）
	 */
	setThumbnailCacheInfo(imagePath: string, cacheInfo: ThumbnailCacheInfo): void {
		const entry = this.cache.get(imagePath);
		if (entry) {
			entry.thumbnailCacheInfo = cacheInfo;
		}
	}

	/**
	 * ハッシュベースファイル変更検出
	 */
	private async isFileUnchanged(
		imagePath: string,
		cachedFileInfo: LightweightFileInfo
	): Promise<boolean> {
		try {
			const currentFileInfo = await this.getCurrentFileInfo(imagePath);
			return currentFileInfo.fileHash === cachedFileInfo.fileHash;
		} catch {
			return false; // ファイルアクセス不可 = 変更とみなす
		}
	}

	/**
	 * 現在のファイル情報を取得
	 */
	private async getCurrentFileInfo(imagePath: string): Promise<LightweightFileInfo> {
		const fileHash = await invoke<string>('calculate_file_hash_api', { path: imagePath });
		return {
			fileHash
		};
	}

	/**
	 * 古いエントリを削除
	 */
	private evictOldestEntries(count: number): void {
		const entries = Array.from(this.cache.entries());
		entries.sort(([, a], [, b]) => a.cachedAt - b.cachedAt);
		const toEvict = entries.slice(0, count);

		toEvict.forEach(([path]) => {
			this.cache.delete(path);
		});
	}

	/**
	 * メタデータを無効化
	 */
	invalidateMetadata(imagePath: string): void {
		this.cache.delete(imagePath);
		this.loadingPromises.delete(imagePath);
	}


	/**
	 * メタデータを更新
	 */
	async refreshMetadata(imagePath: string): Promise<ImageMetadata> {
		this.invalidateMetadata(imagePath);
		return await this.getMetadata(imagePath);
	}

	/**
	 * キャッシュをクリア
	 */
	clearCache(): void {
		this.cache.clear();
		this.loadingPromises.clear();
	}

	/**
	 * 全てのRating書き込み処理の完了を待機
	 */
	async waitForAllRatingWrites(): Promise<void> {
		let maxWait = 50; // 5秒の最大待機時間
		while (this.writingFilesArray.length > 0 && maxWait > 0) {
			await new Promise(resolve => setTimeout(resolve, 100));
			maxWait--;
		}
		
		if (this.writingFilesArray.length > 0) {
			console.warn('Rating書き込み処理のタイムアウト:', this.writingFilesArray);
			// 強制的にクリア（安全のため）
			this.writingFilesArray.length = 0;
		}
	}

	/**
	 * キャッシュサイズを取得
	 */
	getCacheSize(): number {
		return this.cache.size;
	}

	/**
	 * メタデータがキャッシュされているかチェック
	 */
	hasMetadata(imagePath: string): boolean {
		return this.cache.has(imagePath);
	}

	/**
	 * Rating書き込み中のファイル一覧を取得（リアクティブ追跡用）
	 */
	get currentWritingFiles(): readonly string[] {
		return this.writingFilesArray;
	}

	/**
	 * Rating書き込み中かどうかをチェック（リアクティブ）
	 */
	isRatingWriting(imagePath: string): boolean {
		return this.writingFilesArray.includes(imagePath);
	}

	/**
	 * ファイルが変更されているかナビゲーション時にチェック
	 */
	async checkAndRefreshIfChanged(imagePath: string): Promise<ImageMetadata> {
		const cached = this.cache.get(imagePath);
		if (cached) {
			// ハッシュベース変更検出
			if (!(await this.isFileUnchanged(imagePath, cached.fileInfo))) {
				// 変更があればキャッシュを無効化して再読み込み
				this.invalidateMetadata(imagePath);
			}
		}
		return await this.getMetadata(imagePath);
	}

}

/**
 * グローバル統合メタデータサービスインスタンス
 */
export const unifiedMetadataService = new UnifiedMetadataService();
