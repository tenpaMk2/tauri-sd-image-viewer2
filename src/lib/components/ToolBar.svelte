<script lang="ts">
	import ToolbarButton from '$lib/components/ui/IconButton.svelte';
	import { transitionToGrid } from '$lib/services/app-transitions';
	import { dialogService } from '$lib/services/dialog';
	import { filteredImagesStore } from '$lib/stores/filtered-images-paths-store.svelte';
	import { gridUiStore } from '$lib/stores/grid-ui-store.svelte';
	import { imageSelectionStore } from '$lib/stores/image-selection-store.svelte';

	const { state: imageSelectionState, actions: imageSelectionActions } = imageSelectionStore;
	const { state: gridUiState, actions: gridUiActions } = gridUiStore;

	const selectedImages = $derived(imageSelectionState.selectedImages);
	const showFilterPanel = $derived(gridUiState.filterPanelVisible);
	const filteredImageCount = $derived(filteredImagesStore.deriveds.filteredImageCount);

	const openDirectoryDialog = async () => {
		const result = await dialogService.openDirectoryDialog();
		if (result) {
			transitionToGrid(result);
		}
	};
</script>

<div class="flex items-center gap-2">
	<!-- Options Button -->
	<ToolbarButton
		icon="settings"
		title="Options"
		onClick={() => gridUiActions.toggleOptionsModal()}
	/>

	<!-- Filter Button -->
	<ToolbarButton
		icon="filter"
		title="Toggle Filters"
		onClick={() => gridUiActions.toggleFilterPanel()}
		extraClass={showFilterPanel ? 'btn-active btn-primary' : ''}
	/>

	<!-- Select All Button -->
	{#if 0 < filteredImageCount}
		<ToolbarButton
			icon={selectedImages.size === filteredImageCount ? 'square-dashed' : 'square-check-big'}
			title={selectedImages.size === filteredImageCount ? 'Deselect All' : 'Select All'}
			onClick={() => imageSelectionActions.toggleSelectAll()}
		/>
	{/if}

	<ToolbarButton icon="folder-open" title="Open Another Folder" onClick={openDirectoryDialog} />
</div>
