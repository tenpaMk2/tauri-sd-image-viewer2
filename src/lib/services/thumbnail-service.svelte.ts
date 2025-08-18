import { Channel, invoke } from '@tauri-apps/api/core';
import { getImageFiles } from '../image/image-loader';

/**
 * サムネイル処理状態
 */
export type ThumbnailStatus = 'idle' | 'running' | 'cancelled' | 'completed';

/**
 * 進捗状態
 */
export type ThumbnailProgress = {
	completed: number;
	total: number;
	percentage: number;
};

/**
 * リアクティブサムネイル生成サービス
 * サムネイルキャッシュと進捗状態をリアクティブに管理
 */
export class ThumbnailService {
	// リアクティブ状態
	private _thumbnails = $state<Map<string, string>>(new Map());
	private _status = $state<ThumbnailStatus>('idle');
	private _progress = $state<ThumbnailProgress>({ completed: 0, total: 0, percentage: 0 });
	private _errorMessages = $state<Map<string, string>>(new Map());

	// 内部管理
	private maxConcurrent = 3;
	private activeJobs = new Set<Promise<void>>();
	private pendingPaths: string[] = [];
	private shouldStop = false;

	/**
	 * サムネイルキャッシュ（読み取り専用）
	 */
	get thumbnails(): ReadonlyMap<string, string> {
		return this._thumbnails;
	}

	/**
	 * 処理状態
	 */
	get status(): ThumbnailStatus {
		return this._status;
	}

	/**
	 * 進捗状態
	 */
	get progress(): ThumbnailProgress {
		return this._progress;
	}

	/**
	 * エラーメッセージ
	 */
	get errorMessages(): ReadonlyMap<string, string> {
		return this._errorMessages;
	}

	/**
	 * サムネイル生成を開始
	 */
	async startProcessing(imagePaths: string[]): Promise<void> {
		console.log('ThumbnailService.startProcessing 呼び出し:', imagePaths.length + '個のファイル');
		
		if (this._status === 'running') {
			console.warn('ThumbnailService is already running');
			return;
		}

		console.log('サムネイル生成開始: ' + imagePaths.length + '個のファイル');

		this.pendingPaths = [...imagePaths];
		this._status = 'running';
		this.shouldStop = false;
		this.activeJobs.clear();
		this._errorMessages.clear();
		this.updateProgress(0, imagePaths.length);

		// 初期ジョブを最大同時実行数まで開始
		for (let i = 0; i < Math.min(this.maxConcurrent, this.pendingPaths.length); i++) {
			this.processNext();
		}

		// 全ジョブの完了を待機
		await this.waitForCompletion();
	}

	/**
	 * サムネイル生成を停止
	 */
	stop(): void {
		if (this._status === 'running') {
			console.log('サムネイル生成を停止');
			this.shouldStop = true;
		}
	}

	/**
	 * 画像ファイル一覧を取得
	 */
	async getImageFiles(directoryPath: string): Promise<string[]> {
		return await getImageFiles(directoryPath);
	}

	/**
	 * サムネイルキャッシュをクリア
	 */
	clearThumbnails(): void {
		// 既存のBlobURLを解放
		for (const url of this._thumbnails.values()) {
			this.safeRevokeUrl(url);
		}
		this._thumbnails.clear();
		this._errorMessages.clear();
		this.updateProgress(0, 0);
	}

	/**
	 * 特定の画像のサムネイルを取得
	 */
	getThumbnail(imagePath: string): string | undefined {
		return this._thumbnails.get(imagePath);
	}

	/**
	 * 特定の画像のエラーメッセージを取得
	 */
	getError(imagePath: string): string | undefined {
		return this._errorMessages.get(imagePath);
	}

	/**
	 * 次のアイテムを処理
	 */
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
			this.updateProgress(
				this._progress.total - this.pendingPaths.length - this.activeJobs.size,
				this._progress.total
			);

			// 次のアイテムを処理
			if (!this.shouldStop && this.pendingPaths.length > 0) {
				this.processNext();
			}

			// 全て完了したかチェック
			if (this.activeJobs.size === 0 && this.pendingPaths.length === 0) {
				if (this.shouldStop) {
					this._status = 'cancelled';
					console.log('サムネイル生成がキャンセルされました');
				} else {
					this._status = 'completed';
					console.log('サムネイル生成完了');
				}
			}
		}
	}

	/**
	 * 単一サムネイルを処理
	 */
	private async processSingleThumbnail(imagePath: string): Promise<void> {
		try {
			const channel = new Channel<Uint8Array>();

			channel.onmessage = (data) => {
				console.log('サムネイルデータ受信: ' + imagePath + ' データサイズ: ' + (data?.length || 'undefined'));
				try {
					const blob = new Blob([new Uint8Array(data)], { type: 'image/webp' });
					const thumbnailUrl = URL.createObjectURL(blob);

					console.log('サムネイル生成成功: ' + imagePath + ' URL: ' + thumbnailUrl);

					// リアクティブ状態を更新（明示的な再代入でリアクティビティをトリガー）
					this._thumbnails.set(imagePath, thumbnailUrl);
					this._thumbnails = new Map(this._thumbnails); // リアクティブ更新をトリガー
					this._errorMessages.delete(imagePath);
				} catch (error) {
					console.error('サムネイルデータ処理失敗: ' + imagePath + ' ' + error);
					this._errorMessages.set(imagePath, 'Failed to process thumbnail data');
				}
			};

			await invoke('generate_thumbnail_async', {
				imagePath,
				config: null,
				channel
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error('サムネイル生成失敗: ' + imagePath + ' ' + errorMessage);
			this._errorMessages.set(imagePath, errorMessage);
		}
	}

	/**
	 * 完了を待機
	 */
	private async waitForCompletion(): Promise<void> {
		while (this.activeJobs.size > 0 || this.pendingPaths.length > 0) {
			if (this.shouldStop) break;

			if (this.activeJobs.size > 0) {
				await Promise.race(Array.from(this.activeJobs));
			} else {
				await new Promise((resolve) => setTimeout(resolve, 10));
			}
		}
	}

	/**
	 * 進捗状態を更新
	 */
	private updateProgress(completed: number, total: number): void {
		const percentage = total > 0 ? (completed / total) * 100 : 0;
		this._progress = { completed, total, percentage };
	}

	/**
	 * BlobURLを安全に解放
	 */
	private safeRevokeUrl(url: string): void {
		try {
			if (url && url.startsWith('blob:')) {
				URL.revokeObjectURL(url);
			}
		} catch (error) {
			console.warn('サムネイルURL解放失敗:', url, error);
		}
	}

	/**
	 * 最大同時実行数を設定
	 */
	setMaxConcurrent(maxConcurrent: number): void {
		this.maxConcurrent = Math.max(1, maxConcurrent);
	}

	/**
	 * アクティブジョブ数を取得
	 */
	getActiveJobCount(): number {
		return this.activeJobs.size;
	}

	/**
	 * 保留中ジョブ数を取得
	 */
	getPendingJobCount(): number {
		return this.pendingPaths.length;
	}
}

/**
 * グローバルサムネイルサービスインスタンス
 */
export const thumbnailService = new ThumbnailService();
