<script module lang="ts">
	export const SELECTION_STATE = Symbol('selectionState');
	export type SelectionState = {
		selectedImagePaths: SvelteSet<string>;
		lastSelectedIndex: number | null;
	};
</script>

<script lang="ts">
	import type { GridPageData } from '$lib/../routes/grid/[dir_path]/+page';
	import { getContext, setContext } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import ThumbnailCard from './ThumbnailCard.svelte';

	const imagePaths = $derived(getContext<() => string[]>('imagePaths')());
	const thumbnailStores = $derived(
		getContext<() => GridPageData['thumbnailStores']>('thumbnailStores')(),
	);

	let selectionState: SelectionState = $state({
		selectedImagePaths: new SvelteSet<string>(),
		lastSelectedIndex: null as number | null,
	});

	// Context for child components - 選択状態を提供
	setContext<() => typeof selectionState>(SELECTION_STATE, () => selectionState);
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
