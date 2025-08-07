<script lang="ts">
	import Icon from '@iconify/svelte';
	import { basename } from '@tauri-apps/api/path';
	import ThumbnailGrid from './ThumbnailGrid.svelte';
	import { createGridViewHook } from './hooks/use-grid-view';

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

	const gridView = createGridViewHook();
</script>

<div class="flex h-full flex-col">
	<!-- ヘッダー -->
	<div class="flex items-center justify-between bg-base-200 p-4">
		<div class="flex items-center gap-4">
			<button class="btn btn-ghost btn-sm" onclick={handleBackToWelcome} title="ホームに戻る">
				<Icon icon="lucide:home" class="h-4 w-4" />
			</button>
			{#await basename(selectedDirectory) then folderName}
				<h1 class="truncate text-lg font-semibold">
					{folderName || 'フォルダ'}
				</h1>
			{/await}
			{#if 0 < gridView.state.imageFiles.length}
				<div class="text-sm opacity-80">
					{gridView.state.imageFiles.length}個の画像
				</div>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			<!-- 選択モード切り替えボタン -->
			<button
				class="btn btn-ghost btn-sm"
				onclick={gridView.actions.toggleSelectionMode}
				title={gridView.state.isSelectionMode ? '選択モードを終了' : '選択モードに切り替え'}
			>
				<Icon
					icon={gridView.state.isSelectionMode ? 'lucide:check-square' : 'lucide:square'}
					class="mr-1 h-4 w-4"
				/>
				選択
			</button>

			<!-- 全選択ボタン -->
			{#if gridView.state.isSelectionMode}
				<button
					class="btn btn-ghost btn-sm"
					onclick={gridView.actions.toggleSelectAll}
					title={gridView.state.selectedImages.size === gridView.state.imageFiles.length
						? '全選択解除'
						: '全選択'}
				>
					<Icon
						icon={gridView.state.selectedImages.size === gridView.state.imageFiles.length
							? 'lucide:check-square-2'
							: 'lucide:square'}
						class="mr-1 h-4 w-4"
					/>
					{gridView.state.selectedImages.size === gridView.state.imageFiles.length
						? '全選択解除'
						: '全選択'}
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
			isSelectionMode={gridView.state.isSelectionMode}
			selectedImages={gridView.state.selectedImages}
			onToggleSelection={gridView.actions.toggleImageSelection}
			refreshTrigger={gridView.state.refreshTrigger}
			onImageFilesLoaded={gridView.actions.handleImageFilesLoaded}
		/>
	</div>
</div>

<!-- 選択時の下部ツールバー -->
{#if 0 < gridView.state.selectedImages.size}
	<div
		class="fixed right-0 bottom-0 left-0 z-20 border-t border-gray-700 bg-gray-900/95 p-4 backdrop-blur-sm"
	>
		<div class="mx-auto flex max-w-4xl items-center justify-between">
			<div class="text-white">
				{gridView.state.selectedImages.size}個の画像を選択中
			</div>
			<div class="flex items-center gap-4">
				<button class="btn btn-sm btn-error" onclick={gridView.actions.deleteSelectedImages}>
					<Icon icon="lucide:trash-2" class="h-4 w-4" />
					削除
				</button>
			</div>
		</div>
	</div>
{/if}
