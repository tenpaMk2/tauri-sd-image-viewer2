<script lang="ts">
	import type { ImageMetadata } from './image/types';

	const {
		imageUrl,
		isLoading,
		error,
		metadata
	}: {
		imageUrl: string;
		isLoading: boolean;
		error: string;
		metadata: ImageMetadata;
	} = $props();
</script>

<div class="absolute inset-0 flex items-center justify-center">
	{#if error}
		<div class="flex flex-col items-center gap-2 text-red-400">
			<svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
				></path>
			</svg>
			<span class="text-center">{error}</span>
		</div>
	{:else if imageUrl}
		<img src={imageUrl} alt={metadata.filename} class="max-h-full max-w-full object-contain" />
	{:else if isLoading}
		<div class="flex flex-col items-center gap-2 text-white">
			<span class="loading loading-lg loading-spinner"></span>
			<span class="opacity-80">画像を読み込み中...</span>
		</div>
	{/if}
</div>
