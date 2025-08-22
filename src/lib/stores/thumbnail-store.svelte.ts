import { Channel, invoke } from '@tauri-apps/api/core';
import { thumbnailQueue } from './thumbnail-queue';

/**
 * サムネイルロード状態
 */
type LoadingStatus = 'unloaded' | 'queued' | 'loading' | 'loaded' | 'error';

type MutableThumbnailState = {
	thumbnailUrl: string | undefined;
	loadingStatus: LoadingStatus;
	loadError: string | undefined;
	loadingPromise: Promise<void> | undefined;
	// 内部管理用（外部からは触らない）
	_isDestroyed: boolean;
};

export type ThumbnailState = Readonly<MutableThumbnailState>;

export type ThumbnailActions = {
	_load: (abortSignal: AbortSignal) => Promise<void>;
	ensureLoaded: () => Promise<void>;
	destroy: () => void; // メモリリーク防止用
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
		loadingStatus: 'unloaded',
		loadError: undefined,
		loadingPromise: undefined,
		_isDestroyed: false
	});

	const actions: ThumbnailActions = {
		ensureLoaded: async (): Promise<void> => {
			// 破棄済みチェック
			if (state._isDestroyed) {
				throw new Error('Store is destroyed');
			}

			// 既にロード済みの場合は何もしない
			if (state.loadingStatus === 'loaded') {
				return;
			}

			// 既にロード中の場合は既存のPromiseを待つ
			if (state.loadingPromise) {
				return state.loadingPromise;
			}

			// 状態を'queued'に変更
			state.loadingStatus = 'queued';

			// キューサービス経由でロード処理を開始
			state.loadingPromise = thumbnailQueue
				.enqueue(imagePath, (abortSignal) => actions._load(abortSignal), 'thumbnail')
				.then(() => {
					// 完了時に破棄済みでなければPromiseをクリア
					if (!state._isDestroyed) {
						state.loadingPromise = undefined;
					}
				})
				.catch((error) => {
					// エラー時も破棄済みでなければPromiseをクリア
					if (!state._isDestroyed) {
						state.loadingPromise = undefined;
					}
					throw error;
				});

			return state.loadingPromise;
		},

		_load: async (abortSignal: AbortSignal): Promise<void> => {
			try {
				// 破棄済みまたは中断チェック
				if (state._isDestroyed || abortSignal.aborted) {
					throw new Error('Aborted');
				}

				// ロード開始時に状態を'loading'に変更
				state.loadingStatus = 'loading';
				console.log('🔄 Loading thumbnail: ' + imagePath.split('/').pop());

				const channel = new Channel<Uint8Array>();

				// onmessageをPromise化
				const thumbnailPromise = new Promise<void>((resolve, reject) => {
					// 中断チェック用のハンドラー
					const abortHandler = () => {
						reject(new Error('Thumbnail generation aborted'));
					};
					abortSignal.addEventListener('abort', abortHandler);

					channel.onmessage = (data) => {
						// 破棄済みまたは中断チェック
						if (state._isDestroyed || abortSignal.aborted) {
							abortSignal.removeEventListener('abort', abortHandler);
							reject(new Error('Thumbnail generation aborted'));
							return;
						}

						console.log(
							'Thumbnail data received: ' +
								imagePath +
								' data size: ' +
								(data?.length || 'undefined')
						);
						try {
							const blob = new Blob([new Uint8Array(data)], { type: 'image/webp' });
							const thumbnailUrl = URL.createObjectURL(blob);

							console.log(
								'Thumbnail generated successfully: ' + imagePath + ' URL: ' + thumbnailUrl
							);

							// リアクティブ状態を更新
							state.thumbnailUrl = thumbnailUrl;
							state.loadError = undefined;
							state.loadingStatus = 'loaded';
							abortSignal.removeEventListener('abort', abortHandler);
							resolve(); // データ受信完了時にPromise解決
						} catch (error) {
							console.error('Thumbnail data processing failed: ' + imagePath + ' ' + error);
							if (!state._isDestroyed) {
								state.loadError = 'Failed to process thumbnail data';
								state.loadingStatus = 'error';
							}
							abortSignal.removeEventListener('abort', abortHandler);
							reject(error);
						}
					};
				});

				// 中断チェック
				if (state._isDestroyed || abortSignal.aborted) {
					throw new Error('Aborted');
				}

				// invokeは非同期で開始（awaitしない）
				invoke('generate_thumbnail_async', {
					imagePath: imagePath,
					config: null,
					channel
				}).catch((error) => {
					// invokeのエラーだけキャッチ
					if (!abortSignal.aborted && !state._isDestroyed) {
						state.loadingStatus = 'error';
						state.loadError = error instanceof Error ? error.message : String(error);
					}
				});

				// onmessageのPromiseだけをawait
				await thumbnailPromise;

				console.log('✅ Thumbnail loaded: ' + imagePath.split('/').pop());
			} catch (error) {
				// エラー時も破棄済みチェック
				if (state._isDestroyed) {
					return; // 破棄済みなら状態更新しない
				}

				// エラー時の状態変更
				state.loadingStatus = 'error';
				console.error('❌ Thumbnail load failed: ' + imagePath.split('/').pop() + ' ' + error);
				state.loadError = error instanceof Error ? error.message : String(error);
				throw error; // エラーを再スロー
			}
		},

		destroy: (): void => {
			// 破棄フラグを設定（以降の操作を無効化）
			state._isDestroyed = true;

			// BlobURLを解放
			if (state.thumbnailUrl) {
				try {
					URL.revokeObjectURL(state.thumbnailUrl);
				} catch (error) {
					console.warn('Failed to revoke thumbnail URL:', error);
				}
			}

			// 進行中のPromiseは継続するが、結果は無視される
			state.loadingPromise = undefined;

			// 状態をクリア
			state.thumbnailUrl = undefined;
			state.loadingStatus = 'unloaded';
			state.loadError = undefined;
		}
	};

	return { state: state as ThumbnailState, actions };
};
