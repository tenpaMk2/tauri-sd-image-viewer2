<script lang="ts">
	import { directoryImagePathsStore } from '$lib/stores/directory-image-paths-store.svelte';
	import { filteredImagesStore } from '$lib/stores/filtered-images-paths-store.svelte';
	import { tagStore } from '$lib/stores/tag-store.svelte';

	const { state: tagState } = tagStore;
	const { deriveds: filteredImagesDeriveds } = filteredImagesStore;
</script>

<div class="flex items-center gap-4">
	<h1 class="truncate text-lg font-semibold">
		{directoryImagePathsStore.state.currentDirectory || 'Folder'}
	</h1>
	{#if 0 < filteredImagesDeriveds.totalImageCount}
		<div class="text-sm opacity-80">
			{#if filteredImagesDeriveds.filteredImageCount < filteredImagesDeriveds.totalImageCount}
				{filteredImagesDeriveds.filteredImageCount} of {filteredImagesDeriveds.totalImageCount} images
			{:else}
				{filteredImagesDeriveds.totalImageCount} images
			{/if}
			{#if tagState.tagData && tagState.tagData.allTags.length > 0}
				• {tagState.tagData.allTags.length} SD tags
			{/if}
		</div>
	{/if}
</div>
