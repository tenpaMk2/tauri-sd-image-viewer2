import { invoke } from '@tauri-apps/api/core';
import type { ImageMetadataInfo, SdParameters } from '../types/shared-types';
import { metadataQueue } from './metadata-queue';

/**
 * メタデータロード状態
 */
type LoadingStatus = 'unloaded' | 'queued' | 'loading' | 'loaded' | 'error';

type MutableMetadataState = {
	// 基本情報（undefinedは未ロード状態）
	filename: string | undefined;
	width: number | undefined;
	height: number | undefined;
	fileSize: number | undefined;
	mimeType: string | undefined;
	// 評価・メタデータ（undefinedは未ロード状態）
	rating: number | undefined;
	sdParameters: SdParameters | undefined;
	// ロード状態管理
	loadingStatus: LoadingStatus;
	loadingError: string | undefined;
	loadingPromise: Promise<void> | undefined;
	// 内部管理用（外部からは触らない）
	_isDestroyed: boolean;
};

export type MetadataState = Readonly<MutableMetadataState>;

export type MetadataActions = {
	_load: (abortSignal: AbortSignal) => Promise<void>;
	ensureLoaded: () => Promise<void>;
	updateRating: (newRating: number) => Promise<boolean>;
	reload: () => Promise<void>;
	reset: () => void;
	destroy: () => void; // メモリリーク防止用
};

export type MetadataStore = {
	state: MetadataState;
	actions: MetadataActions;
};

/**
 * 個別画像のメタデータストアを作成
 */
export const createMetadataStore = (imagePath: string): MetadataStore => {
	const state = $state<MutableMetadataState>({
		filename: undefined,
		width: undefined,
		height: undefined,
		fileSize: undefined,
		mimeType: undefined,
		rating: undefined,
		sdParameters: undefined,
		loadingStatus: 'unloaded',
		loadingError: undefined,
		loadingPromise: undefined,
		_isDestroyed: false
	});

	const actions: MetadataActions = {
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
			state.loadingPromise = metadataQueue
				.enqueue(imagePath, (abortSignal) => actions._load(abortSignal), 'metadata')
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
						state.loadingStatus = 'error'; // エラー状態に更新
						state.loadingError = error instanceof Error ? error.message : String(error);
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

				// Rust側からメタデータを取得（停止不可能）
				const metadata = await invoke<ImageMetadataInfo>('read_image_metadata', {
					path: imagePath
				});

				// Rust完了後に破棄済みまたは中断チェック
				if (state._isDestroyed || abortSignal.aborted) {
					throw new Error('Aborted');
				}

				// すべての状態プロパティを一度に設定
				state.filename = imagePath.split('/').pop() || 'Unknown';
				state.width = metadata.width;
				state.height = metadata.height;
				state.fileSize = metadata.file_size;
				state.mimeType = metadata.mime_type;
				state.rating = metadata.rating ?? undefined;
				state.sdParameters = metadata.sd_parameters ?? undefined;

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

		updateRating: async (newRating: number): Promise<boolean> => {
			try {
				// Rust側でRating更新
				await invoke('write_xmp_image_rating', {
					srcPath: imagePath,
					rating: newRating
				});

				// リアクティブ状態を即座に更新
				state.rating = newRating;

				return true;
			} catch (error) {
				return false;
			}
		},

		reload: async (): Promise<void> => {
			// すべての状態をundefinedにしてリセット
			state.filename = undefined;
			state.width = undefined;
			state.height = undefined;
			state.fileSize = undefined;
			state.mimeType = undefined;
			state.rating = undefined;
			state.sdParameters = undefined;
			state.loadingError = undefined;
			state.loadingPromise = undefined;
			state.loadingStatus = 'unloaded';

			// ensureLoadedで再ロード
			await actions.ensureLoaded();
		},

		reset: (): void => {
			state.filename = undefined;
			state.width = undefined;
			state.height = undefined;
			state.fileSize = undefined;
			state.mimeType = undefined;
			state.rating = undefined;
			state.sdParameters = undefined;
			state.loadingError = undefined;
			state.loadingPromise = undefined;
			state.loadingStatus = 'unloaded';
		},

		destroy: (): void => {
			// 破棄フラグを設定（以降の操作を無効化）
			state._isDestroyed = true;

			// 進行中のPromiseは継続するが、結果は無視される
			state.loadingPromise = undefined;

			// 状態をクリア
			actions.reset();
		}
	};

	return { state: state as MetadataState, actions };
};
