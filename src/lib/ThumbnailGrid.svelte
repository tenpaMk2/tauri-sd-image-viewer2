<script lang="ts">
	import ImageThumbnail from './ImageThumbnail.svelte';

	const {
		imageFiles,
		selectedImages = new Set(),
		onToggleSelection,
	}: {
		imageFiles: string[];
		selectedImages?: Set<string>;
		onToggleSelection?: (imagePath: string, shiftKey?: boolean, metaKey?: boolean) => void;
	} = $props();
</script>

<!-- サムネイルグリッド -->
<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
	{#each imageFiles as imagePath (imagePath)}
		<ImageThumbnail {imagePath} isSelected={selectedImages.has(imagePath)} {onToggleSelection} />
	{/each}
</div>

<!-- 画像数表示 -->
<div class="mt-4 text-center text-sm text-gray-500">
	{imageFiles.length} images
</div>
