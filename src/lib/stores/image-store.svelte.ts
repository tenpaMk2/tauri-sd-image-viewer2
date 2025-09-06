import { loadImage } from '$lib/services/image-loader';
import { imageQueue } from '$lib/services/image-queue';

/**
 * 画像ロード状態
 */
type LoadingStatus = 'unloaded' | 'queued' | 'loading' | 'loaded' | 'error';

type MutableImageState = {
	// 画像データ（undefinedは未ロード状態）
	imageUrl: string | undefined;
	// ロード状態管理
	loadingStatus: LoadingStatus;
	loadingError: string | undefined;
	// 内部管理用（外部からは触らない）
	_isDestroyed: boolean;
};

export type ImageState = Readonly<MutableImageState>;

export type ImageActions = {
	_load: () => Promise<void>;
	ensureLoaded: () => Promise<void>;
	reload: () => Promise<void>;
	reset: () => void;
	destroy: () => void; // メモリリーク防止用
};

export type ImageStore = {
	state: ImageState;
	actions: ImageActions;
};

/**
 * 個別画像の画像データストアを作成
 */
export const createImageStore = (imagePath: string): ImageStore => {
	const state = $state<MutableImageState>({
		imageUrl: undefined,
		loadingStatus: 'unloaded',
		loadingError: undefined,
		_isDestroyed: false,
	});

	const actions: ImageActions = {
		ensureLoaded: async (): Promise<void> => {
			// 破棄済みチェック
			if (state._isDestroyed) {
				throw new Error('Store is destroyed');
			}

			// 既にロード済み、キュー済み、ロード中の場合は何もしない
			if (
				state.loadingStatus === 'loaded' ||
				state.loadingStatus === 'queued' ||
				state.loadingStatus === 'loading'
			) {
				return;
			}

			// 状態を'queued'に変更
			state.loadingStatus = 'queued';

			// キューサービス経由でロード処理を開始
			try {
				await imageQueue.enqueue(imagePath, () => actions._load(), {
					debugLabel: 'image',
					priority: 'high',
				});
			} catch (error) {
				// エラー時も破棄済みでなければ状態更新
				if (!state._isDestroyed) {
					state.loadingStatus = 'error';
					state.loadingError = error instanceof Error ? error.message : String(error);
				}
				throw error;
			}
		},

		_load: async (): Promise<void> => {
			try {
				// 破棄済みチェック
				if (state._isDestroyed) {
					throw new Error('Aborted');
				}

				// ロード開始時に状態を'loading'に変更
				state.loadingStatus = 'loading';

				// image-loader を使用して画像を読み込み
				const imageData = await loadImage(imagePath);

				// ロード完了後に破棄済みチェック
				if (state._isDestroyed) {
					throw new Error('Aborted');
				}

				// 状態を更新
				state.imageUrl = imageData.url;
				state.loadingError = undefined;

				// ロード状態を更新
				state.loadingStatus = 'loaded';
			} catch (error) {
				// エラー時も破棄済みチェック
				if (state._isDestroyed) {
					return; // 破棄済みなら状態更新しない
				}

				// エラー時の状態変更
				state.loadingStatus = 'error';
				state.loadingError = String(error);
				throw error; // エラーを再スロー
			}
		},

		reload: async (): Promise<void> => {
			// すべての状態をリセット
			state.imageUrl = undefined;
			state.loadingError = undefined;
			state.loadingStatus = 'unloaded';

			// ensureLoadedで再ロード
			await actions.ensureLoaded();
		},

		reset: (): void => {
			state.imageUrl = undefined;
			state.loadingError = undefined;
			state.loadingStatus = 'unloaded';
		},

		destroy: (): void => {
			// 破棄フラグを設定（以降の操作を無効化）
			state._isDestroyed = true;

			// 状態をクリア
			actions.reset();
		},
	};

	return { state: state as ImageState, actions };
};
