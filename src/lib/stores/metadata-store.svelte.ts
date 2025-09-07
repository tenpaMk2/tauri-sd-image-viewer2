import { metadataQueue } from '$lib/services/metadata-queue';
import type { ImageMetadataInfo, SdParameters } from '$lib/types/shared-types';
import { invoke } from '@tauri-apps/api/core';

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
	createdTime: number | undefined;
	modifiedTime: number | undefined;
	// 評価・メタデータ（undefinedは未ロード状態）
	rating: number | undefined;
	sdParameters: SdParameters | undefined;
	// ロード状態管理
	loadingStatus: LoadingStatus;
	loadingError: string | undefined;
	// 内部管理用（外部からは触らない）
	_isDestroyed: boolean;
};

export type MetadataState = Readonly<MutableMetadataState>;

export type MetadataActions = {
	_load: () => Promise<void>;
	ensureLoaded: () => Promise<void>;
	updateRating: (newRating: number) => Promise<boolean>;
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
		createdTime: undefined,
		modifiedTime: undefined,
		rating: undefined,
		sdParameters: undefined,
		loadingStatus: 'unloaded',
		loadingError: undefined,
		_isDestroyed: false,
	});

	const actions: MetadataActions = {
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
				await metadataQueue.enqueue(imagePath, () => actions._load(), { debugLabel: 'metadata' });
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

				// Rust側からメタデータを取得（停止不可能）
				const metadata = await invoke<ImageMetadataInfo>('read_image_metadata', {
					path: imagePath,
				});

				// Rust完了後に破棄済みチェック
				if (state._isDestroyed) {
					throw new Error('Aborted');
				}

				// すべての状態プロパティを一度に設定
				state.filename = imagePath.split('/').pop() || 'Unknown';
				state.width = metadata.width;
				state.height = metadata.height;
				state.fileSize = metadata.file_size;
				state.mimeType = metadata.mime_type;
				state.createdTime = metadata.created_time ?? undefined;
				state.modifiedTime = metadata.modified_time;
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
					rating: newRating,
				});

				// リアクティブ状態を即座に更新
				state.rating = newRating;

				return true;
			} catch (error) {
				return false;
			}
		},

		destroy: (): void => {
			// 破棄フラグを設定（以降の操作を無効化）
			state._isDestroyed = true;

			state.filename = undefined;
			state.width = undefined;
			state.height = undefined;
			state.fileSize = undefined;
			state.mimeType = undefined;
			state.createdTime = undefined;
			state.modifiedTime = undefined;
			state.rating = undefined;
			state.sdParameters = undefined;
			state.loadingError = undefined;
			state.loadingStatus = 'unloaded';
		},
	};

	return { state: state as MetadataState, actions };
};
