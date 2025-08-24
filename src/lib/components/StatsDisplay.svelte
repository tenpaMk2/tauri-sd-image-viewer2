<script lang="ts">
	import { appStore } from '$lib/stores/app-store.svelte';
	import { tagStore } from '$lib/stores/tag-store.svelte';
	import { filteredImagesStore } from '$lib/stores/filtered-images-store.svelte';
	import { path } from '@tauri-apps/api';

	const directory = appStore.state.directory!;
	const tagData = tagStore.state.tagData;
	const totalImageCount = filteredImagesStore.getters.totalImageCount;
	const filteredImageCount = filteredImagesStore.getters.filteredImageCount;
</script>

<div class="flex items-center gap-4">
	{#await path.basename(directory) then folderName}
		<h1 class="truncate text-lg font-semibold">
			{folderName || 'Folder'}
		</h1>
	{/await}
	{#if 0 < totalImageCount}
		<div class="text-sm opacity-80">
			{#if filteredImageCount < totalImageCount}
				{filteredImageCount} of {totalImageCount} images
			{:else}
				{totalImageCount} images
			{/if}
			{#if tagData && tagData.allTags.length > 0}
				• {tagData.allTags.length} SD tags
			{/if}
		</div>
	{/if}
</div>
