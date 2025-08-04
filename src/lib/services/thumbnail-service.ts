import { invoke } from '@tauri-apps/api/core';
import { getImageFiles } from '../image/image-loader';
import type { BatchThumbnailResult } from '../image/types';

// サムネイル処理のサービス
export class ThumbnailService {
	// チャンク単位でサムネイルを処理
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
						// number[]をUint8Arrayに変換
						const uint8Array = new Uint8Array(result.thumbnail.data);
						const blob = new Blob([uint8Array], { type: result.thumbnail.mime_type });
						const url = URL.createObjectURL(blob);
						newThumbnails.set(result.path, url);
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

	// Blob URLをクリーンアップ
	cleanupThumbnails(thumbnails: Map<string, string>): void {
		for (const url of thumbnails.values()) {
			URL.revokeObjectURL(url);
		}
	}
}
