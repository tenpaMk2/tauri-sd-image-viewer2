<script lang="ts">
	import { navigating, page } from '$app/state';
	import BottomBar from '$lib/components/grid/BottomBar.svelte';
	import {
		DIRECTORY_IMAGE_PATHS_CONTEXT,
		type DirectoryImagePathsContext,
	} from '$lib/components/grid/directory-image-paths';
	import { FILTER_CONTEXT, type FilterContext } from '$lib/components/grid/filter';
	import FilterPanel from '$lib/components/grid/FilterPanel.svelte';
	import {
		GRID_METADATA_CONTEXT,
		type GridMetadataContext,
	} from '$lib/components/grid/grid-metadata';
	import {
		GRID_PAGE_DATA_CONTEXT,
		type GridPageDataContext,
	} from '$lib/components/grid/grid-page-data';
	import { SELECTION_CONTEXT, type SelectionContext } from '$lib/components/grid/selection';
	import Toolbar from '$lib/components/grid/Toolbar.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import { getDirectoryImages } from '$lib/services/image-directory-service';
	import { filterFilesByGlob } from '$lib/utils/glob-utils';
	import { setContext } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { LayoutProps } from './$types';
	import type { GridPageData } from './+page';

	const { children }: LayoutProps = $props();

	const { dirPath, initialImagePaths } = $derived(page.data as GridPageData);

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

	// Metadata context management
	const metadataStores = $derived((page.data as GridPageData).metadataStores);

	const gridMetadataActions = {
		getMetadataStore: (imagePath: string) => {
			return metadataStores.get(imagePath);
		},
		cleanup: () => {
			// クリーンアップは+page.svelteで行うため、ここでは何もしない
		},
	};

	// Filter state management
	let filterState = $state<FilterContext['state']>({
		isFilterPanelVisible: false,
		ratingValue: 0,
		ratingOperator: '<=',
		filenamePattern: '',
		isActive: false,
	});

	const updateActiveState = () => {
		// フィルタは常に有効。星0≥は実質的な「全て表示」だが、フィルタとしては有効
		filterState.isActive = 0 <= filterState.ratingValue || filterState.filenamePattern !== '';
	};

	const filterActions: FilterContext['actions'] = {
		toggleFilterPanel: () => {
			filterState.isFilterPanelVisible = !filterState.isFilterPanelVisible;
		},
		setRatingValue: (rating: number) => {
			filterState.ratingValue = Math.max(0, Math.min(5, rating));
			updateActiveState();
		},
		setRatingOperator: (operator) => {
			filterState.ratingOperator = operator;
			updateActiveState();
		},
		setFilenamePattern: (pattern: string) => {
			filterState.filenamePattern = pattern.trim();
			updateActiveState();
		},
		clearFilters: () => {
			filterState.ratingValue = 0;
			filterState.ratingOperator = '>=';
			filterState.filenamePattern = '';
			filterState.isActive = false;
		},
		filterImages: (imagePaths: string[], metadataStores: Map<string, any>) => {
			let filtered = imagePaths;

			console.log('Filter Debug:', {
				totalImages: imagePaths.length,
				ratingValue: filterState.ratingValue,
				ratingOperator: filterState.ratingOperator,
				filenamePattern: filterState.filenamePattern,
				metadataStoresSize: metadataStores.size,
			});

			// Apply filename pattern filter
			if (filterState.filenamePattern) {
				filtered = filterFilesByGlob(filtered, filterState.filenamePattern);
				console.log('After filename filter:', filtered.length);
			}

			// Apply rating filter
			// フィルタは常に適用。星0≥は実質的に全て表示だが、フィルタとしては有効
			const ratingFiltered = filtered.filter((imagePath) => {
				const metadataStore = metadataStores.get(imagePath);

				// メタデータストアがない場合
				if (!metadataStore) {
					console.log('No metadata store for:', imagePath);
					// 未評価として扱う（rating=0）
					const rating = 0;
					return evaluateRatingCondition(
						rating,
						filterState.ratingValue,
						filterState.ratingOperator,
					);
				}

				// メタデータが未ロードまたはロード中の場合
				if (metadataStore.state.loadingStatus !== 'loaded') {
					console.log(
						'Metadata not loaded for:',
						imagePath,
						'status:',
						metadataStore.state.loadingStatus,
					);
					// 未評価として扱う（rating=0）
					const rating = 0;
					return evaluateRatingCondition(
						rating,
						filterState.ratingValue,
						filterState.ratingOperator,
					);
				}

				// メタデータがロード済みの場合
				const rating = metadataStore.state.metadata?.rating || 0;
				const passes = evaluateRatingCondition(
					rating,
					filterState.ratingValue,
					filterState.ratingOperator,
				);
				console.log(
					'Rating check:',
					imagePath,
					'rating:',
					rating,
					'operator:',
					filterState.ratingOperator,
					'targetRating:',
					filterState.ratingValue,
					'passes:',
					passes,
				);
				return passes;
			});
			filtered = ratingFiltered;
			console.log('After rating filter:', filtered.length);

			console.log('Final filtered count:', filtered.length);
			return filtered;
		},
	};

	// Helper function to evaluate rating conditions
	const evaluateRatingCondition = (
		rating: number,
		targetRating: number,
		operator: string,
	): boolean => {
		switch (operator) {
			case '<=':
				return targetRating <= rating;
			case '=':
				return targetRating === rating;
			case '>=':
				return rating <= targetRating;
			default:
				return false;
		}
	};

	// Context for child components
	setContext<() => GridPageDataContext>(GRID_PAGE_DATA_CONTEXT, () => ({
		state: page.data as GridPageData,
	}));
	setContext<() => SelectionContext>(SELECTION_CONTEXT, () => ({
		state: selectionState,
		actions: selectionActions,
	}));
	setContext<() => GridMetadataContext>(GRID_METADATA_CONTEXT, () => ({
		state: { metadataStores },
		actions: gridMetadataActions,
	}));
	setContext<() => FilterContext>(FILTER_CONTEXT, () => ({
		state: filterState,
		actions: filterActions,
	}));

	// Compute filtered images for display
	const filteredImagePaths = $derived(
		filterActions.filterImages(directoryImagePathsState.imagePaths, metadataStores),
	);
</script>

<svelte:head>
	<title>{(page.data as GridPageData).title}</title>
</svelte:head>

<div class="flex h-full flex-col bg-base-100">
	<!-- Header -->
	<Toolbar
		title={(page.data as GridPageData).title}
		imageCount={directoryImagePathsState.imagePaths.length}
	/>

	<!-- Filter Panel -->
	<FilterPanel />

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
