<script lang="ts">
	import { getImageFiles } from './image/image-loader';
	import ImageGrid from './ImageGrid.svelte';

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

	// ImageGridから画像ファイル一覧を受け取る
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
		if (selectedImages.size === 0) return;
		
		const confirmDelete = confirm(`${selectedImages.size}個の画像を削除しますか？\n\n削除された画像は復元できません。`);
		if (!confirmDelete) return;

		try {
			const { remove } = await import('@tauri-apps/plugin-fs');
			
			console.log('削除開始:', Array.from(selectedImages));
			
			let successCount = 0;
			let errorCount = 0;
			const errors: string[] = [];
			
			for (const imagePath of selectedImages) {
				try {
					await remove(imagePath);
					successCount++;
					console.log(`削除成功: ${imagePath}`);
				} catch (fileErr) {
					errorCount++;
					const errorMsg = `${imagePath}: ${fileErr}`;
					errors.push(errorMsg);
					console.error(`削除失敗: ${errorMsg}`);
				}
			}
			
			// エラーがある場合のみユーザーに通知
			if (errorCount > 0) {
				alert(`削除完了: ${successCount}個成功, ${errorCount}個失敗\n\n失敗したファイル:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`);
			} else {
				console.log(`${successCount}個の画像を削除しました。`);
			}
			
			selectedImages = new Set();
			// ImageGridのリフレッシュをトリガー
			refreshTrigger = Date.now();
		} catch (err) {
			console.error('削除処理エラー:', err);
			alert(`削除処理に失敗しました: ${err}`);
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
			{#if imageFiles.length > 0}
				<div class="text-sm opacity-80">
					{imageFiles.length}個の画像
				</div>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			<!-- 選択モード切り替えボタン -->
			<button 
				class="btn btn-sm btn-ghost" 
				onclick={toggleSelectionMode}
				title={isSelectionMode ? '選択モードを終了' : '選択モードに切り替え'}
			>
				{isSelectionMode ? '✓' : '☐'} 選択
			</button>
			
			<!-- 全選択ボタン -->
			{#if isSelectionMode}
				<button 
					class="btn btn-sm btn-ghost" 
					onclick={toggleSelectAll}
					title={selectedImages.size === imageFiles.length ? '全選択解除' : '全選択'}
				>
					{selectedImages.size === imageFiles.length ? '☑' : '☐'} 全選択
				</button>
			{/if}
			
			<button class="btn btn-sm btn-primary" onclick={openDirectoryDialog}>
				別のフォルダを開く
			</button>
		</div>
	</div>

	<!-- グリッド表示 -->
	<div class="flex-1">
		<ImageGrid 
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
{#if selectedImages.size > 0}
	<div class="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 p-4 z-20">
		<div class="flex items-center justify-between max-w-4xl mx-auto">
			<div class="text-white">
				{selectedImages.size}個の画像を選択中
			</div>
			<div class="flex items-center gap-4">
				<button 
					class="btn btn-sm btn-ghost text-white"
					onclick={() => selectedImages = new Set()}
				>
					選択解除
				</button>
				<button 
					class="btn btn-sm btn-error"
					onclick={deleteSelectedImages}
				>
					🗑️ 削除
				</button>
			</div>
		</div>
	</div>
{/if}
