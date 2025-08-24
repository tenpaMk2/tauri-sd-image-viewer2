<script lang="ts">
	import { dialogService } from '$lib/services/dialog';
	import { appStore } from '$lib/stores/app-store.svelte';
	import { filteredImagesStore } from '$lib/stores/filtered-images-store.svelte';
	import { gridStore } from '$lib/stores/grid-store.svelte';
	import Icon from '@iconify/svelte';
	const selectedImages = gridStore.state.selectedImages;
	const showFilterPanel = gridStore.state.showFilterPanel;
	const filteredImageCount = filteredImagesStore.getters.filteredImageCount;

	const openDirectoryDialog = async () => {
		const result = await dialogService.openDirectoryDialog();
		if (result) {
			await appStore.actions.transitionToGrid(result);
		}
	};
</script>

<div class="flex items-center gap-2">
	<!-- Options Button -->
	<button
		class="btn btn-ghost btn-sm"
		onclick={() => gridStore.actions.toggleOptionsModal()}
		title="Options"
	>
		<Icon icon="lucide:settings" class="h-4 w-4" />
	</button>

	<!-- Filter Button -->
	<button
		class="btn btn-ghost btn-sm {showFilterPanel ? 'btn-active btn-primary' : ''}"
		onclick={() => gridStore.actions.toggleFilterPanel()}
		title="Toggle Filters"
	>
		<Icon icon="lucide:filter" class="h-4 w-4" />
	</button>

	<!-- Select All Button -->
	{#if 0 < filteredImageCount}
		<button
			class="btn btn-ghost btn-sm"
			onclick={() => gridStore.actions.toggleSelectAll()}
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
