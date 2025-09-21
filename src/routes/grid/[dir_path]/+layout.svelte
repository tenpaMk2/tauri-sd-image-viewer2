<script lang="ts">
	import { navigating, page } from '$app/state';
	import BottomBar from '$lib/components/grid/BottomBar.svelte';
	import {
		DIRECTORY_IMAGE_PATHS_CONTEXT,
		type DirectoryImagePathsContext,
	} from '$lib/components/grid/directory-image-paths';
	import { SELECTION_CONTEXT, type SelectionContext } from '$lib/components/grid/selection';
	import Toolbar from '$lib/components/grid/Toolbar.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import { getDirectoryImages } from '$lib/services/image-directory-service';
	import { setContext } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { LayoutProps } from './$types';
	import type { GridPageData } from './+page';

	const { children }: LayoutProps = $props();

	const { title, dirPath, initialImagePaths, thumbnailStores, thumbnailQueue } = $derived(
		page.data as GridPageData,
	);

	// Image paths state management
	let directoryImagePathsState = $state<DirectoryImagePathsContext['state']>({ imagePaths: [] });

	$effect(() => {
		directoryImagePathsState.imagePaths = initialImagePaths;
	});

	const directoryImagePathsActions = {
		refresh: async () => {
			try {
				const updatedPaths = await getDirectoryImages(dirPath);
				directoryImagePathsState.imagePaths = updatedPaths;
			} catch (error) {
				console.error('Failed to refresh image paths: ' + error);
			}
		},
	};

	setContext<() => DirectoryImagePathsContext>(DIRECTORY_IMAGE_PATHS_CONTEXT, () => ({
		state: directoryImagePathsState,
		actions: directoryImagePathsActions,
	}));

	// Selection state management
	let selectionState = $state<SelectionContext['state']>({
		selectedImagePaths: new SvelteSet<string>(),
		lastSelectedIndex: null as number | null,
	});

	const selectionActions = {
		clear: () => {
			selectionState.selectedImagePaths.clear();
			selectionState.lastSelectedIndex = null;
		},
		add: (imagePath: string, index: number) => {
			selectionState.selectedImagePaths.add(imagePath);
			selectionState.lastSelectedIndex = index;
		},
		delete: (imagePath: string) => {
			selectionState.selectedImagePaths.delete(imagePath);
		},
		toggle: (imagePath: string, index: number) => {
			if (selectionState.selectedImagePaths.has(imagePath)) {
				selectionState.selectedImagePaths.delete(imagePath);
			} else {
				selectionState.selectedImagePaths.add(imagePath);
			}
			selectionState.lastSelectedIndex = index;
		},
		selectRange: (startIndex: number, endIndex: number, imagePaths: string[]) => {
			for (let i = startIndex; i <= endIndex; i++) {
				selectionState.selectedImagePaths.add(imagePaths[i]);
			}
		},
		selectAll: (imagePaths: string[]) => {
			selectionState.selectedImagePaths.clear();
			imagePaths.forEach((path) => selectionState.selectedImagePaths.add(path));
			selectionState.lastSelectedIndex = imagePaths.length - 1;
		},
	};

	// Context for child components
	setContext<() => string>('dirPath', () => dirPath);
	setContext<() => GridPageData['thumbnailStores']>('thumbnailStores', () => thumbnailStores);
	setContext<() => GridPageData['thumbnailQueue']>('thumbnailQueue', () => thumbnailQueue);
	setContext<() => SelectionContext>(SELECTION_CONTEXT, () => ({
		state: selectionState,
		actions: selectionActions,
	}));
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<div class="flex h-full flex-col bg-base-100">
	<!-- Header -->
	<Toolbar {title} imageCount={directoryImagePathsState.imagePaths.length} />

	<!-- Main Content -->
	<main class="flex-1 overflow-auto pb-16">
		{@render children()}
	</main>

	<!-- Bottom Bar -->
	<BottomBar />
</div>

{#if navigating.complete}
	<div
		class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-base-100/60 px-8 py-4"
	>
		<LoadingState status="loading" variant="big" />
	</div>
{/if}
