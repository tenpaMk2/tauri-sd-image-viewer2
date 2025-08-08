import type { BatchThumbnailResult } from '../types/shared-types';

export type ThumbnailQueueConfig = {
	chunkSize: number;
	delayBetweenChunks: number;
};

export type ThumbnailQueueCallbacks = {
	onChunkComplete?: (chunkResults: Map<string, string>, metadataCache?: Map<string, any>) => void;
	onProgress?: (loadedCount: number, totalCount: number) => void;
	onError?: (error: Error, failedPaths: string[]) => void;
	onComplete?: () => void;
	onCancelled?: () => void;
};

export type QueueStatus = 'idle' | 'running' | 'paused' | 'cancelled' | 'completed';

export class ThumbnailQueueManager {
	private queue: string[] = [];
	private currentChunkIndex = 0;
	private status: QueueStatus = 'idle';
	private loadedCount = 0;
	private totalCount = 0;
	private config: ThumbnailQueueConfig;
	private callbacks: ThumbnailQueueCallbacks;
	private processingPromise: Promise<void> | null = null;
	private shouldStop = false;

	constructor(
		config: ThumbnailQueueConfig = { chunkSize: 16, delayBetweenChunks: 10 },
		callbacks: ThumbnailQueueCallbacks = {}
	) {
		this.config = config;
		this.callbacks = callbacks;
	}

	async startProcessing(imagePaths: string[]): Promise<void> {
		if (this.status === 'running') {
			console.warn('ThumbnailQueueManager is already running');
			return;
		}

		this.queue = [...imagePaths];
		this.currentChunkIndex = 0;
		this.loadedCount = 0;
		this.totalCount = imagePaths.length;
		this.status = 'running';
		this.shouldStop = false;

		console.log(`Starting thumbnail queue processing: ${this.totalCount} images`);

		this.processingPromise = this.processQueue();

		try {
			await this.processingPromise;
		} catch (error) {
			console.error('Queue processing error:', error);
			this.callbacks.onError?.(error as Error, []);
		}
	}

	private async processQueue(): Promise<void> {
		const chunks = this.createChunks();

		for (let i = this.currentChunkIndex; i < chunks.length; i++) {
			if (this.shouldStop) {
				this.status = 'cancelled';
				this.callbacks.onCancelled?.();
				return;
			}

			const chunk = chunks[i];
			this.currentChunkIndex = i;

			try {
				await this.processChunk(chunk);

				// チャンク間の遅延
				if (i < chunks.length - 1 && !this.shouldStop) {
					await this.delay(this.config.delayBetweenChunks);
				}
			} catch (error) {
				console.error(`Chunk ${i + 1} processing error:`, error);
				this.callbacks.onError?.(error as Error, chunk);
			}
		}

		if (!this.shouldStop) {
			this.status = 'completed';
			this.callbacks.onComplete?.();
		}
	}

	private createChunks(): string[][] {
		const chunks: string[][] = [];
		for (let i = 0; i < this.queue.length; i += this.config.chunkSize) {
			chunks.push(this.queue.slice(i, i + this.config.chunkSize));
		}
		return chunks;
	}

	private async processChunk(chunk: string[]): Promise<void> {
		const { invoke } = await import('@tauri-apps/api/core');

		try {
			const results: BatchThumbnailResult[] = await invoke('load_thumbnails_batch', {
				imagePaths: chunk
			});

			const chunkThumbnails = new Map<string, string>();
			const chunkMetadata = new Map<string, any>();

			for (const result of results) {
				if (this.shouldStop) return;

				if (result.thumbnail) {
					let thumbnailUrl: string;

					if (result.thumbnail.cache_path) {
						const { convertFileSrc } = await import('@tauri-apps/api/core');
						thumbnailUrl = convertFileSrc(result.thumbnail.cache_path);
					} else if (result.thumbnail.data && result.thumbnail.data.length > 0) {
						const uint8Array = new Uint8Array(result.thumbnail.data);
						const blob = new Blob([uint8Array], { type: result.thumbnail.mime_type });
						thumbnailUrl = URL.createObjectURL(blob);
					} else {
						console.warn(`No thumbnail data: ${result.path}`);
						continue;
					}

					chunkThumbnails.set(result.path, thumbnailUrl);

					// メタデータが存在する場合はキャッシュに保存
					if (result.cached_metadata) {
						chunkMetadata.set(result.path, result.cached_metadata);
					}

					this.loadedCount++;
				} else if (result.error) {
					console.warn(`Thumbnail generation failed: ${result.path} - ${result.error}`);
				}
			}

			// チャンク完了のコールバック（メタデータも含める）
			if (chunkThumbnails.size > 0) {
				this.callbacks.onChunkComplete?.(chunkThumbnails, chunkMetadata);
			}

			// プログレス報告
			this.callbacks.onProgress?.(this.loadedCount, this.totalCount);
		} catch (error) {
			throw new Error(`Failed to process chunk: ${error}`);
		}
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	// キューの停止
	stop(): void {
		if (this.status === 'running') {
			console.log('Stopping thumbnail queue processing');
			this.shouldStop = true;
		}
	}

	// キューの一時停止（将来的な拡張用）
	pause(): void {
		if (this.status === 'running') {
			this.status = 'paused';
		}
	}

	// キューの再開（将来的な拡張用）
	resume(): void {
		if (this.status === 'paused') {
			this.status = 'running';
		}
	}

	// 現在の状態を取得
	getStatus(): QueueStatus {
		return this.status;
	}

	// プログレス情報を取得
	getProgress(): { loadedCount: number; totalCount: number; percentage: number } {
		const percentage = this.totalCount > 0 ? (this.loadedCount / this.totalCount) * 100 : 0;
		return {
			loadedCount: this.loadedCount,
			totalCount: this.totalCount,
			percentage
		};
	}

	// 処理が完了するまで待機
	async waitForCompletion(): Promise<void> {
		if (this.processingPromise) {
			await this.processingPromise;
		}
	}
}
