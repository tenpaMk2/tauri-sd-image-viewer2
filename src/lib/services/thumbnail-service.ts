import { invoke } from '@tauri-apps/api/core';
import { readFile } from '@tauri-apps/plugin-fs';
import { getImageFiles } from '../image/image-loader';
import type { BatchThumbnailPathResult, ThumbnailCacheInfo } from '../types/shared-types';
import { unifiedMetadataService } from './unified-metadata-service.svelte';

// サムネイル処理のサービス（統合メタデータサービス対応版）
export class ThumbnailService {
	// 注意: メタデータキャッシュは統合サービスに移行済み

	async loadSingleThumbnail(imagePath: string): Promise<string | null> {
		try {
			const results: BatchThumbnailPathResult[] = await invoke('load_thumbnails_batch_path_only', {
				imagePaths: [imagePath]
			});

			const result = results[0];
			if (result?.thumbnail?.cache_path) {
				try {
					// tauri-fsでファイルを読み込んでBlobURL生成
					const fileData = await readFile(result.thumbnail.cache_path);
					const blob = new Blob([new Uint8Array(fileData)], { type: result.thumbnail.mime_type });
					const url = URL.createObjectURL(blob);

					// サムネイルファイル読み込み完了

					if (result.cache_info) {
						unifiedMetadataService.setThumbnailCacheInfo(result.path, result.cache_info);
					}

					return url;
				} catch (readError) {
					console.error('🚨 単一サムネイルファイル読み込みエラー:', {
						path: result.thumbnail.cache_path,
						error: readError
					});
					return null;
				}
			} else if (result?.error) {
				console.warn(`サムネイル生成失敗: ${result.path} - ${result.error}`);
			}
		} catch (error) {
			console.error(`サムネイル生成エラー: ${imagePath}`, error);
		}
		return null;
	}

	async getImageFiles(directoryPath: string): Promise<string[]> {
		return await getImageFiles(directoryPath);
	}

	async getImageMetadata(imagePath: string): Promise<ThumbnailCacheInfo | undefined> {
		return await unifiedMetadataService.getThumbnailCacheInfo(imagePath);
	}

	async getImageRating(imagePath: string): Promise<number | undefined> {
		return await unifiedMetadataService.getImageRating(imagePath);
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

	// 現在のキューを停止
	stopCurrentQueue(): void {
		// シンプルキューを停止
		this.stopSimpleQueue();
	}

	// シンプルなキューベースサムネイル生成（キュー停止機能付き）
	private stopQueue = false;

	async loadThumbnailsWithSimpleQueue(
		allImageFiles: string[],
		onChunkComplete: (chunkResults: Map<string, string>) => void,
		onProgress?: (loadedCount: number, totalCount: number) => void
	): Promise<Map<string, string>> {
		const newThumbnails = new Map<string, string>();
		const chunks: string[][] = [];

		for (let i = 0; i < allImageFiles.length; i += 16) {
			chunks.push(allImageFiles.slice(i, i + 16));
		}

		let loadedCount = 0;
		this.stopQueue = false; // 停止フラグをリセット

		for (const [chunkIndex, chunk] of chunks.entries()) {
			if (this.stopQueue) {
				console.log('Queue stopped by request');
				break;
			}

			try {
				const results: BatchThumbnailPathResult[] = await invoke(
					'load_thumbnails_batch_path_only',
					{
						imagePaths: chunk
					}
				);

				// デバッグ：SimpleQueueからのRustレスポンス詳細確認
				console.log('🔧 SimpleQueue CRITICAL DEBUG:', {
					chunkIndex: chunkIndex + 1,
					chunkSize: chunk.length,
					resultsType: typeof results,
					isArray: Array.isArray(results),
					resultsLength: results?.length,
					firstResultKeys: results?.[0] ? Object.keys(results[0]) : null,
					firstResultValue: results?.[0]
				});

				const chunkThumbnails = new Map<string, string>();

				for (const result of results) {
					if (this.stopQueue) break;

					// デバッグ：個別結果の詳細確認
					console.log('📦 SimpleQueue Individual Result:', {
						path: result.path.split('/').pop(),
						hasThumbnail: !!result.thumbnail,
						thumbnailKeys: result.thumbnail ? Object.keys(result.thumbnail) : null,
						cachePathExists: result.thumbnail?.cache_path !== undefined,
						cachePathValue: result.thumbnail?.cache_path,
						hasError: !!result.error,
						errorMsg: result.error
					});

					if (result.thumbnail?.cache_path) {
						try {
							console.log('📁 ファイル読み込み開始:', result.thumbnail.cache_path);
							const fileData = await readFile(result.thumbnail.cache_path);
							console.log('📁 ファイル読み込み成功:', {
								path: result.thumbnail.cache_path,
								fileSize: fileData.length
							});

							const blob = new Blob([new Uint8Array(fileData)], {
								type: result.thumbnail.mime_type
							});
							const url = URL.createObjectURL(blob);

							console.log('🔄 SimpleQueue ファイル読み込み:', {
								originalPath: result.thumbnail.cache_path,
								fileSize: fileData.length,
								blobUrl: url.substring(0, 50) + '...',
								imagePath: result.path.split('/').pop()
							});

							newThumbnails.set(result.path, url);
							chunkThumbnails.set(result.path, url);

							if (result.cache_info) {
								unifiedMetadataService.setThumbnailCacheInfo(result.path, result.cache_info);
							}

							loadedCount++;
						} catch (readError) {
							console.error('🚨 SimpleQueue ファイル読み込みエラー詳細:', {
								path: result.thumbnail.cache_path,
								errorName: (readError as Error)?.name,
								errorMessage: (readError as Error)?.message,
								errorStack: (readError as Error)?.stack,
								fullError: readError
							});
						}
					} else if (result.error) {
						console.warn(`Thumbnail generation failed: ${result.path} - ${result.error}`);
					}
				}

				if (chunkThumbnails.size > 0) {
					onChunkComplete(chunkThumbnails);
				}

				if (onProgress) {
					onProgress(loadedCount, allImageFiles.length);
				}

				await new Promise((resolve) => setTimeout(resolve, 10));
			} catch (chunkError) {
				console.error(`Chunk ${chunkIndex + 1} processing error:`, chunkError);
			}
		}

		return newThumbnails;
	}

	// キューを停止する新しいメソッド
	stopSimpleQueue(): void {
		this.stopQueue = true;
	}
}
