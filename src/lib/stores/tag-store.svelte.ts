import type { TagAggregationResult } from '../services/tag-aggregation-service';
import { TagAggregationService } from '../services/tag-aggregation-service';

export type TagState = {
	tagData: TagAggregationResult | null;
	isLoading: boolean;
	error: string | null;
};

// タグ集計サービスのインスタンス
const tagAggregationService = new TagAggregationService();

// タグストアの型定義を明確化
export type TagStore = {
	readonly state: TagState;
	readonly actions: {
		// 将来的に追加される可能性のあるアクション
		refresh?: () => Promise<void>;
		clear?: () => void;
	};
};

// 画像ファイルパスのリストを受け取ってタグストアを作成する関数
export const createTagStore = (getImageFiles: () => string[]): TagStore => {
	// 関連する状態をオブジェクトにまとめて管理（Svelte 5推奨パターン）
	let state = $state({
		// パブリック状態
		isLoading: false,
		error: null as string | null,
		tagData: null as TagAggregationResult | null,

		// プライベート状態（内部実装用、アンダースコア接頭辞）
		_lastImageFilesLength: 0,
		_lastImageFilesHash: ''
	});

	// 画像ファイルリストのハッシュを計算する簡単な関数
	const calculateHash = (files: string[]): string => {
		return files.join('|');
	};

	// 画像ファイルの変更を監視してタグデータを更新
	$effect(() => {
		const imageFiles = getImageFiles();
		const currentHash = calculateHash(imageFiles);

		// 変更がない場合は何もしない
		if (currentHash === state._lastImageFilesHash) {
			return;
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

		// AbortControllerで非同期処理をキャンセル可能にする
		const abortController = new AbortController();

		// タグ集計を実行
		console.log('タグ集計開始: ' + imageFiles.length + '個の画像');
		state.isLoading = true;
		state.error = null;

		// 非同期処理を実行（競合状態を避けるため）
		(async () => {
			try {
				const result = await tagAggregationService.aggregateTagsFromFiles(imageFiles);

				// Abortされていないかチェック
				if (abortController.signal.aborted) {
					return;
				}

				console.log('タグ集計完了: ' + result.allTags.length + '個のタグ');
				state.tagData = result;
			} catch (err) {
				// Abortされていないかチェック
				if (abortController.signal.aborted) {
					return;
				}

				console.error('タグ集計エラー: ' + err);
				state.error = err instanceof Error ? err.message : String(err);
				state.tagData = null;
			} finally {
				// Abortされていないかチェック
				if (!abortController.signal.aborted) {
					state.isLoading = false;
				}
			}
		})();

		// クリーンアップ関数を返す（$effectの公式推奨パターン）
		return () => {
			abortController.abort();
		};
	});

	return {
		state: state as TagState, // 型アサーションで内部プロパティを隠蔽
		actions: {
			// 将来的にアクションを追加する場合はここに
		}
	} as const;
};
