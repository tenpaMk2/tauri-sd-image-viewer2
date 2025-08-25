import { filterStore } from '$lib/stores/filter-store.svelte';
import { tagStore } from '$lib/stores/tag-store.svelte';
import { directoryImagePathsStore } from '$lib/stores/directory-image-paths-store.svelte';

// フィルタリングされた画像リスト
const filteredImageFiles = $derived.by(() => {
	const imagePaths = directoryImagePathsStore.state.imagePaths;
	if (!imagePaths || imagePaths.length === 0) return [];

	// レーティングマップを同期的に取得
	const ratingsMap =
		tagStore.state.tagAggregationService?.getRatingsMapSync(imagePaths) ?? new Map();

	// フィルタを適用
	return filterStore.actions.filterImages(
		imagePaths,
		ratingsMap,
		tagStore.state.tagAggregationService,
	);
});

// 画像数情報
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
