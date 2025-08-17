import { invoke, Channel } from '@tauri-apps/api/core';

export type AsyncThumbnailQueueConfig = {
	maxConcurrent: number;
};

export type AsyncThumbnailQueueCallbacks = {
	onThumbnailReady?: (imagePath: string, thumbnailUrl: string) => void;
	onProgress?: (completed: number, total: number) => void;
	onError?: (imagePath: string, error: string) => void;
	onComplete?: () => void;
	onCancelled?: () => void;
};

export type QueueStatus = 'idle' | 'running' | 'cancelled' | 'completed';

export class AsyncThumbnailQueue {
	private config: AsyncThumbnailQueueConfig;
	private callbacks: AsyncThumbnailQueueCallbacks;
	private status: QueueStatus = 'idle';
	private activeJobs = new Set<Promise<void>>();
	private pendingPaths: string[] = [];
	private completedCount = 0;
	private totalCount = 0;
	private shouldStop = false;

	constructor(
		config: AsyncThumbnailQueueConfig = { maxConcurrent: 3 },
		callbacks: AsyncThumbnailQueueCallbacks = {}
	) {
		this.config = config;
		this.callbacks = callbacks;
	}

	async startProcessing(imagePaths: string[]): Promise<void> {
		if (this.status === 'running') {
			console.warn('AsyncThumbnailQueue is already running');
			return;
		}

		this.pendingPaths = [...imagePaths];
		this.completedCount = 0;
		this.totalCount = imagePaths.length;
		this.status = 'running';
		this.shouldStop = false;
		this.activeJobs.clear();

		console.log(`Starting async thumbnail queue: ${this.totalCount} images, max concurrent: ${this.config.maxConcurrent}`);

		// Start initial jobs up to maxConcurrent
		for (let i = 0; i < Math.min(this.config.maxConcurrent, this.pendingPaths.length); i++) {
			this.processNext();
		}

		// Wait for all jobs to complete
		await this.waitForCompletion();
	}

	private async processNext(): Promise<void> {
		if (this.shouldStop || this.pendingPaths.length === 0) {
			return;
		}

		const imagePath = this.pendingPaths.shift();
		if (!imagePath) return;

		const job = this.processSingleThumbnail(imagePath);
		this.activeJobs.add(job);

		try {
			await job;
		} finally {
			this.activeJobs.delete(job);
			this.completedCount++;

			// Report progress
			this.callbacks.onProgress?.(this.completedCount, this.totalCount);

			// Process next item if available
			if (!this.shouldStop && this.pendingPaths.length > 0) {
				this.processNext();
			}

			// Check if all work is done
			if (this.activeJobs.size === 0 && this.pendingPaths.length === 0) {
				if (this.shouldStop) {
					this.status = 'cancelled';
					this.callbacks.onCancelled?.();
				} else {
					this.status = 'completed';
					this.callbacks.onComplete?.();
				}
			}
		}
	}

	private async processSingleThumbnail(imagePath: string): Promise<void> {
		try {
			const channel = new Channel<Uint8Array>();
			
			// Set up channel listener before invoke
			channel.onmessage = (data) => {
				try {
					// Convert Uint8Array to Blob and create URL
					const blob = new Blob([new Uint8Array(data)], { type: 'image/webp' });
					const thumbnailUrl = URL.createObjectURL(blob);
					
					// Notify callback
					this.callbacks.onThumbnailReady?.(imagePath, thumbnailUrl);
				} catch (error) {
					console.error(`Failed to process thumbnail data for ${imagePath}:`, error);
					this.callbacks.onError?.(imagePath, `Failed to process thumbnail data: ${error}`);
				}
			};

			// Generate thumbnail
			await invoke('generate_thumbnail_async', {
				imagePath,
				config: null,
				channel
			});

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`Failed to generate thumbnail for ${imagePath}:`, errorMessage);
			this.callbacks.onError?.(imagePath, errorMessage);
		}
	}

	private async waitForCompletion(): Promise<void> {
		while (this.activeJobs.size > 0 || this.pendingPaths.length > 0) {
			if (this.shouldStop) break;
			
			// Wait for any active job to complete
			if (this.activeJobs.size > 0) {
				await Promise.race(Array.from(this.activeJobs));
			} else {
				// Small delay to prevent busy waiting
				await new Promise(resolve => setTimeout(resolve, 10));
			}
		}
	}

	stop(): void {
		if (this.status === 'running') {
			console.log('Stopping async thumbnail queue');
			this.shouldStop = true;
		}
	}

	getStatus(): QueueStatus {
		return this.status;
	}

	getProgress(): { completed: number; total: number; percentage: number } {
		const percentage = this.totalCount > 0 ? (this.completedCount / this.totalCount) * 100 : 0;
		return {
			completed: this.completedCount,
			total: this.totalCount,
			percentage
		};
	}

	getActiveJobCount(): number {
		return this.activeJobs.size;
	}

	getPendingJobCount(): number {
		return this.pendingPaths.length;
	}
}