<script lang="ts">
	import ImageThumbnail from '$lib/ImageThumbnail.svelte';
	import { filteredImagesStore } from '$lib/stores/filtered-images-paths-store.svelte';

	// フィルタリング済み画像リストをストアから直接取得
	const imageFiles = $derived(filteredImagesStore.deriveds.filteredImageFiles);
</script>

<!-- サムネイルグリッド -->
<div class="grid grid-cols-[repeat(auto-fill,minmax(min(theme(spacing.48),30vw),1fr))] gap-4">
	{#each imageFiles as imagePath (imagePath)}
		<ImageThumbnail {imagePath} />
	{/each}
</div>
