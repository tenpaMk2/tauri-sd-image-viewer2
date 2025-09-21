<script lang="ts">
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import {
		navigateToGrid,
		navigateToViewer,
		navigateToWelcome,
	} from '$lib/services/app-navigation';
	import { dialogService } from '$lib/services/dialog';
	import { getContext } from 'svelte';
	import {
		DIRECTORY_IMAGE_PATHS_CONTEXT,
		type DirectoryImagePathsContext,
	} from './directory-image-paths';
	import { FILTER_CONTEXT, type FilterContext } from './filter';
	import { SELECTION_CONTEXT, type SelectionContext } from './selection';

	type Props = {
		title: string;
		imageCount: number;
	};

	const { title, imageCount }: Props = $props();

	const selectionContext = $derived(getContext<() => SelectionContext>(SELECTION_CONTEXT)());
	const directoryImagePathsContext = $derived(
		getContext<() => DirectoryImagePathsContext>(DIRECTORY_IMAGE_PATHS_CONTEXT)(),
	);
	const filterContext = $derived(getContext<() => FilterContext>(FILTER_CONTEXT)());
	const imagePaths = $derived(directoryImagePathsContext.state.imagePaths);

	const isAllSelected = $derived(
		0 < imagePaths.length && selectionContext.state.selectedImagePaths.size === imagePaths.length,
	);

	const openDirectoryDialog = async () => {
		const result = await dialogService.openDirectoryDialog();

		if (!result) return;

		navigateToGrid(result);
	};

	const openFileDialog = async () => {
		const result = await dialogService.openFileDialog();
		if (!result) return;

		navigateToViewer(result);
	};

	const handleReload = () => {
		window.location.reload();
	};

	const handleSelectAll = () => {
		if (isAllSelected) {
			// 全解除
			selectionContext.actions.clear();
		} else {
			// 全選択
			selectionContext.actions.selectAll(imagePaths);
		}
	};
</script>

<header class="flex items-center gap-4 bg-base-200 p-4">
	<IconButton icon="home" title="Back to Welcome" onClick={navigateToWelcome} />
	<div class="flex flex-1 items-center gap-2">
		<h1 class="truncate text-lg font-semibold text-base-content">
			{title}
		</h1>
		<div class="text-sm text-base-content/70">
			{imageCount} images
		</div>
	</div>
	<div class="flex gap-2">
		{#if imageCount > 0}
			<IconButton
				icon="filter"
				title={filterContext.state.isFilterPanelVisible ? 'Hide Filters' : 'Show Filters'}
				onClick={filterContext.actions.toggleFilterPanel}
				extraClass={filterContext.state.isActive || filterContext.state.isFilterPanelVisible
					? 'btn-active btn-primary'
					: ''}
			/>
			<IconButton
				icon={isAllSelected ? 'square-dashed' : 'square-check-big'}
				title={isAllSelected ? 'Deselect All' : 'Select All'}
				onClick={handleSelectAll}
			/>
		{/if}
		<IconButton icon="refresh-cw" title="Reload" onClick={handleReload} />
		<IconButton icon="file-image" title="Open File" onClick={openFileDialog} />
		<IconButton icon="folder-open" title="Open Another Folder" onClick={openDirectoryDialog} />
	</div>
</header>
