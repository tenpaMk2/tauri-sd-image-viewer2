import type { TagAggregationResult } from '$lib/services/tag-aggregation';
import { TagAggregationService } from '$lib/services/tag-aggregation';

type MutableTagState = {
	tagData: TagAggregationResult | null;
	isLoading: boolean;
	error: string | null;
	tagAggregationService: TagAggregationService;
	_lastImageFilesLength: number;
	_lastImageFilesHash: string;
};

export type TagState = Readonly<MutableTagState>;

// タグ集計サービスのインスタンス
const tagAggregationService = new TagAggregationService();

// 関連する状態をオブジェクトにまとめて管理（Svelte 5推奨パターン）
let state = $state<MutableTagState>({
	// パブリック状態
	isLoading: false,
	error: null as string | null,
	tagData: null as TagAggregationResult | null,
	tagAggregationService: tagAggregationService,

	// プライベート状態（内部実装用、アンダースコア接頭辞）
	_lastImageFilesLength: 0,
	_lastImageFilesHash: '',
});

// 画像ファイルリストのハッシュを計算する簡単な関数
const calculateHash = (files: string[]): string => {
	return files.join('|');
};

// 現在の非同期処理をキャンセルするためのコントローラー
let currentAbortController: AbortController | null = null;

const loadTags = async (imageFiles: string[]): Promise<void> => {
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
};

const clear = (): void => {
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
};

const reset = (): void => {
	// clearと同じ処理だが、統一性のためにreset()を追加
	clear();
};

// 画像ファイルが変更されたときの自動処理
const handleImageFilesChange = (imageFiles: string[]): void => {
	if (0 < imageFiles.length) {
		loadTags(imageFiles);
	} else {
		clear();
	}
};

export const sdTagsAggregationStore = {
	state: state as TagState,
	actions: {
		loadTags,
		clear,
		reset,
		handleImageFilesChange,
	},
};
