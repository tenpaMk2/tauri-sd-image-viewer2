<script lang="ts">
	import { page } from '$app/state';
	import Toolbar from '$lib/components/grid/Toolbar.svelte';
	import { setContext } from 'svelte';
	import type { LayoutProps } from './$types';
	import type { GridPageData } from './+page';

	const { children }: LayoutProps = $props();

	const { title, dirPath, imagePaths, thumbnailStores, thumbnailQueue } = $derived(
		page.data as GridPageData,
	);

	// Context for child components
	setContext<() => string>('dirPath', () => dirPath);
	setContext<() => string[]>('imagePaths', () => imagePaths);
	setContext<() => GridPageData['thumbnailStores']>('thumbnailStores', () => thumbnailStores);
	setContext<() => GridPageData['thumbnailQueue']>('thumbnailQueue', () => thumbnailQueue);
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<div class="flex h-full flex-col bg-base-100">
	<!-- Header -->
	<Toolbar {title} imageCount={imagePaths.length} />

	<!-- Main Content -->
	<main class="flex-1 overflow-auto">
		{@render children()}
	</main>
</div>
