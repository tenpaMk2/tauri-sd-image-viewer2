<script lang="ts">
	import { page } from '$app/state';
	import BottomBar from '$lib/components/grid/BottomBar.svelte';
	import { SELECTION_STATE, type SelectionState } from '$lib/components/grid/selection';
	import Toolbar from '$lib/components/grid/Toolbar.svelte';
	import { setContext } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { LayoutProps } from './$types';
	import type { GridPageData } from './+page';

	const { children }: LayoutProps = $props();

	const { title, dirPath, imagePaths, thumbnailStores, thumbnailQueue } = $derived(
		page.data as GridPageData,
	);

	// Selection state management
	let selectionState: SelectionState = $state({
		selectedImagePaths: new SvelteSet<string>(),
		lastSelectedIndex: null as number | null,
	});

	// Context for child components
	setContext<() => string>('dirPath', () => dirPath);
	setContext<() => string[]>('imagePaths', () => imagePaths);
	setContext<() => GridPageData['thumbnailStores']>('thumbnailStores', () => thumbnailStores);
	setContext<() => GridPageData['thumbnailQueue']>('thumbnailQueue', () => thumbnailQueue);
	setContext<() => SelectionState>(SELECTION_STATE, () => selectionState);
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<div class="flex h-full flex-col bg-base-100">
	<!-- Header -->
	<Toolbar {title} imageCount={imagePaths.length} />

	<!-- Main Content -->
	<main class="flex-1 overflow-auto pb-16">
		{@render children()}
	</main>

	<!-- Bottom Bar -->
	<BottomBar />
</div>
