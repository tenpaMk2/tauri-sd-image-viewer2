<script lang="ts">
	import Icon from '@iconify/svelte';
	import { invoke } from '@tauri-apps/api/core';
	import { basename } from '@tauri-apps/api/path';
	import { platform } from '@tauri-apps/plugin-os';
	import FilterPanel from './FilterPanel.svelte';
	import type { TagAggregationResult } from './services/tag-aggregation-service';
	import { appStore } from './stores/app-store.svelte';
	import { showSuccessToast } from './stores/toast.svelte';
	import ThumbnailGrid from './ThumbnailGrid.svelte';
	import { deleteSelectedImages as performDelete } from './utils/delete-images';

	const {
		handleBackToWelcome,
		openDirectoryDialog,
		handleImageSelect,
		loadImageFiles
	}: {
		handleBackToWelcome: () => void;
		openDirectoryDialog: () => void;
		handleImageSelect: (imagePath: string) => void;
		loadImageFiles: () => Promise<void>;
	} = $props();

	// app-storeから直接状態を取得（リアクティブ）
	const selectedDirectory = $derived(appStore.state.selectedDirectory!);
	const imageFiles = $derived(appStore.state.imageFiles);
	const imageLoadingState = $derived(appStore.state.imageLoadingState);
	const imageFileLoadError = $derived(appStore.state.imageFileLoadError);

	let selectedImages = $state<Set<string>>(new Set());
	let refreshTrigger = $state<number>(0);
	let filteredImageCount = $state<number>(0);
	// totalImageCountは直接imageFiles.lengthから取得
	const totalImageCount = $derived(imageFiles.length);
	let isMacOS = $state<boolean>(false);
	let lastSelectedIndex = $state<number>(-1); // Shift+Click用の基点インデックス
	let showFilterPanel = $state<boolean>(false);
	let tagData = $state<TagAggregationResult | null>(null);
	let showOptionsModal = $state<boolean>(false);

	// フィルタリング結果を受け取る
	const handleFilteredImagesUpdate = (filtered: number, total: number) => {
		filteredImageCount = filtered;
	};

	// タグデータを受け取る
	const handleTagDataLoaded = (data: TagAggregationResult) => {
		tagData = data;
	};

	// フィルターパネルの表示切り替え
	const toggleFilterPanel = () => {
		showFilterPanel = !showFilterPanel;
	};

	// オプションモーダルの表示切り替え
	const toggleOptionsModal = () => {
		showOptionsModal = !showOptionsModal;
	};

	// キャッシュ削除
	const clearCache = async () => {
		try {
			await invoke('clear_thumbnail_cache');
			showSuccessToast('Thumbnail cache cleared');
			showOptionsModal = false;
			// app-storeから画像ファイルを再読み込み
			await loadImageFiles();
		} catch (error) {
			console.error('Failed to clear cache: ' + error);
		}
	};

	// 画像選択/選択解除（OSファイル選択エミュレート）
	const toggleImageSelection = (
		imagePath: string,
		shiftKey: boolean = false,
		metaKey: boolean = false
	) => {
		const currentIndex = imageFiles.indexOf(imagePath);

		if (shiftKey && lastSelectedIndex !== -1) {
			// Shift+Click: 範囲選択
			const startIndex = Math.min(lastSelectedIndex, currentIndex);
			const endIndex = Math.max(lastSelectedIndex, currentIndex);

			const newSelection = new Set(selectedImages);
			for (let i = startIndex; i <= endIndex; i++) {
				newSelection.add(imageFiles[i]);
			}
			selectedImages = newSelection;
		} else if (metaKey) {
			// Cmd+Click (macOS) または Ctrl+Click (Windows/Linux): 複数選択
			const newSelection = new Set(selectedImages);
			if (selectedImages.has(imagePath)) {
				// 既に選択されている場合は選択解除
				newSelection.delete(imagePath);
			} else {
				// 新しく選択に追加
				newSelection.add(imagePath);
				lastSelectedIndex = currentIndex;
			}
			selectedImages = newSelection;
		} else {
			// 通常クリック: 単独選択（既存選択をクリア）
			if (selectedImages.has(imagePath)) {
				// 既に選択されている場合は選択解除
				selectedImages = new Set();
				lastSelectedIndex = -1;
			} else {
				// 新しく選択（他の選択はクリア）
				selectedImages = new Set([imagePath]);
				lastSelectedIndex = currentIndex;
			}
		}
	};

	// 全選択/全選択解除
	const toggleSelectAll = () => {
		if (selectedImages.size === imageFiles.length) {
			selectedImages = new Set();
		} else {
			selectedImages = new Set(imageFiles);
		}
	};

	// 選択画像削除
	const deleteSelectedImages = async () => {
		try {
			await performDelete(selectedImages);
			selectedImages = new Set();
			// app-storeから画像ファイルを再読み込み
			await loadImageFiles();
		} catch (err) {
			// エラーはperformDelete内で処理済み
		}
	};

	// クリップボード機能
	const copySelectedToClipboard = async (): Promise<void> => {
		if (selectedImages.size === 0) return;

		const paths = Array.from(selectedImages);
		try {
			await invoke('set_clipboard_files', { paths });
			showSuccessToast(`${selectedImages.size} images copied to clipboard`);
		} catch (error) {
			console.error('Failed to copy to clipboard: ' + error);
		}
	};

	// プラットフォーム判定の初期化
	$effect(() => {
		const checkPlatform = async () => {
			try {
				const currentPlatform = await platform();
				isMacOS = currentPlatform === 'macos';
			} catch (error) {
				console.error('Failed to detect platform: ' + error);
				isMacOS = false;
			}
		};

		checkPlatform();
	});
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="flex items-center justify-between bg-base-200 p-4">
		<div class="flex items-center gap-4">
			<button class="btn btn-ghost btn-sm" onclick={handleBackToWelcome} title="Back to Home">
				<Icon icon="lucide:home" class="h-4 w-4" />
			</button>
			{#await basename(selectedDirectory) then folderName}
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
		<FilterPanel totalImages={totalImageCount} filteredImages={filteredImageCount} {tagData} />
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
		{:else if imageLoadingState === 'loaded' && imageFiles.length > 0}
			<!-- ファイルリストが確定している場合のみThumbnailGridを表示 -->
			<ThumbnailGrid
				{imageFiles}
				onImageSelect={handleImageSelect}
				{selectedImages}
				onToggleSelection={toggleImageSelection}
				{refreshTrigger}
				onFilteredImagesUpdate={handleFilteredImagesUpdate}
				onTagDataLoaded={handleTagDataLoaded}
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
