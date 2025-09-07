import { metadataRegistry } from '$lib/services/metadata-registry';
import { directoryImagePathsStore } from '$lib/stores/directory-image-paths-store.svelte';
import { filterStore } from '$lib/stores/filter-store.svelte';
import { sdTagsAggregationStore } from '$lib/stores/sd-tags-aggregation-store.svelte';

// フィルタリングされた画像リスト
const filteredImageFiles = $derived.by(() => {
	const imagePaths = directoryImagePathsStore.state.imagePaths;
	if (!imagePaths || imagePaths.length === 0) return [];

	// 評価マップをリアクティブに計算
	const ratingsMap = new Map<string, number | undefined>();
	for (const imagePath of imagePaths) {
		const store = metadataRegistry.getOrCreateStore(imagePath);
		// メタデータが存在し、ロード済みの場合のみ評価を取得
		if (store && store.state.loadingStatus === 'loaded') {
			ratingsMap.set(imagePath, store.state.rating);
		} else {
			// 未ロードの場合は undefined（未評価）として扱う
			ratingsMap.set(imagePath, undefined);
		}
	}

	// フィルタを適用
	return filterStore.actions.filterImages(
		imagePaths,
		ratingsMap,
		sdTagsAggregationStore.state.tagAggregationService,
	);
}); // 画像数情報
const totalImageCount = $derived(directoryImagePathsStore.state.imagePaths?.length ?? 0);
const filteredImageCount = $derived(filteredImageFiles.length);

export const filteredImagesStore = {
	deriveds: {
		get filteredImageFiles() {
			return filteredImageFiles;
		},
		get totalImageCount() {
			return totalImageCount;
		},
		get filteredImageCount() {
			return filteredImageCount;
		},
	},
};
