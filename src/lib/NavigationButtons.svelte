<script lang="ts">
	import Icon from '@iconify/svelte';

	const {
		imageFiles,
		currentIndex,
		isNavigating,
		goToPrevious,
		goToNext
	}: {
		imageFiles: string[];
		currentIndex: number;
		isNavigating: boolean;
		goToPrevious: () => void;
		goToNext: () => void;
	} = $props();
</script>

<!-- ナビゲーションボタン -->
{#if 2 <= imageFiles.length}
	<!-- 前の画像ボタン -->
	{#if 0 < currentIndex}
		<div
			class="absolute top-1/2 left-6 flex h-16 w-16 -translate-y-1/2 items-center justify-center"
		>
			<button
				class="btn btn-circle btn-ghost btn-lg"
				class:btn-disabled={isNavigating}
				aria-label="前の画像"
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
	{#if currentIndex < imageFiles.length - 1}
		<div
			class="absolute top-1/2 right-6 flex h-16 w-16 -translate-y-1/2 items-center justify-center"
		>
			<button
				class="btn btn-circle btn-ghost btn-lg"
				class:btn-disabled={isNavigating}
				aria-label="次の画像"
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
