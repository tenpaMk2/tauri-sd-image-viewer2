import { path } from '@tauri-apps/api';
import { Channel, invoke } from '@tauri-apps/api/core';
import PQueue from 'p-queue';

/**
 * サムネイル専用キューインスタンスを作成（同時実行数10に制限）
 */
export const createThumbnailQueue = (): PQueue => {
	return new PQueue({ concurrency: 10 });
};

/**
 * サムネイルロード状態
 */
type LoadingStatus = 'queued' | 'loading' | 'loaded' | 'error';

type MutableThumbnailState = {
	thumbnailUrl: string | undefined;
	loadingStatus: LoadingStatus;
	loadError: string | undefined;
};

export type ThumbnailState = Readonly<MutableThumbnailState>;

export type ThumbnailActions = {
	load: (abortSignal?: AbortSignal) => Promise<void>;
	destroy: () => void;
};

export type ThumbnailStore = {
	state: ThumbnailState;
	actions: ThumbnailActions;
};

/**
 * 個別画像のサムネイルストアを作成
 */
export const createThumbnailStore = (imagePath: string): ThumbnailStore => {
	const state = $state<MutableThumbnailState>({
		thumbnailUrl: undefined,
		loadingStatus: 'queued',
		loadError: undefined,
	});

	const actions: ThumbnailActions = {
		load: async (abortSignal?: AbortSignal): Promise<void> => {
			if (abortSignal?.aborted) {
				throw new Error('Aborted');
			}

			try {
				state.loadingStatus = 'loading';
				console.log(`🔄 Loading thumbnail: ${await path.basename(imagePath)}`);

				const channel = new Channel<Uint8Array>();

				// onmessageをPromise化
				const thumbnailPromise = new Promise<void>((resolve, reject) => {
					channel.onmessage = (data) => {
						console.log(
							`Thumbnail data received: ${imagePath}, data size: ${data?.length ?? 'undefined'}`,
						);

						// AbortSignalチェック（URL.createObjectURL前）
						if (abortSignal?.aborted) {
							console.log(`🛑 Thumbnail generation aborted after completion: ${imagePath}`);
							reject(new Error('Aborted'));
							return;
						}

						try {
							const blob = new Blob([new Uint8Array(data)], { type: 'image/webp' });
							const thumbnailUrl = URL.createObjectURL(blob);

							console.log(`Thumbnail generated successfully: ${imagePath}, URL: ${thumbnailUrl}`);

							// リアクティブ状態を更新
							state.thumbnailUrl = thumbnailUrl;
							state.loadError = undefined;
							state.loadingStatus = 'loaded';
							resolve();
						} catch (error) {
							console.error('Thumbnail data processing failed: ' + imagePath + ' ' + error);
							if (!abortSignal?.aborted) {
								state.loadError = 'Failed to process thumbnail data';
								state.loadingStatus = 'error';
							}
							reject(error);
						}
					};
				});

				// AbortSignal監視
				if (abortSignal) {
					abortSignal.addEventListener('abort', () => {
						console.log('🛑 Thumbnail loading aborted: ' + imagePath.split('/').pop());
					});
				}

				// invokeは非同期で開始（Rust側は中断不可）
				invoke('generate_thumbnail_async', {
					imagePath: imagePath,
					config: null,
					channel,
				}).catch((error) => {
					if (!abortSignal?.aborted) {
						state.loadingStatus = 'error';
						state.loadError = error instanceof Error ? error.message : String(error);
					}
				});

				// onmessageのPromiseを待機
				await thumbnailPromise;

				console.log('✅ Thumbnail loaded: ' + (await path.basename(imagePath)));
			} catch (error) {
				if (abortSignal?.aborted) {
					console.log('🛑 Thumbnail loading was aborted: ' + imagePath.split('/').pop());
					// Abort時は状態を更新しない
				} else {
					state.loadingStatus = 'error';
					console.error('❌ Thumbnail load failed: ' + imagePath.split('/').pop() + ' ' + error);
					state.loadError = error instanceof Error ? error.message : String(error);
				}
				throw error;
			}
		},

		destroy: (): void => {
			// BlobURLを解放
			if (state.thumbnailUrl) {
				try {
					URL.revokeObjectURL(state.thumbnailUrl);
				} catch (error) {
					console.warn('Failed to revoke thumbnail URL:', error);
				}
			}

			// 状態をクリア
			state.thumbnailUrl = undefined;
			state.loadingStatus = 'queued';
			state.loadError = undefined;
		},
	};

	return { state: state as ThumbnailState, actions };
};
