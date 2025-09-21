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
		DIRECTORY_IMAGE_PATHS_STATE,
		type DirectoryImagePathsState,
	} from './directory-image-paths';
	import { SELECTION_STATE, type SelectionState } from './selection';

	type Props = {
		title: string;
		imageCount: number;
	};

	const { title, imageCount }: Props = $props();

	const selectionState = $derived(getContext<() => SelectionState>(SELECTION_STATE)());
	const directoryImagePathsState = $derived(
		getContext<() => DirectoryImagePathsState>(DIRECTORY_IMAGE_PATHS_STATE)(),
	);
	const imagePaths = $derived(directoryImagePathsState.imagePaths);

	const isAllSelected = $derived(
		imagePaths.length > 0 && selectionState.selectedImagePaths.size === imagePaths.length,
	);
	const hasSelection = $derived(selectionState.selectedImagePaths.size > 0);

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
			selectionState.selectedImagePaths.clear();
			selectionState.lastSelectedIndex = null;
		} else {
			// 全選択
			selectionState.selectedImagePaths.clear();
			imagePaths.forEach((path) => selectionState.selectedImagePaths.add(path));
			selectionState.lastSelectedIndex = imagePaths.length - 1;
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
