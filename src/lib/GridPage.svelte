<script lang="ts">
	import BottomToolbar from '$lib/BottomToolbar.svelte';
	import FilterPanel from '$lib/FilterPanel.svelte';
	import HeaderBar from '$lib/HeaderBar.svelte';
	import OptionsModal from '$lib/OptionsModal.svelte';
	import { filteredImagesStore } from '$lib/stores/filtered-images-store.svelte';
	import { gridUiStore } from '$lib/stores/grid-ui-store.svelte';
	import { imageSelectionStore } from '$lib/stores/image-selection-store.svelte';
	import { navigationStore } from '$lib/stores/navigation-store.svelte';
	import ThumbnailGrid from '$lib/ThumbnailGrid.svelte';
	// ストアから直接状態を取得
	const imageFiles = navigationStore.state.directoryImagePaths;
	const imageLoadingState = navigationStore.state.imageLoadingStatus;
	const imageFileLoadError = navigationStore.state.imageFileLoadError;
	const selectedImages = imageSelectionStore.state.selectedImages;
	const showFilterPanel = gridUiStore.state.showFilterPanel;

	// フィルタリング済み画像リスト
	const filteredImageFiles = filteredImagesStore.getters.filteredImageFiles;

	// 画像選択/選択解除（OSファイル選択エミュレート）
	const toggleImageSelection = (
		imagePath: string,
		shiftKey: boolean = false,
		metaKey: boolean = false,
	) => {
		imageSelectionStore.actions.toggleImageSelection(imagePath, shiftKey, metaKey);
	};
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<HeaderBar />

	<!-- Filter Panel -->
	{#if showFilterPanel}
		<FilterPanel />
	{/if}

	<!-- Grid View -->
	<div class="flex-1">
		{#if imageLoadingState === 'loading'}
			<div class="flex h-96 items-center justify-center">
				<div class="flex items-center space-x-2">
					<span class="loading loading-md loading-spinner"></span>
					<span>Loading image files...</span>
				</div>
			</div>
		{:else if imageFileLoadError}
			<div class="flex h-96 items-center justify-center">
				<div class="alert max-w-md alert-error">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6 shrink-0 stroke-current"
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span>Error: {imageFileLoadError}</span>
				</div>
			</div>
		{:else if imageLoadingState === 'loaded' && imageFiles.length === 0}
			<div class="flex h-96 items-center justify-center">
				<div class="text-center">
					<p class="text-lg">No images found in directory</p>
				</div>
			</div>
		{:else if imageLoadingState === 'loaded' && 0 < imageFiles.length}
			<!-- ファイルリストが確定している場合のみThumbnailGridを表示 -->
			<ThumbnailGrid
				imageFiles={filteredImageFiles}
				{selectedImages}
				onToggleSelection={toggleImageSelection}
			/>
		{/if}
	</div>
</div>

<!-- Bottom Toolbar when Selected -->
<BottomToolbar />

<!-- Options Modal -->
<OptionsModal />
