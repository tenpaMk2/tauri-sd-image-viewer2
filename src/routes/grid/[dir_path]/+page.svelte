<script lang="ts">
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import { navigateToViewer } from '$lib/services/app-navigation';
	import { thumbnailQueue } from '$lib/stores/thumbnail-store.svelte';
	import { getContext } from 'svelte';
	import type { GridPageData } from './+page';

	// Context から データを取得
	const imagePaths = getContext<() => string[]>('imagePaths')();
	const thumbnailStores = getContext<() => GridPageData['thumbnailStores']>('thumbnailStores')();

	const handleImageClick = (imagePath: string): void => {
		navigateToViewer(imagePath);
	};

	// Cleanup on unmount (ディレクトリ変更時)
	$effect(() => {
		return () => {
			console.log('🐟Clear all thumbnails and queue');
			// p-queueをクリア（進行中のタスクをabort）
			thumbnailQueue.clear();
			// 個別のストアもクリーンアップ
			thumbnailStores.forEach((store) => {
				store.actions.destroy();
			});
		};
	});
</script>

<div class="p-4">
	{#if imagePaths.length === 0}
		<div class="flex h-full items-center justify-center">
			<div class="text-center">
				<div class="mb-4 text-6xl opacity-30">📁</div>
				<h2 class="mb-2 text-xl font-bold text-base-content">No Images Found</h2>
				<p class="text-base-content/70">
					This directory doesn't contain any supported image files.
				</p>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
			{#each imagePaths as imagePath (imagePath)}
				{@const thumbnailStore = thumbnailStores.get(imagePath)!}
				{@const thumbnailState = thumbnailStore.state}

				<button
					class="group aspect-square overflow-hidden rounded-lg border-2 border-transparent transition-all hover:border-primary hover:shadow-lg focus:border-primary focus:outline-none"
					onclick={() => handleImageClick(imagePath)}
					title={imagePath.split('/').pop()}
				>
					{#if thumbnailState.loadingStatus === 'loaded' && thumbnailState.thumbnailUrl}
						<img
							src={thumbnailState.thumbnailUrl}
							alt="thumbnail"
							class="h-full w-full object-contain transition-transform group-hover:scale-105"
							loading="lazy"
						/>
					{:else}
						<div class="flex h-full items-center justify-center bg-base-200">
							<LoadingState status={thumbnailState.loadingStatus} />
						</div>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
