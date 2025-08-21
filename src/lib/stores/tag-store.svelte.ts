import type { TagAggregationResult } from '../services/tag-aggregation-service';
import { TagAggregationService } from '../services/tag-aggregation-service';

export type TagState = {
	tagData: TagAggregationResult | null;
	isLoading: boolean;
	error: string | null;
	tagAggregationService: TagAggregationService;
	_lastImageFilesLength: number;
	_lastImageFilesHash: string;
};

// タグ集計サービスのインスタンス
const tagAggregationService = new TagAggregationService();

// タグストアの型定義を明確化
export type TagStore = {
	readonly state: TagState;
	readonly actions: {
		loadTags: (imageFiles: string[]) => Promise<void>;
		clear: () => void;
	};
};

// 画像ファイルパスのリストを受け取ってタグストアを作成する関数
export const createTagStore = (): TagStore => {
	// 関連する状態をオブジェクトにまとめて管理（Svelte 5推奨パターン）
	let state = $state<TagState>({
		// パブリック状態
		isLoading: false,
		error: null as string | null,
		tagData: null as TagAggregationResult | null,
		tagAggregationService: tagAggregationService,

		// プライベート状態（内部実装用、アンダースコア接頭辞）
		_lastImageFilesLength: 0,
		_lastImageFilesHash: ''
	});

	// 画像ファイルリストのハッシュを計算する簡単な関数
	const calculateHash = (files: string[]): string => {
		return files.join('|');
	};

	// 現在の非同期処理をキャンセルするためのコントローラー
	let currentAbortController: AbortController | null = null;

	const actions = {
		/**
		 * タグデータを明示的にロード
		 */
		async loadTags(imageFiles: string[]): Promise<void> {
			const currentHash = calculateHash(imageFiles);

			// 変更がない場合は何もしない
			if (currentHash === state._lastImageFilesHash) {
				return;
			}

			// 前の処理をキャンセル
			if (currentAbortController) {
				currentAbortController.abort();
			}

			state._lastImageFilesHash = currentHash;
			state._lastImageFilesLength = imageFiles.length;

			// 空の場合はクリア
			if (imageFiles.length === 0) {
				state.tagData = null;
				state.isLoading = false;
				state.error = null;
				return;
			}

			// 新しいAbortControllerを作成
			currentAbortController = new AbortController();
			const abortController = currentAbortController;

			// タグ集計を実行
			console.log('Tag aggregation started for ' + imageFiles.length + ' images');
			state.isLoading = true;
			state.error = null;

			try {
				const result = await tagAggregationService.aggregateTagsFromFiles(imageFiles);

				// Abortされていないかチェック
				if (abortController.signal.aborted) {
					return;
				}

				console.log('Tag aggregation completed: ' + result.uniqueTagNames.length + ' unique tags');
				state.tagData = result;
			} catch (err) {
				// Abortされていないかチェック
				if (abortController.signal.aborted) {
					return;
				}

				console.error('Tag aggregation error: ' + err);
				state.error = err instanceof Error ? err.message : String(err);
				state.tagData = null;
			} finally {
				// Abortされていないかチェック
				if (!abortController.signal.aborted) {
					state.isLoading = false;
				}
			}
		},

		/**
		 * タグデータをクリア
		 */
		clear(): void {
			// 進行中の処理をキャンセル
			if (currentAbortController) {
				currentAbortController.abort();
				currentAbortController = null;
			}

			state.tagData = null;
			state.isLoading = false;
			state.error = null;
			state._lastImageFilesLength = 0;
			state._lastImageFilesHash = '';
		}
	};

	return {
		state,
		actions
	} as const;
};
