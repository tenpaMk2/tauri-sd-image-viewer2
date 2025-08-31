type QueueTask = {
	id: string;
	handler: () => Promise<void>;
};

type EnqueueOptions = {
	priority?: 'high' | 'normal';
	debugLabel?: string;
};

/**
 * 画像ファイルアクセス基底キュー管理クラス
 */
export class BaseQueue {
	protected queue: QueueTask[] = [];
	protected processing = false;
	protected maxConcurrent = 10;
	protected activeJobs = new Map<string, Promise<void>>();

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
		// 進行中のロード処理に参加
		if (this.pendingResolvers.has(id)) {
			return new Promise<void>((resolve, reject) => {
				const resolvers = this.pendingResolvers.get(id)!;
				resolvers.push({ resolve, reject });
			});
		}

		// 新しいPromiseを作成
		const promise = new Promise<void>((resolve, reject) => {
			this.pendingResolvers.set(id, [{ resolve, reject }]);
		});

		// キューに追加
		const task: QueueTask = {
			id,
			handler,
		};

		if (!this.queue.some((t) => t.id === id)) {
			// 優先度に基づいてキューに追加
			if (priority === 'high') {
				this.queue.unshift(task); // 先頭に追加
			} else {
				this.queue.push(task); // 末尾に追加
			}

			const priorityIcon = priority === 'high' ? '⚡' : '📋';
			console.log(
				`${priorityIcon} ${debugLabel} queued (${priority}): ${id.split('/').pop()} | Queue size: ${this.queue.length}, Active: ${this.activeJobs.size}/${this.maxConcurrent}`,
			);

			// 処理を開始
			this.processQueue(debugLabel);
		}

		return promise;
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
				console.log(
					`▶️ Processing ${debugLabel}: ${task.id.split('/').pop()} | Queue remaining: ${this.queue.length}, Active: ${this.activeJobs.size + 1}/${this.maxConcurrent}`,
				);

				const job = this.executeTask(task.id, task.handler, debugLabel);
				this.activeJobs.set(task.id, job);

				// ジョブ完了時にアクティブジョブから削除
				job.finally(() => {
					this.activeJobs.delete(task.id);
					console.log(
						`✅ Completed ${debugLabel}: ${task.id.split('/').pop()} | Active jobs remaining: ${this.activeJobs.size}`,
					);
				});
			}

			// 少なくとも1つのジョブが完了するまで待機
			if (this.activeJobs.size > 0) {
				const promises = Array.from(this.activeJobs.values());
				await Promise.race(promises);
			}
		}

		this.processing = false;
		console.log(`✅ ${debugLabel} queue processing completed`);
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
			console.log(`🔄 Loading ${debugLabel}: ${id.split('/').pop()}`);

			// 実際のロード処理を実行（Rust側処理含む）
			await handler();

			console.log(`✅ Completed ${debugLabel} load: ${id.split('/').pop()}`);

			// 成功時にすべてのPromiseをresolve
			const resolvers = this.pendingResolvers.get(id);
			if (resolvers) {
				for (const resolver of resolvers) {
					resolver.resolve();
				}
				this.pendingResolvers.delete(id);
			}
		} catch (error) {
			console.error(`❌ ${debugLabel} execution failed: ${id.split('/').pop()} ${error}`);

			// エラー時にすべてのPromiseをreject
			const resolvers = this.pendingResolvers.get(id);
			if (resolvers) {
				for (const resolver of resolvers) {
					resolver.reject(error);
				}
				this.pendingResolvers.delete(id);
			}
			throw error; // エラーを再スロー
		}
	}

	/**
	 * 未処理のキューをクリア（実行中タスクは継続、新規タスクは受付可能）
	 */
	clearPendingTasks(): void {
		console.log(`🧹 Clearing pending tasks`);

		// 未実行のタスクのPromiseをreject
		for (const [id, resolvers] of this.pendingResolvers) {
			if (!this.activeJobs.has(id)) {
				// 実行中でないもののみ
				for (const resolver of resolvers) {
					resolver.reject(new Error('Task cancelled'));
				}
				this.pendingResolvers.delete(id);
			}
		}

		// 未処理のキューをクリア
		this.queue.length = 0;

		console.log(`🗑️ pending tasks cleared`);
	}

	/**
	 * 最大同時実行数を設定
	 */
	setMaxConcurrent(maxConcurrent: number): void {
		this.maxConcurrent = Math.max(1, maxConcurrent);
	}
}
