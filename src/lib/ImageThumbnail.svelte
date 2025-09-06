<script lang="ts">
	import RatingComponent from '$lib/components/RatingComponent.svelte';
	import { thumbnailRegistry } from '$lib/services/thumbnail-registry';
	import { imageSelectionStore } from '$lib/stores/image-selection-store.svelte';
	import { LOADING_STATUS_CONFIG } from '$lib/ui/loading-status-config';
	import Icon from '@iconify/svelte';
	import { transitionToViewer } from './services/app-transitions';

	const {
		imagePath,
	}: {
		imagePath: string;
	} = $props();

	const { state: imageSelectionState, actions: imageSelectionActions } = imageSelectionStore;

	// サムネイルアイテムを取得（$stateオブジェクトなので$derivedは不要）
	const thumbnail = thumbnailRegistry.getOrCreateStore(imagePath);

	// サムネイルロードを開始
	thumbnail.actions.ensureLoaded();

	// 選択状態をストアから直接取得
	const isSelected = $derived(imageSelectionState.selectedImages.has(imagePath));

	const handleClick = (event?: MouseEvent): void => {
		imageSelectionActions.toggleImageSelection(imagePath, event?.shiftKey, event?.metaKey);
	};

	const handleDoubleClick = (): void => {
		transitionToViewer(imagePath);
	};
</script>

{#snippet loadingState(
	config: (typeof LOADING_STATUS_CONFIG)[keyof typeof LOADING_STATUS_CONFIG],
	errorMessage?: string,
)}
	<div
		class="flex h-full flex-col items-center justify-center {config.icon === 'triangle-alert'
			? 'bg-error/10'
			: 'bg-base-300/20'}"
	>
		{#if config.icon}
			<Icon
				icon="lucide:{config.icon}"
				class="mb-1 text-xl {config.icon === 'triangle-alert' ? 'opacity-50' : 'opacity-30'}"
			/>
		{:else if config.loadingIcon}
			<span class="loading mb-2 loading-sm {config.loadingIcon}"></span>
		{/if}
		<div
			class="text-xs {config.icon === 'triangle-alert' ? 'text-error/70' : 'text-base-content/50'}"
		>
			{config.text}
		</div>
		{#if errorMessage}
			<div class="px-1 text-center text-xs break-words text-error/50">
				{errorMessage}
			</div>
		{/if}
	</div>
{/snippet}

{#snippet thumbnailContent()}
	{#if thumbnail.state.loadingStatus === 'unloaded'}
		{@render loadingState(LOADING_STATUS_CONFIG.unloaded)}
	{:else if thumbnail.state.loadingStatus === 'queued'}
		{@render loadingState(LOADING_STATUS_CONFIG.queued)}
	{:else if thumbnail.state.loadingStatus === 'loading'}
		{@render loadingState(LOADING_STATUS_CONFIG.loading)}
	{:else if thumbnail.state.loadingStatus === 'loaded'}
		{#if thumbnail.state.thumbnailUrl}
			<div class="relative flex h-full w-full items-center justify-center p-1">
				<img
					src={thumbnail.state.thumbnailUrl}
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
	{:else if thumbnail.state.loadingStatus === 'error'}
		{@render loadingState(LOADING_STATUS_CONFIG.error, thumbnail.state.loadError)}
	{/if}
{/snippet}

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
		{@render thumbnailContent()}
	</button>

	<!-- Rating Component -->
	<div class="absolute bottom-1 left-1/2 -translate-x-1/2">
		{#key imagePath}
			<RatingComponent {imagePath} />
		{/key}
	</div>
</div>
