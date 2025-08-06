import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { getImageFiles } from '../image/image-loader';
import type { BatchThumbnailResult, CachedMetadata } from '../types/shared-types';

// サムネイル処理のサービス
export class ThumbnailService {
	// メタデータキャッシュ
	private metadataCache = new Map<string, CachedMetadata>();

	// 個別サムネイル生成（非同期処理用）
	async loadSingleThumbnail(imagePath: string): Promise<string | null> {
		try {
			const results: BatchThumbnailResult[] = await invoke('load_thumbnails_batch', {
				imagePaths: [imagePath]
			});

			const result = results[0];
			if (result?.thumbnail?.data) {
				// サムネイル画像の処理
				const uint8Array = new Uint8Array(result.thumbnail.data);
				const blob = new Blob([uint8Array], { type: result.thumbnail.mime_type });
				const url = URL.createObjectURL(blob);

				// メタデータをキャッシュに保存
				if (result.cached_metadata) {
					this.metadataCache.set(result.path, result.cached_metadata);
				}

				console.log(`個別サムネイル生成成功: ${result.path}`);
				return url;
			} else if (result?.error) {
				console.warn(`個別サムネイル生成失敗: ${result.path} - ${result.error}`);
				return null;
			}
		} catch (error) {
			console.error(`個別サムネイル生成エラー: ${imagePath}`, error);
		}
		return null;
	}

	// 全画像のサムネイルを個別に非同期生成
	async loadThumbnailsIndividually(
		allImageFiles: string[],
		onThumbnailLoaded: (imagePath: string, thumbnailUrl: string | null) => void,
		onProgress?: (loadedCount: number, totalCount: number) => void
	): Promise<void> {
		let loadedCount = 0;

		// 各画像を並列で処理（ただし並列度は制限）
		const promises = allImageFiles.map(async (imagePath, index) => {
			// 少しずつ開始タイミングをずらして負荷を分散
			await new Promise((resolve) => setTimeout(resolve, index * 50));

			const thumbnailUrl = await this.loadSingleThumbnail(imagePath);
			onThumbnailLoaded(imagePath, thumbnailUrl);

			loadedCount++;
			if (onProgress) {
				onProgress(loadedCount, allImageFiles.length);
			}
		});

		await Promise.all(promises);
		console.log('全個別サムネイル処理完了');
	}

	// チャンク単位でサムネイルとメタデータを処理（高速版）
	async loadThumbnailsInChunksOptimized(
		allImageFiles: string[],
		chunkSize: number = 16,
		onChunkLoaded: (chunkResults: Map<string, string>) => void,
		onProgress?: (loadedCount: number, totalCount: number) => void
	): Promise<void> {
		console.log('=== loadThumbnailsInChunksOptimized メソッド開始 ===');
		console.log('引数:', { 
			allImageFiles: allImageFiles.length, 
			chunkSize, 
			onChunkLoaded: typeof onChunkLoaded,
			onProgress: typeof onProgress 
		});
		// 配列をチャンクに分割
		const chunks: string[][] = [];
		for (let i = 0; i < allImageFiles.length; i += chunkSize) {
			chunks.push(allImageFiles.slice(i, i + chunkSize));
		}

		console.log(`最適化チャンク処理開始: ${chunks.length}チャンク, チャンクサイズ: ${chunkSize}`);
		console.log('対象画像ファイル:', allImageFiles.slice(0, 5)); // 最初の5ファイルを表示
		let loadedCount = 0;

		// チャンクごとに処理
		for (const [chunkIndex, chunk] of chunks.entries()) {
			console.log('=== チャンクループ開始 ===', chunkIndex + 1, '/', chunks.length);
			try {
				console.log(
					`チャンク ${chunkIndex + 1}/${chunks.length} 処理開始 (${chunk.length}ファイル)`
				);

				console.log('新コマンド呼び出し:', chunk.length, '個のファイル');
				console.log('チャンクファイル:', chunk);
				let results: BatchThumbnailResult[];
				let usedNewCommand = false;
				
				// デバッグ: 新コマンドをスキップして従来コマンドのみをテスト
				console.log('デバッグ: 従来コマンドのみを使用');
				console.log('load_thumbnails_batch コマンド実行中...');
				
				try {
					console.log('invoke 呼び出し直前');
					results = await invoke('load_thumbnails_batch', {
						imagePaths: chunk
					});
					console.log('invoke 呼び出し成功');
					console.log('従来コマンド結果:', results.length, '個の結果');
				} catch (invokeError) {
					console.error('invoke 呼び出しエラー:', invokeError);
					throw invokeError;
				}
				console.log('結果の詳細:', results.map(r => ({ 
					path: r.path, 
					hasThumbnail: !!r.thumbnail, 
					error: r.error 
				})));
				
				// 元のコード（コメントアウト）
				// try {
				// 	console.log('load_thumbnails_batch_path_only コマンド実行中...');
				// 	results = await invoke('load_thumbnails_batch_path_only', {
				// 		imagePaths: chunk
				// 	});
				// 	usedNewCommand = true;
				// 	console.log('新コマンド成功 - 結果:', results.length, '個の結果');
				// 	console.log('結果の詳細:', results.map(r => ({ 
				// 		path: r.path, 
				// 		hasThumbnail: !!r.thumbnail, 
				// 		error: r.error 
				// 	})));
				// } catch (error) {
				// 	console.warn('新コマンドエラー、従来コマンドにフォールバック:', error);
				// 	console.log('load_thumbnails_batch コマンド実行中...');
				// 	results = await invoke('load_thumbnails_batch', {
				// 		imagePaths: chunk
				// 	});
				// 	console.log('従来コマンド成功 - 結果:', results.length, '個の結果');
				// 	console.log('結果の詳細:', results.map(r => ({ 
				// 		path: r.path, 
				// 		hasThumbnail: !!r.thumbnail, 
				// 		error: r.error 
				// 	})));
				// }
				
				console.log('使用したコマンド:', usedNewCommand ? '新コマンド' : '従来コマンド');

				const chunkThumbnails = new Map<string, string>();

				// 結果を処理
				for (const result of results) {
					console.log('処理中の結果:', {
						path: result.path, 
						hasThumbnail: !!result.thumbnail,
						hasCachePath: result.thumbnail?.cache_path ? 'あり' : 'なし',
						cachePath: result.thumbnail?.cache_path,
						hasData: result.thumbnail?.data ? result.thumbnail.data.length : 0,
						mimeType: result.thumbnail?.mime_type,
						width: result.thumbnail?.width,
						height: result.thumbnail?.height,
						error: result.error
					});
					
					if (result.thumbnail?.cache_path) {
						console.log('キャッシュパス詳細:', result.thumbnail.cache_path);
						// convertFileSrcのテスト
						const testUrl = convertFileSrc(result.thumbnail.cache_path);
						console.log('convertFileSrc テスト結果:', testUrl);
					}

					if (result.thumbnail) {
						let thumbnailUrl: string;

						// キャッシュパスがある場合はそれを使用、なければデータから生成
						if (result.thumbnail.cache_path) {
							console.log('キャッシュパス使用:', result.thumbnail.cache_path);
							thumbnailUrl = convertFileSrc(result.thumbnail.cache_path);
							console.log('convertFileSrc 結果:', thumbnailUrl);
						} else if (result.thumbnail.data && result.thumbnail.data.length > 0) {
							// フォールバック: データから生成
							console.log('データから生成:', result.thumbnail.data.length, 'バイト');
							const uint8Array = new Uint8Array(result.thumbnail.data);
							const blob = new Blob([uint8Array], { type: result.thumbnail.mime_type });
							thumbnailUrl = URL.createObjectURL(blob);
							console.log('blob URL:', thumbnailUrl);
						} else {
							console.warn(`サムネイル生成失敗 (データなし): ${result.path}`);
							continue;
						}

						chunkThumbnails.set(result.path, thumbnailUrl);

						// メタデータをキャッシュに保存
						if (result.cached_metadata) {
							this.metadataCache.set(result.path, result.cached_metadata);
						}

						loadedCount++;
						console.log(`サムネイル生成成功: ${result.path}`);
					} else if (result.error) {
						console.warn(`サムネイル生成失敗: ${result.path} - ${result.error}`);
					} else {
						console.warn(`サムネイル結果が空: ${result.path}`);
					}
				}

				// チャンクの結果を即座に通知
				console.log('チャンク結果:', chunkThumbnails.size, '個のサムネイル');
				if (chunkThumbnails.size > 0) {
					onChunkLoaded(chunkThumbnails);
				} else {
					console.warn('チャンクに有効なサムネイルがありません');
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

		console.log('全最適化チャンク処理完了');
	}

	// チャンク単位でサムネイルとメタデータを処理（リアルタイム更新版）
	async loadThumbnailsInChunks(
		allImageFiles: string[],
		chunkSize: number = 16,
		onProgress?: (loadedCount: number, totalCount: number) => void,
		onChunkLoaded?: (chunkResults: Map<string, string>) => void
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

				const chunkThumbnails = new Map<string, string>();

				// 結果を処理
				for (const result of results) {
					if (result.thumbnail && result.thumbnail.data) {
						// サムネイル画像の処理
						const uint8Array = new Uint8Array(result.thumbnail.data);
						const blob = new Blob([uint8Array], { type: result.thumbnail.mime_type });
						const url = URL.createObjectURL(blob);
						newThumbnails.set(result.path, url);
						chunkThumbnails.set(result.path, url); // チャンク用Mapにも追加

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

				// チャンク完了の通知（リアルタイム更新用）
				if (onChunkLoaded && chunkThumbnails.size > 0) {
					console.log('チャンク完了通知:', chunkThumbnails.size, '個のサムネイル');
					onChunkLoaded(chunkThumbnails);
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
