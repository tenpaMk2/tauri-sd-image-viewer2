<script lang="ts">
	import { onDestroy } from 'svelte';
	import ImageThumbnail from './ImageThumbnail.svelte';
	import { metadataRegistry } from './stores/metadata-registry.svelte';
	import { thumbnailStore } from './stores/thumbnail-store.svelte';

	const {
		imageFiles,
		onImageSelect,
		selectedImages = new Set(),
		onToggleSelection
	}: {
		imageFiles: string[];
		onImageSelect: (imagePath: string) => void;
		selectedImages?: Set<string>;
		onToggleSelection?: (imagePath: string, shiftKey?: boolean, metaKey?: boolean) => void;
	} = $props();

	// クリーンアップ
	onDestroy(() => {
		// 未使用メタデータをクリア
		metadataRegistry.clearUnused([]);
		// 未使用サムネイルをクリア
		thumbnailStore.actions.clearUnused([]);
	});
</script>

<!-- サムネイルグリッド -->
<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
	{#each imageFiles as imagePath (imagePath)}
		<ImageThumbnail
			{imagePath}
			isSelected={selectedImages.has(imagePath)}
			onImageClick={onImageSelect}
			{onToggleSelection}
		/>
	{/each}
</div>

<!-- 画像数表示 -->
<div class="mt-4 text-center text-sm text-gray-500">
	{imageFiles.length} images
</div>
