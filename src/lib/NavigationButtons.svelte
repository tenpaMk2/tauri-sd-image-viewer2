<script lang="ts">
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
{#if !(imageFiles.length < 2)}
	<!-- 前の画像ボタン -->
	{#if !(currentIndex < 1)}
		<div class="absolute top-0 left-6 flex h-full items-center">
			<button
				class="btn btn-circle btn-ghost btn-lg"
				class:btn-disabled={isNavigating}
				aria-label="前の画像"
				onclick={goToPrevious}
			>
				{#if isNavigating}
					<span class="loading loading-sm loading-spinner"></span>
				{:else}
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 19l-7-7 7-7"
						/>
					</svg>
				{/if}
			</button>
		</div>
	{/if}

	<!-- 次の画像ボタン -->
	{#if currentIndex < imageFiles.length - 1}
		<div class="absolute top-0 right-6 flex h-full items-center">
			<button
				class="btn btn-circle btn-ghost btn-lg"
				class:btn-disabled={isNavigating}
				aria-label="次の画像"
				onclick={goToNext}
			>
				{#if isNavigating}
					<span class="loading loading-sm loading-spinner"></span>
				{:else}
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				{/if}
			</button>
		</div>
	{/if}
{/if}
