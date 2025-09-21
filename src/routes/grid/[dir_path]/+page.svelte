<script lang="ts">
	import ThumbnailGrid from '$lib/components/grid/ThumbnailGrid.svelte';
	import {
		GRID_METADATA_CONTEXT,
		type GridMetadataContext,
	} from '$lib/components/grid/grid-metadata';
	import {
		GRID_PAGE_DATA_CONTEXT,
		type GridPageDataContext,
	} from '$lib/components/grid/grid-page-data';
	import { getContext } from 'svelte';

	const gridPageDataContext = $derived(
		getContext<() => GridPageDataContext>(GRID_PAGE_DATA_CONTEXT)(),
	);
	const gridMetadataContext = $derived(
		getContext<() => GridMetadataContext>(GRID_METADATA_CONTEXT)(),
	);
	const thumbnailQueue = $derived(gridPageDataContext.state.thumbnailQueue);
	const thumbnailStores = $derived(gridPageDataContext.state.thumbnailStores);
	const metadataQueue = $derived(gridPageDataContext.state.metadataQueue);
	const metadataStores = $derived(gridMetadataContext.state.metadataStores);

	// Cleanup on unmount (ディレクトリ変更時)
	$effect(() => {
		return () => {
			console.log('🐟Clear all thumbnails, metadata and queues');
			// サムネイルのクリーンアップ
			thumbnailQueue.clear();
			thumbnailStores.forEach((store) => {
				store.actions.destroy();
			});
			// メタデータのクリーンアップ
			metadataQueue.clear();
			metadataStores.forEach((store) => {
				store.actions.destroy();
			});
		};
	});
</script>

<div class="p-4">
	<ThumbnailGrid />
</div>
