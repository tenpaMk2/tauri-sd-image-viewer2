type QueueTask = {
	imagePath: string;
	handler: () => Promise<void>;
};

/**
 * 画像ファイルアクセス基底キュー管理クラス
 */
export class BaseQueue {
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
	async enqueue(imagePath: string, handler: () => Promise<void>, taskTypeName: string): Promise<void> {
		// 進行中のロード処理に参加
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
			handler
		};

		if (!this.queue.some((t) => t.imagePath === imagePath)) {
			this.queue.push(task);
			console.log(
				`📋 ${taskTypeName} queued: ${imagePath.split('/').pop()} | Queue size: ${this.queue.length}, Active: ${this.activeJobs.size}/${this.maxConcurrent}`
			);

			// 処理を開始
			this.processQueue(taskTypeName);
		}

		return promise;
	}

	/**
	 * キューの処理を開始
	 */
	private async processQueue(taskTypeName: string): Promise<void> {
		if (this.processing) return;
		this.processing = true;

		while (this.queue.length > 0 || this.activeJobs.size > 0) {
			// 最大同時実行数に達していない場合、新しいジョブを開始
			while (this.activeJobs.size < this.maxConcurrent && this.queue.length > 0) {
				const task = this.queue.shift()!;
				console.log(
					`▶️ Processing ${taskTypeName}: ${task.imagePath.split('/').pop()} | Queue remaining: ${this.queue.length}, Active: ${this.activeJobs.size + 1}/${this.maxConcurrent}`
				);

				const job = this.executeQueueTask(task, taskTypeName);
				this.activeJobs.add(job);

				// ジョブ完了時にアクティブジョブから削除
				job.finally(() => {
					this.activeJobs.delete(job);
					console.log(
						`✅ Completed ${taskTypeName}: ${task.imagePath.split('/').pop()} | Active jobs remaining: ${this.activeJobs.size}`
					);
				});
			}

			// 少なくとも1つのジョブが完了するまで待機
			if (this.activeJobs.size > 0) {
				await Promise.race(Array.from(this.activeJobs));
			}
		}

		this.processing = false;
		console.log(`✅ ${taskTypeName} queue processing completed`);
	}

	/**
	 * キューのタスクを実行
	 */
	private async executeQueueTask(task: QueueTask, taskTypeName: string): Promise<void> {
		try {
			await this.executeTask(task.imagePath, task.handler, taskTypeName);
		} catch (error) {
			console.error(
				`❌ ${taskTypeName} execution failed: ${task.imagePath.split('/').pop()} ${error}`
			);
			throw error;
		}
	}

	/**
	 * 実際のタスク実行
	 */
	private async executeTask(imagePath: string, handler: () => Promise<void>, taskTypeName: string): Promise<void> {
		try {
			console.log(`🔄 Loading ${taskTypeName}: ${imagePath.split('/').pop()}`);

			// 実際のロード処理を実行
			await handler();

			console.log(`✅ Completed ${taskTypeName} load: ${imagePath.split('/').pop()}`);

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
				`❌ ${taskTypeName} load failed: ${imagePath.split('/').pop()} ${error}`
			);

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
	clear(taskTypeName: string): void {
		// 未完了のPromiseをreject
		for (const [imagePath, resolvers] of this.pendingResolvers) {
			for (const resolver of resolvers) {
				resolver.reject(new Error('Queue cleared'));
			}
		}
		this.pendingResolvers.clear();

		// キューをクリア
		this.queue.length = 0;

		console.log(`🗑️ ${taskTypeName} queue cleared`);
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