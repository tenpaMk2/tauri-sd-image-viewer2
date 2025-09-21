<script lang="ts">
	import { lastViewedImageStore } from '$lib/components/app/last-viewed-image-store.svelte';
	import { getContext, setContext } from 'svelte';
	import {
		DIRECTORY_IMAGE_PATHS_CONTEXT,
		type DirectoryImagePathsContext,
	} from './directory-image-paths';
	import { GRID_PAGE_DATA_CONTEXT, type GridPageDataContext } from './grid-page-data';
	import { SCROLL_TARGET_CONTEXT, type ScrollTargetContext } from './scroll-target';
	import ThumbnailCard from './ThumbnailCard.svelte';

	const directoryImagePathsContext = $derived(
		getContext<() => DirectoryImagePathsContext>(DIRECTORY_IMAGE_PATHS_CONTEXT)(),
	);
	const imagePaths = $derived(directoryImagePathsContext.state.imagePaths);

	const gridPageDataContext = $derived(
		getContext<() => GridPageDataContext>(GRID_PAGE_DATA_CONTEXT)(),
	);
	const thumbnailStores = $derived(gridPageDataContext.state.thumbnailStores);

	let scrollTargetState = $state<ScrollTargetContext['state']>({
		targetElement: null,
	});

	const scrollTargetActions = {
		setTargetElement: (element: HTMLElement) => {
			scrollTargetState.targetElement = element;
		},
	};

	setContext<() => ScrollTargetContext>(SCROLL_TARGET_CONTEXT, () => ({
		state: scrollTargetState,
		actions: scrollTargetActions,
	}));

	$effect(() => {
		// Always clear the state when imagePaths changes
		lastViewedImageStore.actions.clear();
	});

	$effect(() => {
		if (!scrollTargetState.targetElement) return;

		scrollTargetState.targetElement.scrollIntoView({
			behavior: 'smooth',
			block: 'center',
		});
		console.log('Scrolled to last viewed image');
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
	<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
		{#each imagePaths as imagePath (imagePath)}
			{@const thumbnailStore = thumbnailStores.get(imagePath)!}
			<ThumbnailCard {imagePath} {thumbnailStore} />
		{/each}
	</div>
{/if}
