import { invoke, Channel } from '@tauri-apps/api/core';
import { getImageFiles } from '../image/image-loader';
import type { ThumbnailCacheInfo } from '../types/shared-types';
import { unifiedMetadataService } from './unified-metadata-service.svelte';

// 画像処理・メタデータ操作サービス
// サムネイル生成、ファイル操作、メタデータアクセスを担当
export class ThumbnailService {

	async loadSingleThumbnail(imagePath: string): Promise<string | null> {
		return new Promise((resolve, reject) => {
			try {
				const channel = new Channel<Uint8Array>();
				
				// Set up channel listener
				channel.onmessage = (data) => {
					try {
						// Convert Uint8Array to Blob and create URL
						const blob = new Blob([new Uint8Array(data)], { type: 'image/webp' });
						const url = URL.createObjectURL(blob);
						resolve(url);
					} catch (error) {
						console.error('Failed to process thumbnail data for ' + imagePath + ':', error);
						resolve(null);
					}
				};

				// Generate thumbnail asynchronously
				invoke('generate_thumbnail_async', {
					imagePath,
					config: null,
					channel
				}).catch((error) => {
					console.error('Failed to generate thumbnail for ' + imagePath + ':', error);
					resolve(null);
				});

			} catch (error) {
				console.error('Thumbnail generation error for ' + imagePath + ':', error);
				resolve(null);
			}
		});
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
	 * 単体テスト・デバッグ用の非同期サムネイル処理
	 * 通常のアプリケーションではAsyncThumbnailQueueを使用してください
	 */
	async processThumbnailsAsync(
		imagePaths: string[], 
		onThumbnailReady: (imagePath: string, thumbnailUrl: string) => void,
		onProgress?: (completed: number, total: number) => void,
		onError?: (imagePath: string, error: string) => void
	): Promise<void> {
		const total = imagePaths.length;
		let completed = 0;

		const promises = imagePaths.map(async (imagePath) => {
			try {
				const thumbnailUrl = await this.loadSingleThumbnail(imagePath);
				if (thumbnailUrl) {
					onThumbnailReady(imagePath, thumbnailUrl);
				} else {
					onError?.(imagePath, 'Failed to generate thumbnail');
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				onError?.(imagePath, errorMessage);
			} finally {
				completed++;
				onProgress?.(completed, total);
			}
		});

		await Promise.all(promises);
	}
}
