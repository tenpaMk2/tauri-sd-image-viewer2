import { imageMetadataStore } from '../stores/image-metadata-store.svelte';
import { thumbnailStore } from '../stores/thumbnail-store.svelte';

type TaskType = 'thumbnail' | 'metadata';
type Priority = 'high' | 'medium' | 'low';

type QueueTask = {
	imagePath: string;
	taskType: TaskType;
	priority: Priority;
	handler: () => Promise<void>;
};

/**
 * 画像ファイルアクセス統合キュー管理サービス
 * サムネイル生成とメタデータ読み込みを優先度付きで処理する
 */
export class ImageFileAccessQueueService {
	private queues: Map<Priority, QueueTask[]> = new Map([
		['high', []],
		['medium', []],
		['low', []]
	]);

	private processing = false;
	private maxConcurrent = 5; // 全体の同時実行数
	private activeJobs = new Set<Promise<void>>();

	// 進行中のロード処理を管理（パスごとにresolve関数を保持）
	private pendingResolvers = new Map<
		string,
		{
			resolve: () => void;
			reject: (error: any) => void;
		}[]
	>();

	/**
	 * サムネイル生成をキューに追加（高優先度）
	 */
	async enqueueThumbnail(imagePath: string): Promise<void> {
		return this.enqueue(imagePath, 'thumbnail', 'high');
	}

	/**
	 * メタデータ読み込みをキューに追加（中優先度）
	 */
	async enqueueMetadata(imagePath: string): Promise<void> {
		return this.enqueue(imagePath, 'metadata', 'medium');
	}

	/**
	 * 画像ファイルアクセスタスクをキューに追加してPromiseを返す
	 */
	private async enqueue(imagePath: string, taskType: TaskType, priority: Priority): Promise<void> {
		const taskKey = `${imagePath}:${taskType}`;

		// すでにロード済みの場合は即座に完了
		if (this.isAlreadyLoaded(imagePath, taskType)) {
			return;
		}

		// すでに同じタスクが進行中の場合は、そのPromiseに相乗り
		if (this.pendingResolvers.has(taskKey)) {
			return new Promise<void>((resolve, reject) => {
				const resolvers = this.pendingResolvers.get(taskKey)!;
				resolvers.push({ resolve, reject });
			});
		}

		// 新しいPromiseを作成
		const promise = new Promise<void>((resolve, reject) => {
			this.pendingResolvers.set(taskKey, [{ resolve, reject }]);
		});

		// キューに追加
		const task: QueueTask = {
			imagePath,
			taskType,
			priority,
			handler: () => this.executeTask(imagePath, taskType)
		};

		const queue = this.queues.get(priority)!;
		if (!queue.some((t) => t.imagePath === imagePath && t.taskType === taskType)) {
			queue.push(task);
			const queueSizes = this.getQueueSizeByPriority();
			console.log(
				`📋 ${taskType.charAt(0).toUpperCase() + taskType.slice(1)} queued (${priority}): ` +
					imagePath.split('/').pop() +
					` | Queue sizes - High: ${queueSizes.high}, Medium: ${queueSizes.medium}, Low: ${queueSizes.low}, Active: ${this.activeJobs.size}`
			);

			// 処理を開始
			this.processQueue();
		}

		return promise;
	}

	/**
	 * 既にロード済みかどうかチェック
	 * queued状態以上を「処理中/完了」とみなして重複処理を防ぐ
	 */
	private isAlreadyLoaded(imagePath: string, taskType: TaskType): boolean {
		if (taskType === 'thumbnail') {
			const thumbnail = thumbnailStore.getThumbnail(imagePath);
			const isProcessingOrLoaded = ['queued', 'loading', 'loaded'].includes(
				thumbnail.loadingStatus
			);
			console.log(
				`🔍 isAlreadyLoaded check for thumbnail: ${imagePath.split('/').pop()} - Status: ${thumbnail.loadingStatus}, IsProcessingOrLoaded: ${isProcessingOrLoaded}`
			);
			return isProcessingOrLoaded;
		} else {
			const metadata = imageMetadataStore.getMetadata(imagePath);
			const isProcessingOrLoaded = ['queued', 'loading', 'loaded'].includes(metadata.loadingStatus);
			console.log(
				`🔍 isAlreadyLoaded check for metadata: ${imagePath.split('/').pop()} - Status: ${metadata.loadingStatus}, IsProcessingOrLoaded: ${isProcessingOrLoaded}`
			);
			return isProcessingOrLoaded;
		}
	}

	/**
	 * キューの処理を開始（優先度順）
	 */
	private async processQueue(): Promise<void> {
		if (this.processing) return;
		this.processing = true;

		while (this.hasAnyTask() || this.activeJobs.size > 0) {
			// 最大同時実行数に達していない場合、新しいジョブを開始
			while (this.activeJobs.size < this.maxConcurrent) {
				const task = this.getNextTask();
				if (!task) break;

				const job = this.executeQueueTask(task);
				this.activeJobs.add(job);

				// ジョブ完了時にアクティブジョブから削除
				job.finally(() => {
					this.activeJobs.delete(job);
				});
			}

			// 少なくとも1つのジョブが完了するまで待機
			if (this.activeJobs.size > 0) {
				await Promise.race(Array.from(this.activeJobs));
			}
		}

		this.processing = false;
		console.log('✅ Image file access queue processing completed');
	}

	/**
	 * 優先度順で次のタスクを取得
	 */
	private getNextTask(): QueueTask | null {
		const priorities: Priority[] = ['high', 'medium', 'low'];

		for (const priority of priorities) {
			const queue = this.queues.get(priority)!;
			if (queue.length > 0) {
				const task = queue.shift()!;
				const queueSizes = this.getQueueSizeByPriority();
				console.log(
					`▶️ Selected task: ${task.taskType} (${task.priority}) for ${task.imagePath.split('/').pop()} | Remaining - High: ${queueSizes.high}, Medium: ${queueSizes.medium}, Low: ${queueSizes.low}`
				);
				return task;
			}
		}

		return null;
	}

	/**
	 * 任意のキューにタスクが存在するかチェック
	 */
	private hasAnyTask(): boolean {
		return Array.from(this.queues.values()).some((queue) => queue.length > 0);
	}

	/**
	 * 全キューの合計サイズを取得
	 */
	private getTotalQueueSize(): number {
		return Array.from(this.queues.values()).reduce((sum, queue) => sum + queue.length, 0);
	}

	/**
	 * キューのタスクを実行
	 */
	private async executeQueueTask(task: QueueTask): Promise<void> {
		try {
			await task.handler();
		} catch (error) {
			console.error(
				`❌ Task execution failed: ${task.imagePath.split('/').pop()} (${task.taskType})`,
				error
			);
			throw error;
		}
	}

	/**
	 * 実際のタスク実行
	 */
	private async executeTask(imagePath: string, taskType: TaskType): Promise<void> {
		const taskKey = `${imagePath}:${taskType}`;

		try {
			console.log(`🔄 Loading ${taskType} from queue: ${imagePath.split('/').pop()}`);

			// ステータスを'loading'に更新
			if (taskType === 'thumbnail') {
				const thumbnail = thumbnailStore.getThumbnail(imagePath);
				thumbnail.loadingStatus = 'loading';
				await thumbnail.load();
				thumbnail.loadingStatus = 'loaded';
			} else {
				const metadata = imageMetadataStore.getMetadata(imagePath);
				metadata.loadingStatus = 'loading';
				await metadata.load();
				metadata.loadingStatus = 'loaded';
			}

			console.log(`✅ Completed ${taskType} load: ${imagePath.split('/').pop()}`);

			// 成功時にすべてのPromiseをresolve
			const resolvers = this.pendingResolvers.get(taskKey);
			if (resolvers) {
				for (const resolver of resolvers) {
					resolver.resolve();
				}
				this.pendingResolvers.delete(taskKey);
			}
		} catch (error) {
			console.error(
				`❌ ${taskType.charAt(0).toUpperCase() + taskType.slice(1)} load failed from queue: ` +
					`${imagePath.split('/').pop()} ${error}`
			);

			// エラー時にステータスを'error'に設定
			if (taskType === 'thumbnail') {
				const thumbnail = thumbnailStore.getThumbnail(imagePath);
				thumbnail.loadingStatus = 'error';
			} else {
				const metadata = imageMetadataStore.getMetadata(imagePath);
				metadata.loadingStatus = 'error';
			}

			// エラー時にすべてのPromiseをreject
			const resolvers = this.pendingResolvers.get(taskKey);
			if (resolvers) {
				for (const resolver of resolvers) {
					resolver.reject(error);
				}
				this.pendingResolvers.delete(taskKey);
			}
		}
	}

	/**
	 * キューをクリア
	 */
	clear(): void {
		// 未完了のPromiseをreject
		for (const [taskKey, resolvers] of this.pendingResolvers) {
			for (const resolver of resolvers) {
				resolver.reject(new Error('Queue cleared'));
			}
		}
		this.pendingResolvers.clear();

		// すべてのキューをクリア
		for (const queue of this.queues.values()) {
			queue.length = 0;
		}

		console.log('🗑️ Image file access queue cleared');
	}

	/**
	 * 現在のキューサイズを取得
	 */
	get queueSize(): number {
		return this.getTotalQueueSize();
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

	/**
	 * 優先度別のキューサイズを取得
	 */
	getQueueSizeByPriority(): Record<Priority, number> {
		return {
			high: this.queues.get('high')!.length,
			medium: this.queues.get('medium')!.length,
			low: this.queues.get('low')!.length
		};
	}
}

/**
 * グローバルインスタンス
 */
export const imageFileAccessQueueService = new ImageFileAccessQueueService();
