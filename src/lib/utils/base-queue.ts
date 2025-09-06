type QueueTask = {
	id: string;
	handler: () => Promise<void>;
};

type EnqueueOptions = {
	priority?: 'high' | 'normal';
	debugLabel?: string;
};

type QueueLogger = {
	onEnqueue?: (id: string, priority: string, debugLabel: string, queueSize: number, activeCount: number) => void;
	onProcessStart?: (id: string, debugLabel: string, queueRemaining: number, activeCount: number) => void;
	onTaskStart?: (id: string, debugLabel: string) => void;
	onTaskComplete?: (id: string, debugLabel: string, activeCount: number) => void;
	onTaskError?: (id: string, debugLabel: string, error: any) => void;
	onQueueComplete?: (debugLabel: string) => void;
	onClearPending?: () => void;
	onClearComplete?: () => void;
};

/**
 * 画像ファイルアクセス基底キュー管理クラス
 */
export class BaseQueue {
	protected queue: QueueTask[] = [];
	protected processing = false;
	protected maxConcurrent = 10;
	protected activeJobs = new Map<string, Promise<void>>();
	protected logger?: QueueLogger;

	constructor(logger?: QueueLogger) {
		this.logger = logger;
	}

	/**
	 * タスクをキューに追加してPromiseを返す
	 * @param id タスクの一意識別子
	 * @param handler 実行する処理
	 * @param options オプション（優先度、デバッグラベル等）
	 */
	async enqueue(
		id: string,
		handler: () => Promise<void>,
		options: EnqueueOptions = {},
	): Promise<void> {
		const { priority = 'normal', debugLabel = 'task' } = options;

		// キューに追加
		const task: QueueTask = {
			id,
			handler,
		};

		// 優先度に基づいてキューに追加
		if (priority === 'high') {
			this.queue.unshift(task); // 先頭に追加
		} else {
			this.queue.push(task); // 末尾に追加
		}

		this.logger?.onEnqueue?.(id, priority, debugLabel, this.queue.length, this.activeJobs.size);

		// 処理を開始
		this.processQueue(debugLabel);

		// タスク完了まで待機
		return this.waitForTask(id);
	}

	/**
	 * 指定されたタスクの完了を待機
	 */
	private async waitForTask(id: string): Promise<void> {
		while (this.activeJobs.has(id) || this.queue.some(task => task.id === id)) {
			if (this.activeJobs.has(id)) {
				await this.activeJobs.get(id);
				return;
			}
			// まだキューにある場合は少し待ってから再チェック
			await new Promise(resolve => setTimeout(resolve, 10));
		}
	}

	/**
	 * キューの処理を開始
	 * @param debugLabel ログ出力用のラベル（処理に影響しないメタ情報）
	 */
	private async processQueue(debugLabel: string): Promise<void> {
		if (this.processing) return;
		this.processing = true;

		while (this.queue.length > 0 || this.activeJobs.size > 0) {
			// 最大同時実行数に達していない場合、新しいジョブを開始
			while (this.activeJobs.size < this.maxConcurrent && this.queue.length > 0) {
				const task = this.queue.shift()!;
				this.logger?.onProcessStart?.(task.id, debugLabel, this.queue.length, this.activeJobs.size + 1);

				const job = this.executeTask(task.id, task.handler, debugLabel);
				this.activeJobs.set(task.id, job);

				// ジョブ完了時にアクティブジョブから削除
				job.finally(() => {
					this.activeJobs.delete(task.id);
					this.logger?.onTaskComplete?.(task.id, debugLabel, this.activeJobs.size);
				});
			}

			// 少なくとも1つのジョブが完了するまで待機
			if (this.activeJobs.size > 0) {
				const promises = Array.from(this.activeJobs.values());
				await Promise.race(promises);
			}
		}

		this.processing = false;
		this.logger?.onQueueComplete?.(debugLabel);
	}

	/**
	 * タスクを実行
	 * @param debugLabel ログ出力用のラベル（処理に影響しないメタ情報）
	 */
	private async executeTask(
		id: string,
		handler: () => Promise<void>,
		debugLabel: string,
	): Promise<void> {
		try {
			this.logger?.onTaskStart?.(id, debugLabel);

			// 実際のロード処理を実行（Rust側処理含む）
			await handler();

		} catch (error) {
			this.logger?.onTaskError?.(id, debugLabel, error);
			throw error; // エラーを再スロー
		}
	}

	/**
	 * 未処理のキューをクリア（実行中タスクは継続、新規タスクは受付可能）
	 */
	clearPendingTasks(): void {
		this.logger?.onClearPending?.();

		// 未処理のキューをクリア
		this.queue.length = 0;

		this.logger?.onClearComplete?.();
	}

	/**
	 * 最大同時実行数を設定
	 */
	setMaxConcurrent(maxConcurrent: number): void {
		this.maxConcurrent = Math.max(1, maxConcurrent);
	}
}
