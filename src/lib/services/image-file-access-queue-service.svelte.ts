import { imageMetadataStore } from '../stores/image-metadata-store.svelte';
import { thumbnailStore } from '../stores/thumbnail-store.svelte';

type QueueTask = {
	imagePath: string;
	handler: () => Promise<void>;
};

/**
 * 画像ファイルアクセス基底キュー管理クラス
 */
abstract class BaseImageFileAccessQueue {
	protected queue: QueueTask[] = [];
	protected processing = false;
	protected maxConcurrent = 10;
	protected activeJobs = new Set<Promise<void>>();

	// 進行中のロード処理を管理（パスごとにresolve関数を保持）
	protected pendingResolvers = new Map<
		string,
		{
			resolve: () => void;
			reject: (error: any) => void;
		}[]
	>();

	/**
	 * タスクをキューに追加してPromiseを返す
	 */
	async enqueue(imagePath: string): Promise<void> {
		// すでにロード済みの場合は即座に完了
		if (this.isAlreadyLoaded(imagePath)) {
			return;
		}

		// すでに同じタスクが進行中の場合は、そのPromiseに相乗り
		if (this.pendingResolvers.has(imagePath)) {
			return new Promise<void>((resolve, reject) => {
				const resolvers = this.pendingResolvers.get(imagePath)!;
				resolvers.push({ resolve, reject });
			});
		}

		// 新しいPromiseを作成
		const promise = new Promise<void>((resolve, reject) => {
			this.pendingResolvers.set(imagePath, [{ resolve, reject }]);
		});

		// キューに追加
		const task: QueueTask = {
			imagePath,
			handler: () => this.executeTask(imagePath)
		};

		if (!this.queue.some((t) => t.imagePath === imagePath)) {
			this.queue.push(task);
			console.log(
				`📋 ${this.getTaskTypeName()} queued: ${imagePath.split('/').pop()} | Queue size: ${this.queue.length}, Active: ${this.activeJobs.size}/${this.maxConcurrent}`
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
				const task = this.queue.shift()!;
				console.log(
					`▶️ Processing ${this.getTaskTypeName()}: ${task.imagePath.split('/').pop()} | Queue remaining: ${this.queue.length}, Active: ${this.activeJobs.size + 1}/${this.maxConcurrent}`
				);

				const job = this.executeQueueTask(task);
				this.activeJobs.add(job);

				// ジョブ完了時にアクティブジョブから削除
				job.finally(() => {
					this.activeJobs.delete(job);
					console.log(
						`✅ Completed ${this.getTaskTypeName()}: ${task.imagePath.split('/').pop()} | Active jobs remaining: ${this.activeJobs.size}`
					);
				});
			}

			// 少なくとも1つのジョブが完了するまで待機
			if (this.activeJobs.size > 0) {
				await Promise.race(Array.from(this.activeJobs));
			}
		}

		this.processing = false;
		console.log(`✅ ${this.getTaskTypeName()} queue processing completed`);
	}

	/**
	 * キューのタスクを実行
	 */
	private async executeQueueTask(task: QueueTask): Promise<void> {
		try {
			await task.handler();
		} catch (error) {
			console.error(
				`❌ ${this.getTaskTypeName()} execution failed: ${task.imagePath.split('/').pop()}`,
				error
			);
			throw error;
		}
	}

	/**
	 * 実際のタスク実行
	 */
	private async executeTask(imagePath: string): Promise<void> {
		try {
			console.log(`🔄 Loading ${this.getTaskTypeName()}: ${imagePath.split('/').pop()}`);

			// ステータスを'loading'に更新し、実際のロード処理を実行
			await this.performLoad(imagePath);

			console.log(`✅ Completed ${this.getTaskTypeName()} load: ${imagePath.split('/').pop()}`);

			// 成功時にすべてのPromiseをresolve
			const resolvers = this.pendingResolvers.get(imagePath);
			if (resolvers) {
				for (const resolver of resolvers) {
					resolver.resolve();
				}
				this.pendingResolvers.delete(imagePath);
			}
		} catch (error) {
			console.error(
				`❌ ${this.getTaskTypeName()} load failed: ${imagePath.split('/').pop()} ${error}`
			);

			// エラー時にステータスを'error'に設定
			this.setErrorStatus(imagePath);

			// エラー時にすべてのPromiseをreject
			const resolvers = this.pendingResolvers.get(imagePath);
			if (resolvers) {
				for (const resolver of resolvers) {
					resolver.reject(error);
				}
				this.pendingResolvers.delete(imagePath);
			}
		}
	}

	/**
	 * キューをクリア
	 */
	clear(): void {
		// 未完了のPromiseをreject
		for (const [imagePath, resolvers] of this.pendingResolvers) {
			for (const resolver of resolvers) {
				resolver.reject(new Error('Queue cleared'));
			}
		}
		this.pendingResolvers.clear();

		// キューをクリア
		this.queue.length = 0;

		console.log(`🗑️ ${this.getTaskTypeName()} queue cleared`);
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

	// 抽象メソッド - 各サブクラスで実装
	protected abstract isAlreadyLoaded(imagePath: string): boolean;
	protected abstract performLoad(imagePath: string): Promise<void>;
	protected abstract setErrorStatus(imagePath: string): void;
	protected abstract getTaskTypeName(): string;
}

/**
 * サムネイル生成専用キュー
 */
class ThumbnailQueue extends BaseImageFileAccessQueue {
	protected isAlreadyLoaded(imagePath: string): boolean {
		const thumbnail = thumbnailStore.actions.getThumbnailItem(imagePath);
		return thumbnail.loadingStatus === 'loaded';
	}

	protected async performLoad(imagePath: string): Promise<void> {
		// loadThumbnail内で状態管理を行うため、ここでは状態変更しない
		await thumbnailStore.actions.loadThumbnail(imagePath);
	}

	protected setErrorStatus(imagePath: string): void {
		const thumbnail = thumbnailStore.actions.getThumbnailItem(imagePath);
		thumbnail.loadingStatus = 'error';
	}

	protected getTaskTypeName(): string {
		return 'thumbnail';
	}
}

/**
 * メタデータ読み込み専用キュー
 */
class MetadataQueue extends BaseImageFileAccessQueue {
	protected isAlreadyLoaded(imagePath: string): boolean {
		const metadata = imageMetadataStore.actions.getMetadataItem(imagePath);
		return metadata.loadingStatus === 'loaded';
	}

	protected async performLoad(imagePath: string): Promise<void> {
		// loadMetadata内で状態管理を行うため、ここでは状態変更しない
		await imageMetadataStore.actions.loadMetadata(imagePath);
	}

	protected setErrorStatus(imagePath: string): void {
		const metadata = imageMetadataStore.actions.getMetadataItem(imagePath);
		metadata.loadingStatus = 'error';
	}

	protected getTaskTypeName(): string {
		return 'metadata';
	}
}

/**
 * グローバルキューインスタンス
 */
export const thumbnailQueue = new ThumbnailQueue();
export const metadataQueue = new MetadataQueue();
