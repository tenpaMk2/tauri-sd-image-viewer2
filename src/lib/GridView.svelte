<script lang="ts">
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
		</div>
		<button class="btn btn-sm btn-primary" onclick={openDirectoryDialog}>
			別のフォルダを開く
		</button>
	</div>

	<!-- グリッド表示 -->
	<div class="flex-1">
		<ImageGrid directoryPath={selectedDirectory} onImageSelect={handleImageSelect} />
	</div>
</div>
