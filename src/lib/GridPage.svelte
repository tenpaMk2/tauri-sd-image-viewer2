<script lang="ts">
	import { LOADING_STATUS_CONFIG } from '$lib/ui/loading-status-config';
	import Icon from '@iconify/svelte';
	import BottomToolbar from './BottomToolbar.svelte';
	import HeaderBar from './HeaderBar.svelte';
	import OptionsModal from './OptionsModal.svelte';
	import { directoryImagePathsStore } from './stores/directory-image-paths-store.svelte';
	import ThumbnailGrid from './ThumbnailGrid.svelte';

	const { state: directoryImagePathsState } = directoryImagePathsStore;
</script>

{#snippet centerStatus(
	config: (typeof LOADING_STATUS_CONFIG)[keyof typeof LOADING_STATUS_CONFIG],
	isError = false,
	errorMessage?: string,
)}
	<div class="flex h-96 items-center justify-center">
		{#if isError}
			<div class="alert max-w-md alert-error">
				<Icon icon="lucide:{config.icon}" class="h-6 w-6 shrink-0" />
				<span>Error: {errorMessage}</span>
			</div>
		{:else}
			<div class="flex items-center space-x-2">
				{#if config.icon}
					<Icon icon="lucide:{config.icon}" class="h-5 w-5" />
				{:else if config.loadingIcon}
					<span class="loading loading-md {config.loadingIcon}"></span>
				{/if}
				<span>{config.text}</span>
			</div>
		{/if}
	</div>
{/snippet}

<div class="flex min-h-screen flex-col">
	<!-- Header -->
	<HeaderBar />

	<div class="flex-1">
		{#if directoryImagePathsState.loadingStatus === 'unloaded'}
			{@render centerStatus(LOADING_STATUS_CONFIG.unloaded)}
		{:else if directoryImagePathsState.loadingStatus === 'loading'}
			{@render centerStatus(LOADING_STATUS_CONFIG.loading)}
		{:else if directoryImagePathsState.loadingStatus === 'loaded'}
			{#if (directoryImagePathsState.imagePaths ?? []).length === 0}
				<div class="flex h-96 items-center justify-center">
					<div class="text-center">
						<p class="text-lg">No images found in directory</p>
					</div>
				</div>
			{:else}
				<div class="p-4">
					<ThumbnailGrid />
				</div>
			{/if}
		{:else if directoryImagePathsState.loadingStatus === 'error'}
			{@render centerStatus(
				LOADING_STATUS_CONFIG.error,
				true,
				directoryImagePathsState.loadingError ?? undefined,
			)}
		{/if}
	</div>
</div>

<!-- Bottom Toolbar when Selected -->
<BottomToolbar />

<!-- Options Modal -->
<OptionsModal />
