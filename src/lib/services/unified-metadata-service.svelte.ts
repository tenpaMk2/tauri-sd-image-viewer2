import { invoke } from '@tauri-apps/api/core';
import { stat } from '@tauri-apps/plugin-fs';
import type { ImageMetadata } from '../image/types';
import { createImageMetadata } from '../image/utils';
import type { ThumbnailCacheInfo } from '../types/shared-types';
import type { Result } from '../types/result';
import { Err, Ok, asyncTry } from '../types/result';

/**
 * 軽量ファイル情報（変更検出用）
 */
type LightweightFileInfo = {
	size: number;
	mtime: number;
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
	 * 画像メタデータを取得（ViewerPage用）
	 */
	async getImageMetadata(imagePath: string): Promise<Result<ImageMetadata, string>> {
		try {
			const entry = await this.getUnifiedEntry(imagePath);
			return Ok(entry.imageMetadata);
		} catch (error) {
			return Err(error instanceof Error ? error.message : String(error));
		}
	}

	/**
	 * 画像メタデータを取得（Unsafe版）
	 */
	async getImageMetadataUnsafe(imagePath: string): Promise<ImageMetadata> {
		const entry = await this.getUnifiedEntry(imagePath);
		return entry.imageMetadata;
	}

	/**
	 * サムネイルキャッシュ情報を取得（GridPage用）
	 */
	async getThumbnailCacheInfo(imagePath: string): Promise<ThumbnailCacheInfo | undefined> {
		try {
			const entry = await this.getUnifiedEntry(imagePath);
			return entry.thumbnailCacheInfo;
		} catch {
			return undefined;
		}
	}

	/**
	 * レーティング情報を取得
	 */
	async getImageRating(imagePath: string): Promise<number | undefined> {
		const cacheInfo = await this.getThumbnailCacheInfo(imagePath);
		return cacheInfo?.rating;
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

			// キャッシュされたrating情報のみを更新（重い再読み込みを回避）
			this.updateCachedRating(imagePath, newRating);
			return true;
		} catch (error) {
			console.error('Rating更新に失敗:', imagePath, error);
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
	 * 軽量なファイル変更検出
	 */
	private async isFileUnchanged(
		imagePath: string,
		cachedFileInfo: LightweightFileInfo
	): Promise<boolean> {
		try {
			const currentFileInfo = await this.getCurrentFileInfo(imagePath);
			return (
				currentFileInfo.size === cachedFileInfo.size &&
				currentFileInfo.mtime === cachedFileInfo.mtime
			);
		} catch {
			return false; // ファイルアクセス不可 = 変更とみなす
		}
	}

	/**
	 * 現在のファイル情報を取得
	 */
	private async getCurrentFileInfo(imagePath: string): Promise<LightweightFileInfo> {
		const stats = await stat(imagePath);
		return {
			size: stats.size,
			mtime: stats.mtime ? Math.floor(Number(stats.mtime) / 1000) : 0 // ミリ秒を秒に変換
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
	async refreshMetadata(imagePath: string): Promise<Result<ImageMetadata, string>> {
		this.invalidateMetadata(imagePath);
		return await this.getImageMetadata(imagePath);
	}

	/**
	 * メタデータを更新（Unsafe版）
	 */
	async refreshMetadataUnsafe(imagePath: string): Promise<ImageMetadata> {
		this.invalidateMetadata(imagePath);
		return await this.getImageMetadataUnsafe(imagePath);
	}

	/**
	 * キャッシュをクリア
	 */
	clearCache(): void {
		this.cache.clear();
		this.loadingPromises.clear();
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
	 * キャッシュされたRating情報のみを更新（軽量処理）
	 */
	private updateCachedRating(imagePath: string, newRating: number): void {
		const entry = this.cache.get(imagePath);
		if (entry) {
			// ImageMetadataのrating更新
			if (entry.imageMetadata.exifInfo) {
				entry.imageMetadata.exifInfo.rating = newRating;
			}
			// ThumbnailCacheInfoのrating更新
			if (entry.thumbnailCacheInfo) {
				entry.thumbnailCacheInfo.rating = newRating;
			}
		}
	}
}

/**
 * グローバル統合メタデータサービスインスタンス
 */
export const unifiedMetadataService = new UnifiedMetadataService();
