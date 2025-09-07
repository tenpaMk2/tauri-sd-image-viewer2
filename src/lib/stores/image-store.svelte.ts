import { imageQueue } from '$lib/services/image-queue';
import { detectImageMimeType, type MimeType } from '$lib/services/mime-type';
import { readFile } from '@tauri-apps/plugin-fs';

export type ImageData = {
	data: Uint8Array;
	mimeType: MimeType;
	filePath: string;
};

/**
 * 画像ロード状態
 */
type LoadingStatus = 'unloaded' | 'queued' | 'loading' | 'loaded' | 'error';

type MutableImageState = {
	// 画像データ（undefinedは未ロード状態）
	imageData: ImageData | undefined;
	// BlobURL（undefinedは未作成状態）
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
	destroy: () => void; // メモリリーク防止用
};

export type ImageStore = {
	state: ImageState;
	actions: ImageActions;
};

// BlobURL作成のヘルパー関数
const createBlobUrl = (imageData: ImageData): string => {
	// Uint8ArrayからArrayBufferを取得してからBlobを作成
	const arrayBuffer = imageData.data.buffer.slice(
		imageData.data.byteOffset,
		imageData.data.byteOffset + imageData.data.byteLength,
	) as ArrayBuffer;
	const blob = new Blob([arrayBuffer], { type: imageData.mimeType });
	return URL.createObjectURL(blob);
};

/**
 * 画像ファイルを読み込み、バイナリデータを返す
 */
const loadImage = async (filePath: string): Promise<ImageData> => {
	try {
		const imageData = await readFile(filePath);
		const detectedMimeType = await detectImageMimeType(filePath);
		if (!detectedMimeType) {
			throw new Error(`Unsupported image format: ${filePath}`);
		}
		const mimeType: MimeType = detectedMimeType;

		return {
			data: new Uint8Array(imageData),
			mimeType,
			filePath,
		};
	} catch (error) {
		console.error('Failed to load image: ' + error);
		throw new Error(`Failed to load image: ${filePath}`);
	}
};

/**
 * 個別画像の画像データストアを作成
 */
export const createImageStore = (imagePath: string): ImageStore => {
	const state = $state<MutableImageState>({
		imageData: undefined,
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

			// 既にロード済みの場合は何もしない
			if (state.loadingStatus === 'loaded') {
				return;
			}

			// キュー済み、ロード中の場合は完了まで待機
			if (state.loadingStatus === 'queued' || state.loadingStatus === 'loading') {
				// ロード完了まで待機
				await new Promise<void>((resolve, reject) => {
					const checkStatus = () => {
						if (state._isDestroyed) {
							reject(new Error('Store is destroyed'));
							return;
						}
						if (state.loadingStatus === 'loaded') {
							resolve();
							return;
						}
						if (state.loadingStatus === 'error') {
							reject(new Error(state.loadingError || 'Loading failed'));
							return;
						}
						// まだロード中の場合は少し待ってから再チェック
						setTimeout(checkStatus, 10);
					};
					checkStatus();
				});
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

				// 画像を読み込み
				const imageData = await loadImage(imagePath);

				// ロード完了後に破棄済みチェック
				if (state._isDestroyed) {
					throw new Error('Aborted');
				}

				// 状態を更新
				state.imageData = imageData;
				// BlobURLを作成
				state.imageUrl = createBlobUrl(imageData);
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

		destroy: (): void => {
			// 破棄フラグを設定（以降の操作を無効化）
			state._isDestroyed = true;

			// BlobURLを解放
			if (state.imageUrl) {
				try {
					URL.revokeObjectURL(state.imageUrl);
				} catch (error) {
					console.warn('Failed to revoke image URL:', error);
				}
			}

			// 状態をクリア
			state.imageData = undefined;
			state.imageUrl = undefined;
			state.loadingError = undefined;
			state.loadingStatus = 'unloaded';
		},
	};

	return { state: state as ImageState, actions };
};
