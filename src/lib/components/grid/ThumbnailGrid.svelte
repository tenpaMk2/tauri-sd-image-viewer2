<script lang="ts">
	import type { GridPageData } from '$lib/../routes/grid/[dir_path]/+page';
	import { lastViewedImageStore } from '$lib/components/app/last-viewed-image-store.svelte';
	import { getContext, onMount } from 'svelte';
	import ThumbnailCard from './ThumbnailCard.svelte';

	const imagePaths = $derived(getContext<() => string[]>('imagePaths')());
	const thumbnailStores = $derived(
		getContext<() => GridPageData['thumbnailStores']>('thumbnailStores')(),
	);
	const dirPath = $derived(getContext<() => string>('dirPath')());

	let gridContainer = $state<HTMLDivElement | null>(null);

	const scrollToImage = (imagePath: string) => {
		if (!gridContainer) return;

		const targetIndex = imagePaths.indexOf(imagePath);
		if (targetIndex === -1) return;

		const thumbnailCards = gridContainer.querySelectorAll('[data-image-path]');
		const targetCard = thumbnailCards[targetIndex] as HTMLElement;
		if (!targetCard) return;

		targetCard.scrollIntoView({
			behavior: 'smooth',
			block: 'center',
		});
		console.log('Scrolled to last viewed image:', imagePath);
	};

	onMount(() => {
		const lastViewedImagePath = lastViewedImageStore.actions.getLastViewedImageInDirectory(dirPath);

		// Always clear the state when grid is mounted
		lastViewedImageStore.actions.clear();

		if (!lastViewedImagePath) return;

		scrollToImage(lastViewedImagePath);
	});
</script>

{#if imagePaths.length === 0}
	<div class="flex h-full items-center justify-center">
		<div class="text-center">
			<div class="mb-4 text-6xl opacity-30">📁</div>
			<h2 class="mb-2 text-xl font-bold text-base-content">No Images Found</h2>
			<p class="text-base-content/70">This directory doesn't contain any supported image files.</p>
		</div>
	</div>
{:else}
	<div
		bind:this={gridContainer}
		class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8"
	>
		{#each imagePaths as imagePath (imagePath)}
			{@const thumbnailStore = thumbnailStores.get(imagePath)!}
			<ThumbnailCard {imagePath} {thumbnailStore} />
		{/each}
	</div>
{/if}
