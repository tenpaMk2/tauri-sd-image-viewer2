import { filterStore } from '$lib/stores/filter-store.svelte';
import { navigationStore } from '$lib/stores/navigation-store.svelte';
import { tagStore } from '$lib/stores/tag-store.svelte';

// フィルタリングされた画像リスト
const filteredImageFiles = $derived.by(() => {
	const imageFiles = navigationStore.state.directoryImagePaths;
	if (imageFiles.length === 0) return [];

	// レーティングマップを同期的に取得
	const ratingsMap = tagStore.state.tagAggregationService?.getRatingsMapSync(imageFiles);
	if (!ratingsMap) return imageFiles;

	// フィルタを適用
	return filterStore.actions.filterImages(
		imageFiles,
		ratingsMap,
		tagStore.state.tagAggregationService,
	);
});

// 画像数情報
const totalImageCount = $derived(navigationStore.state.directoryImagePaths.length);
const filteredImageCount = $derived(filteredImageFiles.length);

export const filteredImagesStore = {
	getters: {
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
