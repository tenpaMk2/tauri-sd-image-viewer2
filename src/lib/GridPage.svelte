<script lang="ts">
	import Icon from '@iconify/svelte';
	import { invoke } from '@tauri-apps/api/core';
	import { basename } from '@tauri-apps/api/path';
	import { platform } from '@tauri-apps/plugin-os';
	import { showSuccessToast } from './stores/toast.svelte';
	import ThumbnailGrid from './ThumbnailGrid.svelte';
	import FilterPanel from './FilterPanel.svelte';
	import { deleteSelectedImages as performDelete } from './utils/delete-images';
	import type { TagAggregationResult } from './services/tag-aggregation-service';

	const {
		selectedDirectory,
		handleBackToWelcome,
		openDirectoryDialog,
		handleImageSelect
	}: {
		selectedDirectory: string;
		handleBackToWelcome: () => void;
		openDirectoryDialog: () => void;
		handleImageSelect: (imagePath: string) => void;
	} = $props();

	let selectedImages = $state<Set<string>>(new Set());
	let refreshTrigger = $state<number>(0);
	let imageFiles = $state<string[]>([]);
	let filteredImageCount = $state<number>(0);
	let totalImageCount = $state<number>(0);
	let isMacOS = $state<boolean>(false);
	let lastSelectedIndex = $state<number>(-1); // Shift+Click用の基点インデックス
	let showFilterPanel = $state<boolean>(false);
	let tagData = $state<TagAggregationResult | null>(null);

	// ThumbnailGridから画像ファイル一覧を受け取る
	const handleImageFilesLoaded = (files: string[]) => {
		imageFiles = files;
		totalImageCount = files.length;
	};

	// フィルタリング結果を受け取る
	const handleFilteredImagesUpdate = (filtered: number, total: number) => {
		filteredImageCount = filtered;
		totalImageCount = total;
	};

	// タグデータを受け取る
	const handleTagDataLoaded = (data: TagAggregationResult) => {
		tagData = data;
	};

	// フィルターパネルの表示切り替え
	const toggleFilterPanel = () => {
		showFilterPanel = !showFilterPanel;
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
			refreshTrigger = Date.now();
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
			console.error('Failed to copy to clipboard:', error);
		}
	};

	// プラットフォーム判定の初期化
	$effect(() => {
		const checkPlatform = async () => {
			try {
				const currentPlatform = await platform();
				isMacOS = currentPlatform === 'macos';
			} catch (error) {
				console.error('Failed to detect platform:', error);
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
		<ThumbnailGrid
			directoryPath={selectedDirectory}
			onImageSelect={handleImageSelect}
			{selectedImages}
			onToggleSelection={toggleImageSelection}
			{refreshTrigger}
			onImageFilesLoaded={handleImageFilesLoaded}
			onFilteredImagesUpdate={handleFilteredImagesUpdate}
			onTagDataLoaded={handleTagDataLoaded}
		/>
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
				{#if isMacOS}
					<button
						class="btn text-white btn-ghost btn-sm"
						onclick={copySelectedToClipboard}
						title="Copy to Clipboard"
					>
						<Icon icon="lucide:copy" class="h-4 w-4" />
					</button>
				{/if}
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
