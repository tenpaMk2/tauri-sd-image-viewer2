import { imageMetadataStore } from '../stores/image-metadata-store.svelte';

/**
 * メタデータロードのキュー管理サービス（リアクティブ版）
 * サムネイル生成完了に応じて順次メタデータをロードする
 */
export class MetadataQueueService {
	private queue = $state<string[]>([]);
	private processing = $state(false);
	private maxConcurrent = 2; // メタデータ読み込みの同時実行数
	private activeJobs = new Set<Promise<void>>();

	// Promise resolve用のマップ
	private resolvers = new Map<string, (value: number | undefined) => void>();

	/**
	 * 画像のメタデータロードをキューに追加してPromiseを返す
	 */
	async enqueue(imagePath: string): Promise<number | undefined> {
		// すでにロード済みの場合は即座に値を返す
		const metadata = imageMetadataStore.getMetadata(imagePath);
		if (metadata.isLoaded) {
			return metadata.rating;
		}

		// すでにキューに入っている場合は既存のPromiseを返す
		if (this.resolvers.has(imagePath)) {
			return new Promise<number | undefined>((resolve) => {
				// 既存のresolverをチェーンする
				const existingResolver = this.resolvers.get(imagePath);
				this.resolvers.set(imagePath, (value) => {
					existingResolver?.(value);
					resolve(value);
				});
			});
		}

		// 新しいPromiseを作成
		const promise = new Promise<number | undefined>((resolve) => {
			this.resolvers.set(imagePath, resolve);
		});

		if (!this.queue.includes(imagePath)) {
			this.queue.push(imagePath);
			console.log(
				'📋 Metadata queued: ' +
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
					const job = this.loadMetadata(imagePath);
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
		console.log('✅ Metadata queue processing completed');
	}

	/**
	 * 単一画像のメタデータをロード
	 */
	private async loadMetadata(imagePath: string): Promise<void> {
		try {
			const metadata = imageMetadataStore.getMetadata(imagePath);
			if (!metadata.isLoaded && !metadata.isLoading) {
				console.log('🔄 Loading metadata from queue: ' + imagePath.split('/').pop());
				await metadata.load();
			}

			// ロード完了時にPromiseをresolve
			const resolver = this.resolvers.get(imagePath);
			if (resolver) {
				resolver(metadata.rating);
				this.resolvers.delete(imagePath);
			}
		} catch (error) {
			console.error(
				'❌ Metadata load failed from queue: ' + imagePath.split('/').pop() + ' ' + error
			);

			// エラー時もPromiseをresolve（undefinedで）
			const resolver = this.resolvers.get(imagePath);
			if (resolver) {
				resolver(undefined);
				this.resolvers.delete(imagePath);
			}
		}
	}

	/**
	 * キューをクリア
	 */
	clear(): void {
		// 未完了のPromiseもresolve
		for (const [imagePath, resolver] of this.resolvers) {
			resolver(undefined);
		}
		this.resolvers.clear();
		this.queue = [];
		console.log('🗑️ Metadata queue cleared');
	}

	/**
	 * 現在のキューサイズを取得（リアクティブ）
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
export const metadataQueueService = new MetadataQueueService();
