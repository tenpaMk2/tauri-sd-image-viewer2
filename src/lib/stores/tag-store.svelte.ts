import type { TagAggregationResult } from '../services/tag-aggregation-service';
import { TagAggregationService } from '../services/tag-aggregation-service';

export type TagState = {
	tagData: TagAggregationResult | null;
	isLoading: boolean;
	error: string | null;
};

let tagState: TagState = $state({
	tagData: null,
	isLoading: false,
	error: null
});

const tagAggregationService = new TagAggregationService();

// タグデータの集計処理
const loadTagData = async (imageFiles: string[]): Promise<void> => {
	if (imageFiles.length === 0) {
		tagState.tagData = null;
		return;
	}

	console.log('=== SDタグ集計開始 ===');
	tagState.isLoading = true;
	tagState.error = null;

	try {
		const tagData = await tagAggregationService.aggregateTagsFromFiles(imageFiles);
		console.log('SDタグ集計完了: ' + tagData.allTags.length + '個のタグ');

		tagState.tagData = tagData;
	} catch (err) {
		console.error('SDタグ集計エラー: ' + err);
		tagState.error = err instanceof Error ? err.message : String(err);
		tagState.tagData = null;
	} finally {
		tagState.isLoading = false;
	}
};

const clearTagData = (): void => {
	tagState.tagData = null;
	tagState.isLoading = false;
	tagState.error = null;
};

export const tagStore = {
	state: tagState,
	actions: {
		loadTagData,
		clearTagData
	}
};
