import { invoke } from '@tauri-apps/api/core';
import { getImageFiles } from '../image/image-loader';
import type { BatchThumbnailResult, CachedMetadata } from '../types/shared-types';

// サムネイル処理のサービス
export class ThumbnailService {
	// メタデータキャッシュ
	private metadataCache = new Map<string, CachedMetadata>();

	// チャンク単位でサムネイルとメタデータを処理
	async loadThumbnailsInChunks(
		allImageFiles: string[],
		chunkSize: number = 16,
		onProgress?: (loadedCount: number, totalCount: number) => void
	): Promise<Map<string, string>> {
		const newThumbnails = new Map<string, string>();

		// 配列をチャンクに分割
		const chunks: string[][] = [];
		for (let i = 0; i < allImageFiles.length; i += chunkSize) {
			chunks.push(allImageFiles.slice(i, i + chunkSize));
		}

		console.log(`チャンク処理開始: ${chunks.length}チャンク, チャンクサイズ: ${chunkSize}`);
		let loadedCount = 0;

		// チャンクごとに処理
		for (const [chunkIndex, chunk] of chunks.entries()) {
			try {
				console.log(
					`チャンク ${chunkIndex + 1}/${chunks.length} 処理開始 (${chunk.length}ファイル)`
				);

				const results: BatchThumbnailResult[] = await invoke('load_thumbnails_batch', {
					imagePaths: chunk
				});

				// 結果を処理
				for (const result of results) {
					if (result.thumbnail && result.thumbnail.data) {
						// サムネイル画像の処理
						const uint8Array = new Uint8Array(result.thumbnail.data);
						const blob = new Blob([uint8Array], { type: result.thumbnail.mime_type });
						const url = URL.createObjectURL(blob);
						newThumbnails.set(result.path, url);
						
						// メタデータをキャッシュに保存
						if (result.cached_metadata) {
							this.metadataCache.set(result.path, result.cached_metadata);
						}
						
						loadedCount++;
						console.log(`サムネイル生成成功: ${result.path}`);
					} else if (result.error) {
						console.warn(`サムネイル生成失敗: ${result.path} - ${result.error}`);
					}
				}

				// プログレス通知
				if (onProgress) {
					onProgress(loadedCount, allImageFiles.length);
				}

				console.log(`チャンク ${chunkIndex + 1}/${chunks.length} 完了`);

				// 少し待機（UI更新のため）
				await new Promise((resolve) => setTimeout(resolve, 10));
			} catch (chunkError) {
				console.error(`チャンク ${chunkIndex + 1} 処理エラー:`, chunkError);
			}
		}

		console.log('全チャンク処理完了');
		return newThumbnails;
	}

	// ディレクトリ内の画像ファイル一覧を取得
	async getImageFiles(directoryPath: string): Promise<string[]> {
		return await getImageFiles(directoryPath);
	}

	// 画像のメタデータを取得
	getImageMetadata(imagePath: string): CachedMetadata | undefined {
		return this.metadataCache.get(imagePath);
	}

	// 画像のRating情報を取得
	getImageRating(imagePath: string): number | undefined {
		const metadata = this.metadataCache.get(imagePath);
		return metadata?.rating;
	}

	// 画像のRating情報を更新
	async updateImageRating(imagePath: string, newRating: number): Promise<boolean> {
		try {
			// Rustにrating書き込みを依頼
			await invoke('write_exif_image_rating', {
				path: imagePath,
				rating: newRating
			});

			// キャッシュを更新
			const existingMetadata = this.metadataCache.get(imagePath);
			if (existingMetadata) {
				const updatedMetadata = {
					...existingMetadata,
					rating: newRating,
					cached_at: Date.now() / 1000 // UNIXタイムスタンプで更新
				};
				this.metadataCache.set(imagePath, updatedMetadata);
			} else {
				// 新しいメタデータを作成
				this.metadataCache.set(imagePath, {
					rating: newRating,
					exif_info: undefined,
					cached_at: Date.now() / 1000
				});
			}

			console.log(`Rating updated: ${imagePath} -> ${newRating}`);
			return true;
		} catch (error) {
			console.error('Rating更新に失敗:', imagePath, error);
			return false;
		}
	}

	// Blob URLをクリーンアップ
	cleanupThumbnails(thumbnails: Map<string, string>): void {
		for (const url of thumbnails.values()) {
			URL.revokeObjectURL(url);
		}
		// メタデータキャッシュもクリア
		this.metadataCache.clear();
	}
}
