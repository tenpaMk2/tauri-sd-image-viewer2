<script lang="ts">
	import { getImageFiles } from './image/image-loader';
	import ThumbnailGrid from './ThumbnailGrid.svelte';
	import { deleteSelectedImages as performDelete } from './utils/delete-images';

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

	let isSelectionMode = $state<boolean>(false);
	let selectedImages = $state<Set<string>>(new Set());
	let refreshTrigger = $state<number>(0);
	let imageFiles = $state<string[]>([]);

	// ThumbnailGridから画像ファイル一覧を受け取る
	const handleImageFilesLoaded = (files: string[]) => {
		imageFiles = files;
	};

	// 選択モード切り替え
	const toggleSelectionMode = () => {
		isSelectionMode = !isSelectionMode;
		if (!isSelectionMode) {
			selectedImages = new Set();
		}
	};

	// 画像選択/選択解除
	const toggleImageSelection = (imagePath: string) => {
		const newSelection = new Set(selectedImages);
		if (newSelection.has(imagePath)) {
			newSelection.delete(imagePath);
		} else {
			newSelection.add(imagePath);
		}
		selectedImages = newSelection;
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
			// ThumbnailGridのリフレッシュをトリガー
			refreshTrigger = Date.now();
		} catch (err) {
			// エラーはperformDelete内で処理済み
		}
	};
</script>

<div class="flex h-full flex-col">
	<!-- ヘッダー -->
	<div class="flex items-center justify-between bg-base-200 p-4">
		<div class="flex items-center gap-4">
			<button class="btn btn-ghost btn-sm" onclick={handleBackToWelcome} title="ホームに戻る">
				🏠
			</button>
			<h1 class="truncate text-lg font-semibold">
				{selectedDirectory.split('/').pop() || 'フォルダ'}
			</h1>
			{#if 0 < imageFiles.length}
				<div class="text-sm opacity-80">
					{imageFiles.length}個の画像
				</div>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			<!-- 選択モード切り替えボタン -->
			<button
				class="btn btn-ghost btn-sm"
				onclick={toggleSelectionMode}
				title={isSelectionMode ? '選択モードを終了' : '選択モードに切り替え'}
			>
				{isSelectionMode ? '✓' : '☐'} 選択
			</button>

			<!-- 全選択ボタン -->
			{#if isSelectionMode}
				<button
					class="btn btn-ghost btn-sm"
					onclick={toggleSelectAll}
					title={selectedImages.size === imageFiles.length ? '全選択解除' : '全選択'}
				>
					{selectedImages.size === imageFiles.length ? '☑ 全選択解除' : '☐ 全選択'}
				</button>
			{/if}

			<button class="btn btn-sm btn-primary" onclick={openDirectoryDialog}>
				別のフォルダを開く
			</button>
		</div>
	</div>

	<!-- グリッド表示 -->
	<div class="flex-1">
		<ThumbnailGrid
			directoryPath={selectedDirectory}
			onImageSelect={handleImageSelect}
			{isSelectionMode}
			{selectedImages}
			onToggleSelection={toggleImageSelection}
			{refreshTrigger}
			onImageFilesLoaded={handleImageFilesLoaded}
		/>
	</div>
</div>

<!-- 選択時の下部ツールバー -->
{#if 0 < selectedImages.size}
	<div
		class="fixed right-0 bottom-0 left-0 z-20 border-t border-gray-700 bg-gray-900/95 p-4 backdrop-blur-sm"
	>
		<div class="mx-auto flex max-w-4xl items-center justify-between">
			<div class="text-white">
				{selectedImages.size}個の画像を選択中
			</div>
			<div class="flex items-center gap-4">
				<button class="btn btn-sm btn-error" onclick={deleteSelectedImages}> 🗑️ 削除 </button>
			</div>
		</div>
	</div>
{/if}
