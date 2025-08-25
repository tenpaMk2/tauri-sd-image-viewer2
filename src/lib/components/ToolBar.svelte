<script lang="ts">
	import { dialogService } from '$lib/services/dialog';
	import { transitionToGrid } from '$lib/services/app-transitions';
	import { filteredImagesStore } from '$lib/stores/filtered-images-paths-store.svelte';
	import { gridUiStore } from '$lib/stores/grid-ui-store.svelte';
	import { imageSelectionStore } from '$lib/stores/image-selection-store.svelte';
	import Icon from '@iconify/svelte';

	const { state: imageSelectionState, actions: imageSelectionActions } = imageSelectionStore;
	const { deriveds: filteredImagesDeriveds } = filteredImagesStore;
	const { state: gridUiState, actions: gridUiActions } = gridUiStore;

	const selectedImages = $derived(imageSelectionState.selectedImages);
	const showFilterPanel = $derived(gridUiState.filterPanelVisible);
	const filteredImageCount = filteredImagesDeriveds.filteredImageCount;

	const openDirectoryDialog = async () => {
		const result = await dialogService.openDirectoryDialog();
		if (result) {
			transitionToGrid(result);
		}
	};
</script>

<div class="flex items-center gap-2">
	<!-- Options Button -->
	<button
		class="btn btn-ghost btn-sm"
		onclick={() => gridUiActions.toggleOptionsModal()}
		title="Options"
	>
		<Icon icon="lucide:settings" class="h-4 w-4" />
	</button>

	<!-- Filter Button -->
	<button
		class="btn btn-ghost btn-sm {showFilterPanel ? 'btn-active btn-primary' : ''}"
		onclick={() => gridUiActions.toggleFilterPanel()}
		title="Toggle Filters"
	>
		<Icon icon="lucide:filter" class="h-4 w-4" />
	</button>

	<!-- Select All Button -->
	{#if 0 < filteredImageCount}
		<button
			class="btn btn-ghost btn-sm"
			onclick={() => imageSelectionActions.toggleSelectAll()}
			title={selectedImages.size === filteredImageCount ? 'Deselect All' : 'Select All'}
		>
			<Icon
				icon={selectedImages.size === filteredImageCount
					? 'lucide:square-dashed'
					: 'lucide:square-check-big'}
				class="h-4 w-4"
			/>
		</button>
	{/if}

	<button class="btn btn-ghost btn-sm" onclick={openDirectoryDialog} title="Open Another Folder">
		<Icon icon="lucide:folder-open" class="h-4 w-4" />
	</button>
</div>
