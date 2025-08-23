<script lang="ts">
	import RatingComponent from '$lib/components/RatingComponent.svelte';
	import { thumbnailRegistry } from '$lib/services/thumbnail-registry';
	import { appStore } from '$lib/stores/app-store.svelte';

	const {
		imagePath,
		isSelected = false,
		onToggleSelection,
	}: {
		imagePath: string;
		isSelected?: boolean;
		onToggleSelection?: (imagePath: string, shiftKey?: boolean, metaKey?: boolean) => void;
	} = $props();

	// サムネイルアイテムを取得（$stateオブジェクトなので$derivedは不要）
	const thumbnail = thumbnailRegistry.getOrCreateStore(imagePath);

	// 表示時に自動的にサムネイルをロード（UI表示の責務）
	$effect(() => {
		if (thumbnail.state.loadingStatus === 'unloaded') {
			thumbnail.actions.ensureLoaded().catch((error) => {
				console.error('Failed to load thumbnail for ' + imagePath.split('/').pop() + ': ' + error);
			});
		}
	});

	const handleClick = (event?: MouseEvent): void => {
		if (onToggleSelection) {
			onToggleSelection(imagePath, event?.shiftKey, event?.metaKey);
		}
	};
</script>

<div class="group relative cursor-pointer">
	<button
		class="aspect-square w-full cursor-pointer overflow-hidden rounded-lg border-0 bg-base-200 p-0 shadow-md transition-all duration-200 hover:bg-primary/10 hover:shadow-lg"
		class:ring-4={isSelected}
		class:ring-blue-500={isSelected}
		class:opacity-80={isSelected}
		onclick={handleClick}
		ondblclick={async () => await appStore.actions.transitionToViewer(imagePath)}
		onkeydown={(e) => e.key === 'Enter' && handleClick()}
		aria-label="Select image (double-click to open)"
	>
		{#if thumbnail.state.loadingStatus === 'loaded'}
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
		{:else}
			<div class="flex h-full flex-col items-center justify-center bg-base-300/30">
				<div class="loading mb-2 loading-sm loading-spinner"></div>
				<div class="text-xs text-base-content/50">Loading...</div>
			</div>
		{/if}
	</button>

	<!-- Rating Component -->
	<div class="absolute bottom-1 left-1/2 -translate-x-1/2">
		<RatingComponent {imagePath} />
	</div>
</div>
