import { invoke } from '@tauri-apps/api/core';
import { readFile } from '@tauri-apps/plugin-fs';
import { getImageFiles } from '../image/image-loader';
import type { ThumbnailCacheInfo, ThumbnailResult } from '../types/shared-types';
import { unifiedMetadataService } from './unified-metadata-service.svelte';

// サムネイル処理のサービス（統合メタデータサービス対応版）
export class ThumbnailService {
	// 注意: メタデータキャッシュは統合サービスに移行済み

	async loadSingleThumbnail(imagePath: string): Promise<string | null> {
		try {
			const results: ThumbnailResult[] = await invoke('generate_thumbnails_batch', {
				imagePaths: [imagePath]
			});

			const result = results[0];
			if (result?.thumbnail_path) {
				try {
					// tauri-fsでファイルを読み込んでBlobURL生成
					const fileData = await readFile(result.thumbnail_path);
					const blob = new Blob([new Uint8Array(fileData)], { type: 'image/webp' });
					const url = URL.createObjectURL(blob);

					// サムネイルファイル読み込み完了

					// サムネイルキャッシュ情報は新しいAPIでは直接提供されない

					return url;
				} catch (readError) {
					console.error(
						'🚨 単一サムネイルファイル読み込みエラー: ' +
							JSON.stringify({
								path: result.thumbnail_path,
								error: readError
							})
					);
					return null;
				}
			} else if (result?.error) {
				console.warn(`サムネイル生成失敗: ${result.original_path} - ${result.error}`);
			}
		} catch (error) {
			console.error('サムネイル生成エラー: ' + imagePath + ' ' + error);
		}
		return null;
	}

	async getImageFiles(directoryPath: string): Promise<string[]> {
		return await getImageFiles(directoryPath);
	}

	async getImageMetadata(imagePath: string): Promise<ThumbnailCacheInfo | undefined> {
		return await unifiedMetadataService.getThumbnailInfo(imagePath);
	}

	async getImageRating(imagePath: string): Promise<number | undefined> {
		return await unifiedMetadataService.getRating(imagePath);
	}

	async updateImageRating(imagePath: string, newRating: number): Promise<boolean> {
		return await unifiedMetadataService.updateImageRating(imagePath, newRating);
	}

	cleanupThumbnails(thumbnails: Map<string, string>): void {
		for (const url of thumbnails.values()) {
			this.safeRevokeUrl(url);
		}
		// 注意: メタデータクリアは統合サービスで管理
	}

	private safeRevokeUrl(url: string): void {
		try {
			if (url && url.startsWith('blob:')) {
				URL.revokeObjectURL(url);
			}
		} catch (error) {
			console.warn('Failed to revoke thumbnail URL:', url, error);
		}
	}

	clearMetadataCache(): void {
		unifiedMetadataService.clearCache();
	}

	getCacheSize(): number {
		return unifiedMetadataService.getCacheSize();
	}

	/**
	 * バッチサムネイル処理（統一エントリーポイント）
	 */
	async processThumbnailBatch(imagePaths: string[]): Promise<Map<string, string>> {
		const results = new Map<string, string>();
		
		try {
			const thumbnailResults: ThumbnailResult[] = await invoke('generate_thumbnails_batch', {
				imagePaths: imagePaths
			});

			for (const result of thumbnailResults) {
				if (result.thumbnail_path) {
					try {
						const fileData = await readFile(result.thumbnail_path);
						const blob = new Blob([new Uint8Array(fileData)], { type: 'image/webp' });
						const url = URL.createObjectURL(blob);
						results.set(result.original_path, url);
					} catch (readError) {
						console.error('Thumbnail file read error: ' + result.original_path + ' ' + readError);
					}
				} else if (result.error) {
					console.warn('Thumbnail generation failed: ' + result.original_path + ' - ' + result.error);
				}
			}
		} catch (error) {
			console.error('Batch thumbnail processing error: ' + error);
		}

		return results;
	}

	/**
	 * 既存APIとの互換性のため残しておく（削除予定）
	 */
	stopCurrentQueue(): void {
		console.warn('stopCurrentQueue is deprecated. Use ThumbnailQueueManager instead.');
	}


}
