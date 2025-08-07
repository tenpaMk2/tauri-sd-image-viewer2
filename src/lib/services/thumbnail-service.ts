import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { getImageFiles } from '../image/image-loader';
import type { BatchThumbnailResult, CachedMetadata } from '../types/shared-types';

// サムネイル処理のサービス
export class ThumbnailService {
	// メタデータキャッシュ
	private metadataCache = new Map<string, CachedMetadata>();

	async loadSingleThumbnail(imagePath: string): Promise<string | null> {
		try {
			const results: BatchThumbnailResult[] = await invoke('load_thumbnails_batch', {
				imagePaths: [imagePath]
			});

			const result = results[0];
			if (result?.thumbnail?.data) {
				const uint8Array = new Uint8Array(result.thumbnail.data);
				const blob = new Blob([uint8Array], { type: result.thumbnail.mime_type });
				const url = URL.createObjectURL(blob);

				if (result.cached_metadata) {
					this.metadataCache.set(result.path, result.cached_metadata);
				}

				return url;
			} else if (result?.error) {
				console.warn(`サムネイル生成失敗: ${result.path} - ${result.error}`);
			}
		} catch (error) {
			console.error(`サムネイル生成エラー: ${imagePath}`, error);
		}
		return null;
	}

	async loadThumbnailsIndividually(
		allImageFiles: string[],
		onThumbnailLoaded: (imagePath: string, thumbnailUrl: string | null) => void,
		onProgress?: (loadedCount: number, totalCount: number) => void
	): Promise<void> {
		let loadedCount = 0;

		const promises = allImageFiles.map(async (imagePath, index) => {
			await new Promise((resolve) => setTimeout(resolve, index * 50));

			const thumbnailUrl = await this.loadSingleThumbnail(imagePath);
			onThumbnailLoaded(imagePath, thumbnailUrl);

			loadedCount++;
			if (onProgress) {
				onProgress(loadedCount, allImageFiles.length);
			}
		});

		await Promise.all(promises);
	}

	async loadThumbnailsInChunksOptimized(
		allImageFiles: string[],
		chunkSize: number = 16,
		onChunkLoaded: (chunkResults: Map<string, string>) => void,
		onProgress?: (loadedCount: number, totalCount: number) => void
	): Promise<void> {
		const chunks: string[][] = [];
		for (let i = 0; i < allImageFiles.length; i += chunkSize) {
			chunks.push(allImageFiles.slice(i, i + chunkSize));
		}

		let loadedCount = 0;

		for (const [chunkIndex, chunk] of chunks.entries()) {
			try {
				const results: BatchThumbnailResult[] = await invoke('load_thumbnails_batch', {
					imagePaths: chunk
				});

				const chunkThumbnails = new Map<string, string>();

				for (const result of results) {
					if (result.thumbnail) {
						let thumbnailUrl: string;

						if (result.thumbnail.cache_path) {
							thumbnailUrl = convertFileSrc(result.thumbnail.cache_path);
						} else if (result.thumbnail.data && result.thumbnail.data.length > 0) {
							const uint8Array = new Uint8Array(result.thumbnail.data);
							const blob = new Blob([uint8Array], { type: result.thumbnail.mime_type });
							thumbnailUrl = URL.createObjectURL(blob);
						} else {
							console.warn(`サムネイル生成失敗 (データなし): ${result.path}`);
							continue;
						}

						chunkThumbnails.set(result.path, thumbnailUrl);

						if (result.cached_metadata) {
							this.metadataCache.set(result.path, result.cached_metadata);
						}

						loadedCount++;
					} else if (result.error) {
						console.warn(`サムネイル生成失敗: ${result.path} - ${result.error}`);
					}
				}

				if (chunkThumbnails.size > 0) {
					onChunkLoaded(chunkThumbnails);
				}

				if (onProgress) {
					onProgress(loadedCount, allImageFiles.length);
				}

				await new Promise((resolve) => setTimeout(resolve, 10));
			} catch (chunkError) {
				console.error(`チャンク ${chunkIndex + 1} 処理エラー:`, chunkError);
			}
		}
	}

	async loadThumbnailsInChunks(
		allImageFiles: string[],
		chunkSize: number = 16,
		onProgress?: (loadedCount: number, totalCount: number) => void,
		onChunkLoaded?: (chunkResults: Map<string, string>) => void
	): Promise<Map<string, string>> {
		const newThumbnails = new Map<string, string>();
		const chunks: string[][] = [];

		for (let i = 0; i < allImageFiles.length; i += chunkSize) {
			chunks.push(allImageFiles.slice(i, i + chunkSize));
		}

		let loadedCount = 0;

		for (const [chunkIndex, chunk] of chunks.entries()) {
			try {
				const results: BatchThumbnailResult[] = await invoke('load_thumbnails_batch', {
					imagePaths: chunk
				});

				const chunkThumbnails = new Map<string, string>();

				for (const result of results) {
					if (result.thumbnail && result.thumbnail.data) {
						const uint8Array = new Uint8Array(result.thumbnail.data);
						const blob = new Blob([uint8Array], { type: result.thumbnail.mime_type });
						const url = URL.createObjectURL(blob);
						newThumbnails.set(result.path, url);
						chunkThumbnails.set(result.path, url);

						if (result.cached_metadata) {
							this.metadataCache.set(result.path, result.cached_metadata);
						}

						loadedCount++;
					} else if (result.error) {
						console.warn(`サムネイル生成失敗: ${result.path} - ${result.error}`);
					}
				}

				if (onChunkLoaded && chunkThumbnails.size > 0) {
					onChunkLoaded(chunkThumbnails);
				}

				if (onProgress) {
					onProgress(loadedCount, allImageFiles.length);
				}

				await new Promise((resolve) => setTimeout(resolve, 10));
			} catch (chunkError) {
				console.error(`チャンク ${chunkIndex + 1} 処理エラー:`, chunkError);
			}
		}

		return newThumbnails;
	}

	async getImageFiles(directoryPath: string): Promise<string[]> {
		return await getImageFiles(directoryPath);
	}

	getImageMetadata(imagePath: string): CachedMetadata | undefined {
		return this.metadataCache.get(imagePath);
	}

	getImageRating(imagePath: string): number | undefined {
		const metadata = this.metadataCache.get(imagePath);
		return metadata?.rating;
	}

	async updateImageRating(imagePath: string, newRating: number): Promise<boolean> {
		try {
			await invoke('write_exif_image_rating', {
				path: imagePath,
				rating: newRating
			});

			const existingMetadata = this.metadataCache.get(imagePath);
			if (existingMetadata) {
				const updatedMetadata = {
					...existingMetadata,
					rating: newRating,
					cached_at: Date.now() / 1000
				};
				this.metadataCache.set(imagePath, updatedMetadata);
			} else {
				this.metadataCache.set(imagePath, {
					rating: newRating,
					exif_info: undefined,
					cached_at: Date.now() / 1000
				});
			}

			return true;
		} catch (error) {
			console.error('Rating更新に失敗:', imagePath, error);
			return false;
		}
	}

	cleanupThumbnails(thumbnails: Map<string, string>): void {
		for (const url of thumbnails.values()) {
			this.safeRevokeUrl(url);
		}
		this.metadataCache.clear();
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
		this.metadataCache.clear();
	}

	getCacheSize(): number {
		return this.metadataCache.size;
	}
}
