type QueueTask = {
	id: string;
	handler: (abortSignal: AbortSignal) => Promise<void>;
	abortController: AbortController;
};

/**
 * 画像ファイルアクセス基底キュー管理クラス
 */
export class BaseQueue {
	protected queue: QueueTask[] = [];
	protected processing = false;
	protected maxConcurrent = 10;
	protected activeJobs = new Map<string, { promise: Promise<void>, task: QueueTask }>(); // 統合管理
	protected stopped = false;

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
	async enqueue(
		id: string,
		handler: (abortSignal: AbortSignal) => Promise<void>,
		taskTypeName: string
	): Promise<void> {
		// キューが停止している場合は即座にreject
		if (this.stopped) {
			throw new Error('Queue is stopped');
		}

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

		// AbortControllerを作成
		const abortController = new AbortController();

		// キューに追加
		const task: QueueTask = {
			id,
			handler,
			abortController
		};

		if (!this.queue.some((t) => t.id === id)) {
			this.queue.push(task);
			console.log(
				`📋 ${taskTypeName} queued: ${id.split('/').pop()} | Queue size: ${this.queue.length}, Active: ${this.activeJobs.size}/${this.maxConcurrent}`
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

		while ((this.queue.length > 0 || this.activeJobs.size > 0) && !this.stopped) {
			// 最大同時実行数に達していない場合、新しいジョブを開始
			while (this.activeJobs.size < this.maxConcurrent && this.queue.length > 0 && !this.stopped) {
				const task = this.queue.shift()!;
				console.log(
					`▶️ Processing ${taskTypeName}: ${task.id.split('/').pop()} | Queue remaining: ${this.queue.length}, Active: ${this.activeJobs.size + 1}/${this.maxConcurrent}`
				);

				const job = this.executeQueueTask(task, taskTypeName);
				this.activeJobs.set(task.id, { promise: job, task });

				// ジョブ完了時にアクティブジョブから削除
				job.finally(() => {
					this.activeJobs.delete(task.id);
					console.log(
						`✅ Completed ${taskTypeName}: ${task.id.split('/').pop()} | Active jobs remaining: ${this.activeJobs.size}`
					);
				});
			}

			// 少なくとも1つのジョブが完了するまで待機
			if (this.activeJobs.size > 0 && !this.stopped) {
				const promises = Array.from(this.activeJobs.values()).map(job => job.promise);
				await Promise.race(promises);
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
			await this.executeTask(task.id, task.handler, task.abortController.signal, taskTypeName);
		} catch (error) {
			console.error(
				`❌ ${taskTypeName} execution failed: ${task.id.split('/').pop()} ${error}`
			);
			throw error;
		}
	}

	/**
	 * 実際のタスク実行
	 */
	private async executeTask(
		id: string,
		handler: (abortSignal: AbortSignal) => Promise<void>,
		abortSignal: AbortSignal,
		taskTypeName: string
	): Promise<void> {
		try {
			// 停止チェック
			if (this.stopped || abortSignal.aborted) {
				throw new Error('Task aborted');
			}

			console.log(`🔄 Loading ${taskTypeName}: ${id.split('/').pop()}`);

			// 実際のロード処理を実行（Rust側処理含む、停止不可）
			await handler(abortSignal);

			// 完了後に停止状態を再チェック（Rust処理後の防御）
			if (this.stopped || abortSignal.aborted) {
				console.log(`🛑 ${taskTypeName} ignored after completion (queue stopped): ${id.split('/').pop()}`);
				return; // 結果を無視
			}

			console.log(`✅ Completed ${taskTypeName} load: ${id.split('/').pop()}`);

			// 成功時にすべてのPromiseをresolve（停止されていない場合のみ）
			const resolvers = this.pendingResolvers.get(id);
			if (resolvers) {
				for (const resolver of resolvers) {
					resolver.resolve();
				}
				this.pendingResolvers.delete(id);
			}
		} catch (error) {
			console.error(`❌ ${taskTypeName} load failed: ${id.split('/').pop()} ${error}`);

			// エラー時も停止状態をチェック
			if (this.stopped) {
				console.log(`🛑 ${taskTypeName} error ignored (queue stopped): ${id.split('/').pop()}`);
				return; // エラーも無視
			}

			// エラー時にすべてのPromiseをreject（停止されていない場合のみ）
			const resolvers = this.pendingResolvers.get(id);
			if (resolvers) {
				for (const resolver of resolvers) {
					resolver.reject(error);
				}
				this.pendingResolvers.delete(id);
			}
		}
	}

	/**
	 * キューをクリア
	 */
	clear(taskTypeName: string): void {
		// 未完了のPromiseをreject
		for (const [, resolvers] of this.pendingResolvers) {
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
	 * キューを停止（進行中のジョブは完了まで待たずに中断）
	 */
	stop(taskTypeName: string): void {
		// 停止フラグを設定
		this.stopped = true;
		
		// 処理中のフラグをリセット
		this.processing = false;

		// キューにあるタスク（未実行）のAbortControllerを全て中断
		for (const task of this.queue) {
			task.abortController.abort();
		}

		// 実行中タスクのAbortControllerも中断（Rust側は止まらないが、フラグは設定）
		for (const { task } of this.activeJobs.values()) {
			task.abortController.abort();
		}

		// 未完了のPromiseを即座にreject
		for (const [, resolvers] of this.pendingResolvers) {
			for (const resolver of resolvers) {
				resolver.reject(new Error('Queue stopped'));
			}
		}
		this.pendingResolvers.clear();

		// キューをクリア
		this.queue.length = 0;

		// アクティブジョブもクリア（進行中のジョブは中断される）
		this.activeJobs.clear();

		console.log(`⏹️ ${taskTypeName} queue stopped`);
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
