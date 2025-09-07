<script lang="ts">
	import { directoryImagePathsStore } from '$lib/stores/directory-image-paths-store.svelte';
	import { filteredImagesStore } from '$lib/stores/filtered-images-paths-store.svelte';
	import { sdTagsAggregationStore } from '$lib/stores/sd-tags-aggregation-store.svelte';

	const { state: tagState } = sdTagsAggregationStore;

	const totalImageCount = $derived(filteredImagesStore.deriveds.totalImageCount);
	const filteredImageCount = $derived(filteredImagesStore.deriveds.filteredImageCount);
</script>

<div class="flex items-center gap-4">
	<h1 class="truncate text-lg font-semibold">
		{directoryImagePathsStore.state.currentDirectory || 'Folder'}
	</h1>
	{#if 0 < totalImageCount}
		<div class="text-sm opacity-80">
			{#if filteredImageCount < totalImageCount}
				{filteredImageCount} of {totalImageCount} images
			{:else}
				{totalImageCount} images
			{/if}
			{#if tagState.tagData && tagState.tagData.allTags.length > 0}
				• {tagState.tagData.allTags.length} SD tags
			{/if}
		</div>
	{/if}
</div>
