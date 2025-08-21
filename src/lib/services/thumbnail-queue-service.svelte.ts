import { thumbnailStore } from '../stores/thumbnail-store.svelte';

/**
 * サムネイル生成のキュー管理サービス
 * サムネイル生成を順次処理してメモリ使用量を制御する
 */
export class ThumbnailQueueService {
	private queue: string[] = [];
	private processing = false;
	private maxConcurrent = 3; // サムネイル生成の同時実行数
	private activeJobs = new Set<Promise<void>>();

	// 進行中のロード処理を管理（パスごとにresolve関数を保持）
	private pendingResolvers = new Map<
		string,
		{
			resolve: () => void;
			reject: (error: any) => void;
		}
	>();

	/**
	 * 画像のサムネイル生成をキューに追加してPromiseを返す
	 */
	async enqueue(imagePath: string): Promise<void> {
		// すでに生成済みの場合は即座に完了
		const thumbnail = thumbnailStore.getThumbnail(imagePath);
		if (thumbnail.isLoaded) {
			return;
		}

		// すでに同じ画像の生成処理が進行中の場合は、そのPromiseに相乗り
		if (this.pendingResolvers.has(imagePath)) {
			return new Promise<void>((resolve, reject) => {
				const existing = this.pendingResolvers.get(imagePath)!;
				const originalResolve = existing.resolve;
				const originalReject = existing.reject;

				// 既存のPromiseをチェーン
				this.pendingResolvers.set(imagePath, {
					resolve: () => {
						originalResolve();
						resolve();
					},
					reject: (error) => {
						originalReject(error);
						reject(error);
					}
				});
			});
		}

		// 新しいPromiseを作成
		const promise = new Promise<void>((resolve, reject) => {
			this.pendingResolvers.set(imagePath, { resolve, reject });
		});

		if (!this.queue.includes(imagePath)) {
			this.queue.push(imagePath);
			console.log(
				'📋 Thumbnail queued: ' +
					imagePath.split('/').pop() +
					' (queue size: ' +
					this.queue.length +
					')'
			);

			// 処理を開始
			this.processQueue();
		}

		return promise;
	}

	/**
	 * キューの処理を開始
	 */
	private async processQueue(): Promise<void> {
		if (this.processing) return;
		this.processing = true;

		while (this.queue.length > 0 || this.activeJobs.size > 0) {
			// 最大同時実行数に達していない場合、新しいジョブを開始
			while (this.activeJobs.size < this.maxConcurrent && this.queue.length > 0) {
				const imagePath = this.queue.shift();
				if (imagePath) {
					const job = this.loadThumbnail(imagePath);
					this.activeJobs.add(job);

					// ジョブ完了時にアクティブジョブから削除
					job.finally(() => {
						this.activeJobs.delete(job);
					});
				}
			}

			// 少なくとも1つのジョブが完了するまで待機
			if (this.activeJobs.size > 0) {
				await Promise.race(Array.from(this.activeJobs));
			}
		}

		this.processing = false;
		console.log('✅ Thumbnail queue processing completed');
	}

	/**
	 * 単一画像のサムネイルを生成
	 */
	private async loadThumbnail(imagePath: string): Promise<void> {
		try {
			const thumbnail = thumbnailStore.getThumbnail(imagePath);
			console.log('🔄 Loading thumbnail from queue: ' + imagePath.split('/').pop());
			await thumbnail.load();

			// 成功時にPromiseをresolve
			const resolver = this.pendingResolvers.get(imagePath);
			if (resolver) {
				resolver.resolve();
				this.pendingResolvers.delete(imagePath);
			}
		} catch (error) {
			console.error(
				'❌ Thumbnail load failed from queue: ' + imagePath.split('/').pop() + ' ' + error
			);

			// エラー時にPromiseをreject
			const resolver = this.pendingResolvers.get(imagePath);
			if (resolver) {
				resolver.reject(error);
				this.pendingResolvers.delete(imagePath);
			}
		}
	}

	/**
	 * キューをクリア
	 */
	clear(): void {
		// 未完了のPromiseをreject
		for (const [imagePath, resolver] of this.pendingResolvers) {
			resolver.reject(new Error('Queue cleared'));
		}
		this.pendingResolvers.clear();
		this.queue = [];
		console.log('🗑️ Thumbnail queue cleared');
	}

	/**
	 * 現在のキューサイズを取得
	 */
	get queueSize(): number {
		return this.queue.length;
	}

	/**
	 * アクティブジョブ数を取得
	 */
	get activeJobCount(): number {
		return this.activeJobs.size;
	}

	/**
	 * 最大同時実行数を設定
	 */
	setMaxConcurrent(maxConcurrent: number): void {
		this.maxConcurrent = Math.max(1, maxConcurrent);
	}
}

/**
 * グローバルインスタンス
 */
export const thumbnailQueueService = new ThumbnailQueueService();
