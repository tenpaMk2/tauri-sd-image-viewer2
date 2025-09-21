import type { ImageMetadataInfo } from '$lib/types/shared-types';
import { invoke } from '@tauri-apps/api/core';
import PQueue from 'p-queue';

/**
 * メタデータ専用キューインスタンスを作成（同時実行数3に制限）
 */
export const createMetadataQueue = (): PQueue => {
	return new PQueue({ concurrency: 3 });
};

/**
 * メタデータロード状態
 */
type LoadingStatus = 'queued' | 'loading' | 'loaded' | 'error';

type MutableMetadataState = {
	metadata: ImageMetadataInfo | undefined;
	loadingStatus: LoadingStatus;
	loadError: string | undefined;
};

export type MetadataState = Readonly<MutableMetadataState>;

export type MetadataActions = {
	load: (abortSignal?: AbortSignal) => Promise<void>;
	updateRating: (newRating: number) => Promise<boolean>;
	destroy: () => void;
};

export type MetadataStore = {
	state: MetadataState;
	actions: MetadataActions;
};

export const createMetadataStore = (imagePath: string): MetadataStore => {
	const state = $state<MutableMetadataState>({
		metadata: undefined,
		loadingStatus: 'queued',
		loadError: undefined,
	});

	const actions: MetadataActions = {
		load: async (abortSignal?: AbortSignal): Promise<void> => {
			if (abortSignal?.aborted) {
				throw new Error('Aborted');
			}

			try {
				state.loadingStatus = 'loading';
				console.log(`Loading metadata: ${imagePath}`);

				// AbortSignal監視
				if (abortSignal) {
					abortSignal.addEventListener('abort', () => {
						console.log('Metadata loading aborted: ' + imagePath.split('/').pop());
					});
				}

				const metadata = await invoke<ImageMetadataInfo>('read_image_metadata', {
					path: imagePath,
				});

				// AbortSignalチェック（結果設定前）
				if (abortSignal?.aborted) {
					console.log('Metadata loading aborted after completion: ' + imagePath);
					throw new Error('Aborted');
				}

				// リアクティブ状態を更新
				state.metadata = metadata;
				state.loadError = undefined;
				state.loadingStatus = 'loaded';

				console.log('Metadata loaded successfully: ' + imagePath.split('/').pop());
			} catch (error) {
				if (abortSignal?.aborted) {
					console.log('Metadata loading was aborted: ' + imagePath.split('/').pop());
					// Abort時は状態を更新しない
				} else {
					state.loadingStatus = 'error';
					console.error('Metadata load failed: ' + imagePath.split('/').pop() + ' ' + error);
					state.loadError = error instanceof Error ? error.message : String(error);
				}
				throw error;
			}
		},

		updateRating: async (newRating: number): Promise<boolean> => {
			if (!state.metadata) {
				return false;
			}

			try {
				// Rust側でRating更新
				await invoke('write_xmp_image_rating', {
					srcPath: imagePath,
					rating: newRating,
				});

				// ローカル状態も更新
				state.metadata = {
					...state.metadata,
					rating: newRating,
				};

				return true;
			} catch (error) {
				console.error('Failed to update rating: ', error);
				return false;
			}
		},

		destroy: (): void => {
			// 状態をクリア
			state.metadata = undefined;
			state.loadingStatus = 'queued';
			state.loadError = undefined;
		},
	};

	return { state: state as MetadataState, actions };
};
