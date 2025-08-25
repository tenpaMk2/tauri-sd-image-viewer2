<script lang="ts">
	import BottomToolbar from './BottomToolbar.svelte';
	import HeaderBar from './HeaderBar.svelte';
	import OptionsModal from './OptionsModal.svelte';
	import { directoryImagePathsStore } from './stores/directory-image-paths-store.svelte';
	import ThumbnailGrid from './ThumbnailGrid.svelte';

	const { state: directoryImagePathsState } = directoryImagePathsStore;
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<HeaderBar />

	<div class="flex-1">
		{#if directoryImagePathsState.loadingStatus === 'unloaded'}
			<div class="flex h-96 items-center justify-center">
				<div class="flex items-center space-x-2">
					<span>Unloaded</span>
				</div>
			</div>
		{:else if directoryImagePathsState.loadingStatus === 'loading'}
			<div class="flex h-96 items-center justify-center">
				<div class="flex items-center space-x-2">
					<span class="loading loading-md loading-spinner"></span>
					<span>Loading image files...</span>
				</div>
			</div>
		{:else if directoryImagePathsState.loadingStatus === 'loaded'}
			{#if (directoryImagePathsState.imagePaths ?? []).length === 0}
				<div class="flex h-96 items-center justify-center">
					<div class="text-center">
						<p class="text-lg">No images found in directory</p>
					</div>
				</div>
			{:else}
				<ThumbnailGrid />
			{/if}
		{:else if directoryImagePathsState.loadingStatus === 'error'}
			<div class="flex h-96 items-center justify-center">
				<div class="alert max-w-md alert-error">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6 shrink-0 stroke-current"
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span>Error: {directoryImagePathsState.loadingError}</span>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Bottom Toolbar when Selected -->
<BottomToolbar />

<!-- Options Modal -->
<OptionsModal />
