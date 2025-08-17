import { AsyncThumbnailQueue, type AsyncThumbnailQueueConfig, type AsyncThumbnailQueueCallbacks, type QueueStatus } from './async-thumbnail-queue';

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

export { type QueueStatus };

/**
 * Legacy wrapper for AsyncThumbnailQueue
 * @deprecated Use AsyncThumbnailQueue directly
 */
export class ThumbnailQueueManager {
	private asyncQueue: AsyncThumbnailQueue;
	private callbacks: ThumbnailQueueCallbacks;
	private thumbnailResults = new Map<string, string>();

	constructor(
		config: ThumbnailQueueConfig = { chunkSize: 16, delayBetweenChunks: 10 },
		callbacks: ThumbnailQueueCallbacks = {}
	) {
		this.callbacks = callbacks;
		
		// Convert legacy config to new format
		const asyncConfig: AsyncThumbnailQueueConfig = {
			maxConcurrent: Math.min(config.chunkSize, 8) // Limit concurrent jobs
		};

		const asyncCallbacks: AsyncThumbnailQueueCallbacks = {
			onThumbnailReady: (imagePath, thumbnailUrl) => {
				this.thumbnailResults.set(imagePath, thumbnailUrl);
				// Emit chunk complete for backward compatibility
				const chunkResults = new Map<string, string>();
				chunkResults.set(imagePath, thumbnailUrl);
				this.callbacks.onChunkComplete?.(chunkResults, new Map());
			},
			onProgress: (completed, total) => {
				this.callbacks.onProgress?.(completed, total);
			},
			onError: (imagePath, error) => {
				this.callbacks.onError?.(new Error(error), [imagePath]);
			},
			onComplete: () => {
				this.callbacks.onComplete?.();
			},
			onCancelled: () => {
				this.callbacks.onCancelled?.();
			}
		};

		this.asyncQueue = new AsyncThumbnailQueue(asyncConfig, asyncCallbacks);
	}

	async startProcessing(imagePaths: string[]): Promise<void> {
		this.thumbnailResults.clear();
		await this.asyncQueue.startProcessing(imagePaths);
	}

	// Delegate methods to AsyncThumbnailQueue
	stop(): void {
		this.asyncQueue.stop();
	}

	// Legacy pause/resume methods (not supported in new implementation)
	pause(): void {
		console.warn('pause() is not supported in AsyncThumbnailQueue. Use stop() instead.');
	}

	resume(): void {
		console.warn('resume() is not supported in AsyncThumbnailQueue.');
	}

	getStatus(): QueueStatus {
		return this.asyncQueue.getStatus();
	}

	getProgress(): { loadedCount: number; totalCount: number; percentage: number } {
		const progress = this.asyncQueue.getProgress();
		return {
			loadedCount: progress.completed,
			totalCount: progress.total,
			percentage: progress.percentage
		};
	}

	async waitForCompletion(): Promise<void> {
		// AsyncThumbnailQueue handles completion automatically
		while (this.asyncQueue.getStatus() === 'running') {
			await new Promise(resolve => setTimeout(resolve, 100));
		}
	}

	// Additional methods for debugging
	getActiveJobCount(): number {
		return this.asyncQueue.getActiveJobCount();
	}

	getPendingJobCount(): number {
		return this.asyncQueue.getPendingJobCount();
	}

	getThumbnailResults(): Map<string, string> {
		return new Map(this.thumbnailResults);
	}
}
