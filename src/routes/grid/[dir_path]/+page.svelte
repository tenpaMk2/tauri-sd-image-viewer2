<script lang="ts">
	import ThumbnailGrid from '$lib/components/grid/ThumbnailGrid.svelte';
	import {
		GRID_PAGE_DATA_CONTEXT,
		type GridPageDataContext,
	} from '$lib/components/grid/grid-page-data';
	import { getContext } from 'svelte';

	const gridPageDataContext = $derived(
		getContext<() => GridPageDataContext>(GRID_PAGE_DATA_CONTEXT)(),
	);
	const thumbnailQueue = $derived(gridPageDataContext.state.thumbnailQueue);
	const thumbnailStores = $derived(gridPageDataContext.state.thumbnailStores);

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
