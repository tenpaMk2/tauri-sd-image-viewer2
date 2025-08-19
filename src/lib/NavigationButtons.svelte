<script lang="ts">
	import { navigationService } from '$lib/services/navigation-service.svelte';
	import Icon from '@iconify/svelte';

	const {
		isNavigating,
		goToPrevious,
		goToNext,
		isUIVisible
	}: {
		isNavigating: boolean;
		goToPrevious: () => void;
		goToNext: () => void;
		isUIVisible?: boolean;
	} = $props();
</script>

<!-- ナビゲーションボタン -->
{#if 2 <= navigationService.files.length}
	<!-- 前の画像ボタン -->
	{#if navigationService.hasPrevious}
		<div
			class="absolute top-1/2 left-6 flex h-16 w-16 -translate-y-1/2 items-center justify-center transition-opacity duration-300"
			class:opacity-0={!isUIVisible}
			class:pointer-events-none={!isUIVisible}
		>
			<button
				class="btn btn-circle btn-ghost btn-lg"
				class:btn-disabled={isNavigating}
				aria-label="Previous image"
				onclick={goToPrevious}
			>
				{#if isNavigating}
					<span class="loading loading-sm loading-spinner"></span>
				{:else}
					<Icon icon="lucide:chevron-left" class="h-6 w-6" />
				{/if}
			</button>
		</div>
	{/if}

	<!-- 次の画像ボタン -->
	{#if navigationService.hasNext}
		<div
			class="absolute top-1/2 right-6 flex h-16 w-16 -translate-y-1/2 items-center justify-center transition-opacity duration-300"
			class:opacity-0={!isUIVisible}
			class:pointer-events-none={!isUIVisible}
		>
			<button
				class="btn btn-circle btn-ghost btn-lg"
				class:btn-disabled={isNavigating}
				aria-label="Next image"
				onclick={goToNext}
			>
				{#if isNavigating}
					<span class="loading loading-sm loading-spinner"></span>
				{:else}
					<Icon icon="lucide:chevron-right" class="h-6 w-6" />
				{/if}
			</button>
		</div>
	{/if}
{/if}
