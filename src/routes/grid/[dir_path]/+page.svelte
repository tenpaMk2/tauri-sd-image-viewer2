<script lang="ts">
	import ThumbnailGrid from '$lib/components/grid/ThumbnailGrid.svelte';
	import { getContext } from 'svelte';
	import type { GridPageData } from './+page';

	const thumbnailQueue = $derived(
		getContext<() => GridPageData['thumbnailQueue']>('thumbnailQueue')(),
	);
	const thumbnailStores = $derived(
		getContext<() => GridPageData['thumbnailStores']>('thumbnailStores')(),
	);

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
	<ThumbnailGrid />
</div>
