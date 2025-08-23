<script lang="ts">
	import FilterPanel from '$lib/FilterPanel.svelte';
	import { dialogService } from '$lib/services/dialog';
	import { appStore } from '$lib/stores/app-store.svelte';
	import { filterStore } from '$lib/stores/filter-store.svelte';
	import { gridStore } from '$lib/stores/grid-store.svelte';
	import { navigationStore } from '$lib/stores/navigation-store.svelte';
	import { tagStore } from '$lib/stores/tag-store.svelte';
	import ThumbnailGrid from '$lib/ThumbnailGrid.svelte';
	import Icon from '@iconify/svelte';
	import { path } from '@tauri-apps/api';

	// app-storeから直接状態を取得（リアクティブ）
	const directory = $derived(appStore.state.directory!);
	// navigationStoreから画像ファイル状態を取得
	const imageFiles = $derived(navigationStore.state.directoryImagePaths);
	const imageLoadingState = $derived(navigationStore.state.imageLoadingStatus);
	const imageFileLoadError = $derived(navigationStore.state.imageFileLoadError);

	// gridStoreから状態を取得
	const selectedImages = $derived(gridStore.state.selectedImages);
	const showFilterPanel = $derived(gridStore.state.showFilterPanel);
	const showOptionsModal = $derived(gridStore.state.showOptionsModal);

	// filterStoreから状態を取得（使用されていないため削除）
	// const filterState = $derived(filterStore.state);

	// タグストアから状態を取得
	const tagData = $derived(tagStore.state.tagData);

	// フィルタリングされた画像リスト（フィルタ適用前のimageFiles.lengthと比較用）
	const totalImageCount = $derived(imageFiles.length);

	// フィルタリングされた画像リスト
	const filteredImageFiles = $derived.by(() => {
		if (imageFiles.length === 0) return [];
		// レーティングマップを同期的に取得
		const ratingsMap = tagStore.state.tagAggregationService?.getRatingsMapSync(imageFiles);
		if (!ratingsMap) return imageFiles;

		// フィルタを適用
		return filterStore.actions.filterImages(
			imageFiles,
			ratingsMap,
			tagStore.state.tagAggregationService,
		);
	});

	const filteredImageCount = $derived(filteredImageFiles.length);

	// フィルターパネルの表示切り替え
	const toggleFilterPanel = () => {
		gridStore.actions.toggleFilterPanel();
	};

	// オプションモーダルの表示切り替え
	const toggleOptionsModal = () => {
		gridStore.actions.toggleOptionsModal();
	};

	// キャッシュ削除
	const clearCache = async () => {
		await gridStore.actions.clearCache(directory);
	};

	// 画像選択/選択解除（OSファイル選択エミュレート）
	const toggleImageSelection = (
		imagePath: string,
		shiftKey: boolean = false,
		metaKey: boolean = false,
	) => {
		gridStore.actions.toggleImageSelection(imagePath, imageFiles, shiftKey, metaKey);
	};

	// 全選択/全選択解除
	const toggleSelectAll = () => {
		gridStore.actions.toggleSelectAll(imageFiles);
	};

	// 選択画像削除
	const deleteSelectedImages = async () => {
		await gridStore.actions.deleteSelectedImages(directory);
	};

	// クリップボード機能
	const copySelectedToClipboard = async (): Promise<void> => {
		await gridStore.actions.copySelectedToClipboard();
	};

	// ディレクトリ選択ハンドラー
	const openDirectoryDialog = async () => {
		const result = await dialogService.openDirectoryDialog();
		if (result) {
			await appStore.actions.transitionToGrid(result);
		}
	};
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="flex items-center justify-between bg-base-200 p-4">
		<div class="flex items-center gap-4">
			<button
				class="btn btn-ghost btn-sm"
				onclick={async () => await appStore.actions.transitionToWelcome()}
				title="Back to Home"
			>
				<Icon icon="lucide:home" class="h-4 w-4" />
			</button>
			{#await path.basename(directory) then folderName}
				<h1 class="truncate text-lg font-semibold">
					{folderName || 'Folder'}
				</h1>
			{/await}
			{#if 0 < totalImageCount}
				<div class="text-sm opacity-80">
					{#if filteredImageCount < totalImageCount}
						{filteredImageCount} of {totalImageCount} images
					{:else}
						{totalImageCount} images
					{/if}
					{#if tagData && tagData.allTags.length > 0}
						• {tagData.allTags.length} SD tags
					{/if}
				</div>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			<!-- Options Button -->
			<button class="btn btn-ghost btn-sm" onclick={toggleOptionsModal} title="Options">
				<Icon icon="lucide:settings" class="h-4 w-4" />
			</button>

			<!-- Filter Button -->
			<button
				class="btn btn-ghost btn-sm {showFilterPanel ? 'btn-active btn-primary' : ''}"
				onclick={toggleFilterPanel}
				title="Toggle Filters"
			>
				<Icon icon="lucide:filter" class="h-4 w-4" />
			</button>

			<!-- Select All Button -->
			{#if 0 < filteredImageCount}
				<button
					class="btn btn-ghost btn-sm"
					onclick={toggleSelectAll}
					title={selectedImages.size === filteredImageCount ? 'Deselect All' : 'Select All'}
				>
					<Icon
						icon={selectedImages.size === filteredImageCount
							? 'lucide:square-dashed'
							: 'lucide:square-check-big'}
						class="h-4 w-4"
					/>
				</button>
			{/if}

			<button
				class="btn btn-ghost btn-sm"
				onclick={openDirectoryDialog}
				title="Open Another Folder"
			>
				<Icon icon="lucide:folder-open" class="h-4 w-4" />
			</button>
		</div>
	</div>

	<!-- Filter Panel -->
	{#if showFilterPanel}
		<FilterPanel
			isExpanded={showFilterPanel}
			totalImages={totalImageCount}
			filteredImages={filteredImageCount}
			{tagData}
		/>
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
{#if 0 < selectedImages.size}
	<div
		class="fixed right-0 bottom-0 left-0 z-20 border-t border-gray-700 bg-gray-900/95 p-4 backdrop-blur-sm"
	>
		<div class="mx-auto flex max-w-4xl items-center justify-between">
			<div class="text-white">
				{selectedImages.size} images selected
			</div>
			<div class="flex items-center gap-4">
				<button
					class="btn text-white btn-ghost btn-sm"
					onclick={copySelectedToClipboard}
					title="Copy to Clipboard"
				>
					<Icon icon="lucide:copy" class="h-4 w-4" />
				</button>
				<button
					class="btn text-white btn-ghost btn-sm"
					onclick={deleteSelectedImages}
					title="Delete"
				>
					<Icon icon="lucide:trash-2" class="h-4 w-4" />
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Options Modal -->
{#if showOptionsModal}
	<div class="modal-open modal">
		<div class="modal-box">
			<h3 class="mb-4 text-lg font-bold">Options</h3>

			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<div>
						<div class="font-medium">Clear Thumbnail Cache</div>
						<div class="text-sm opacity-70">Remove all cached thumbnails to free up disk space</div>
					</div>
					<button class="btn btn-outline btn-sm" onclick={clearCache}>
						<Icon icon="lucide:trash-2" class="h-4 w-4" />
						Clear
					</button>
				</div>
			</div>

			<div class="modal-action">
				<button class="btn" onclick={toggleOptionsModal}>Close</button>
			</div>
		</div>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal-backdrop" onclick={toggleOptionsModal}></div>
	</div>
{/if}
