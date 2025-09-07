<script lang="ts">
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import { thumbnailRegistry } from '$lib/services/thumbnail-registry';
	import { imageSelectionStore } from '$lib/stores/image-selection-store.svelte';
	import RatingComponent from './components/RatingComponent.svelte';
	import { transitionToViewer } from './services/app-transitions';

	const {
		imagePath,
	}: {
		imagePath: string;
	} = $props();

	const { state: imageSelectionState, actions: imageSelectionActions } = imageSelectionStore;

	const { state: thumbnailState, actions: thumbnailActions } =
		thumbnailRegistry.getOrCreateStore(imagePath);
	thumbnailActions.ensureLoaded();

	// 選択状態をストアから直接取得
	const isSelected = $derived(imageSelectionState.selectedImages.has(imagePath));

	const handleClick = (event?: MouseEvent): void => {
		imageSelectionActions.toggleImageSelection(imagePath, event?.shiftKey, event?.metaKey);
	};

	const handleDoubleClick = (): void => {
		transitionToViewer(imagePath);
	};
</script>

<div class="group relative cursor-pointer">
	<button
		class="aspect-square w-full cursor-pointer overflow-hidden rounded-lg border-0 bg-base-200 p-0 shadow-md transition-all duration-200 hover:bg-primary/10 hover:shadow-lg"
		class:ring-4={isSelected}
		class:ring-blue-500={isSelected}
		class:opacity-80={isSelected}
		onclick={handleClick}
		ondblclick={handleDoubleClick}
		onkeydown={(e) => e.key === 'Enter' && handleClick()}
		aria-label="Select image (double-click to open)"
	>
		<!-- 状態表示をシンプルに -->
		{#if thumbnailState.loadingStatus === 'loaded'}
			{#if thumbnailState.thumbnailUrl}
				<div class="relative flex h-full w-full items-center justify-center p-1">
					<img
						src={thumbnailState.thumbnailUrl}
						alt="thumbnail"
						class="h-full w-full rounded object-contain"
						loading="lazy"
					/>
				</div>
			{:else}
				<div class="flex h-full flex-col items-center justify-center bg-base-300/20">
					<div class="mb-1 text-2xl opacity-30">📷</div>
					<div class="text-xs text-base-content/50">No Image</div>
				</div>
			{/if}
		{:else}
			<div class="flex h-full items-center justify-center bg-base-300/20">
				<LoadingState status={thumbnailState.loadingStatus} />
			</div>
		{/if}
	</button>

	<!-- Rating Component -->
	<div class="absolute bottom-1 left-1/2 -translate-x-1/2">
		<RatingComponent {imagePath} />
	</div>
</div>
