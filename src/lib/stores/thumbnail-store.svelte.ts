import { Channel, invoke } from '@tauri-apps/api/core';
import { thumbnailQueueService } from '../services/thumbnail-queue-service.svelte';

/**
 * サムネイルロード状態
 */
type LoadingStatus = 'unloaded' | 'loading' | 'loaded';

/**
 * リアクティブな画像サムネイル（Promiseベース）
 */
export class ReactiveImageThumbnail {
	imagePath: string;

	// サムネイルURL（$stateで管理、undefinedは未ロード状態）
	thumbnailUrl = $state<string | undefined>(undefined);

	// ロード状態管理
	loadingStatus = $state<LoadingStatus>('unloaded');
	loadError = $state<string | undefined>(undefined);

	// 内部管理用
	private loadPromise?: Promise<void>;

	constructor(imagePath: string) {
		this.imagePath = imagePath;
	}

	/**
	 * サムネイルの読み込み（一度だけ実行される）
	 */
	async ensureLoaded(): Promise<void> {
		// 既にロード済みの場合は何もしない
		if (this.loadingStatus === 'loaded') {
			return;
		}

		// 既にロード中の場合は既存のPromiseを待つ
		if (this.loadPromise) {
			return this.loadPromise;
		}

		// キューサービス経由でロード処理を開始
		this.loadPromise = thumbnailQueueService.enqueue(this.imagePath).then(() => {
			this.loadPromise = undefined; // ロード完了時にPromiseをクリア
		});

		return this.loadPromise;
	}

	/**
	 * 自動ロードを開始する共通処理
	 */
	private triggerAutoLoad(): void {
		if (this.loadingStatus === 'unloaded') {
			this.loadingStatus = 'loading';
			this.ensureLoaded()
				.then(() => {
					this.loadingStatus = 'loaded';
				})
				.catch((error) => {
					this.loadingStatus = 'unloaded';
					console.error(
						'❌ Auto-load failed for thumbnail: ' + this.imagePath.split('/').pop() + ' ' + error
					);
				});
		}
	}

	/**
	 * サムネイルURLを同期的に取得（リアクティブ、自動ロード付き）
	 */
	get thumbnailUrlValue(): string | undefined {
		this.triggerAutoLoad();
		return this.thumbnailUrl;
	}

	/**
	 * サムネイルの実際のロード処理（キューサービスから呼ばれる）
	 * @internal キューサービス専用メソッド - 直接呼び出し禁止
	 */
	async load(): Promise<void> {
		try {
			console.log('🔄 Loading thumbnail: ' + this.imagePath.split('/').pop());

			const channel = new Channel<Uint8Array>();

			channel.onmessage = (data) => {
				console.log(
					'Thumbnail data received: ' +
						this.imagePath +
						' data size: ' +
						(data?.length || 'undefined')
				);
				try {
					const blob = new Blob([new Uint8Array(data)], { type: 'image/webp' });
					const thumbnailUrl = URL.createObjectURL(blob);

					console.log(
						'Thumbnail generated successfully: ' + this.imagePath + ' URL: ' + thumbnailUrl
					);

					// リアクティブ状態を更新
					this.thumbnailUrl = thumbnailUrl;
					this.loadError = undefined;
				} catch (error) {
					console.error('Thumbnail data processing failed: ' + this.imagePath + ' ' + error);
					this.loadError = 'Failed to process thumbnail data';
				}
			};

			await invoke('generate_thumbnail_async', {
				imagePath: this.imagePath,
				config: null,
				channel
			});

			// ロード状態を更新
			this.loadingStatus = 'loaded';

			console.log('✅ Thumbnail loaded: ' + this.imagePath.split('/').pop());
		} catch (error) {
			console.error('❌ Thumbnail load failed: ' + this.imagePath.split('/').pop() + ' ' + error);
			this.loadError = error instanceof Error ? error.message : String(error);
			throw error; // エラーを再スロー
		}
	}
}

/**
 * グローバル画像サムネイルストア
 */
class ImageThumbnailStore {
	// 各画像のリアクティブサムネイル
	private thumbnailMap = new Map<string, ReactiveImageThumbnail>();

	/**
	 * 画像のサムネイルストアを取得（なければ作成）
	 */
	getThumbnail(imagePath: string): ReactiveImageThumbnail {
		if (!this.thumbnailMap.has(imagePath)) {
			console.log('🆕 Creating thumbnail store: ' + imagePath.split('/').pop());
			const thumbnail = new ReactiveImageThumbnail(imagePath);
			this.thumbnailMap.set(imagePath, thumbnail);

			// 新しいインスタンス作成時に自動的にロードを開始
			if (thumbnail.loadingStatus === 'unloaded') {
				thumbnail.ensureLoaded().catch((error: unknown) => {
					console.error(
						'Failed to auto-load thumbnail for ' + imagePath.split('/').pop() + ': ' + error
					);
				});
			}
		}
		return this.thumbnailMap.get(imagePath)!;
	}

	/**
	 * 複数画像のサムネイルを事前読み込み
	 */
	async preloadThumbnails(imagePaths: string[]): Promise<void> {
		console.log('🔄 Preloading thumbnails for ' + imagePaths.length + ' images');

		const loadPromises = imagePaths.map((imagePath) => {
			const thumbnail = this.getThumbnail(imagePath);
			if (thumbnail.loadingStatus === 'unloaded') {
				return thumbnail.ensureLoaded();
			}
			return Promise.resolve();
		});

		await Promise.all(loadPromises);
		console.log('✅ Thumbnail preloading completed');
	}

	/**
	 * 未使用のサムネイルをクリア
	 */
	clearUnused(currentImagePaths: string[]): void {
		const currentPathSet = new Set(currentImagePaths);
		let removedCount = 0;

		for (const [path, thumbnail] of this.thumbnailMap) {
			if (!currentPathSet.has(path)) {
				// BlobURLを解放
				if (thumbnail.thumbnailUrl) {
					try {
						URL.revokeObjectURL(thumbnail.thumbnailUrl);
					} catch (error) {
						console.warn('Failed to revoke thumbnail URL:', error);
					}
				}
				this.thumbnailMap.delete(path);
				removedCount++;
			}
		}

		if (removedCount > 0) {
			console.log('🗑️ Cleared ' + removedCount + ' unused thumbnail entries');
		}
	}

	/**
	 * 全サムネイルをクリア
	 */
	clearAll(): void {
		// 全てのBlobURLを解放
		for (const [, thumbnail] of this.thumbnailMap) {
			if (thumbnail.thumbnailUrl) {
				try {
					URL.revokeObjectURL(thumbnail.thumbnailUrl);
				} catch (error) {
					console.warn('Failed to revoke thumbnail URL:', error);
				}
			}
		}
		this.thumbnailMap.clear();
		console.log('🗑️ All thumbnails cleared');
	}
}

/**
 * グローバルインスタンス
 */
export const thumbnailStore = new ImageThumbnailStore();
