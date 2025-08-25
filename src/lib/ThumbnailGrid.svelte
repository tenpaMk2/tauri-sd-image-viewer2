<script lang="ts">
	import ImageThumbnail from '$lib/ImageThumbnail.svelte';
	import { filteredImagesStore } from '$lib/stores/filtered-images-paths-store.svelte';

	const { deriveds } = filteredImagesStore;

	// フィルタリング済み画像リストをストアから直接取得
	const imageFiles = deriveds.filteredImageFiles;
</script>

<!-- サムネイルグリッド -->
<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
	{#each imageFiles as imagePath (imagePath)}
		<ImageThumbnail {imagePath} />
	{/each}
</div>
