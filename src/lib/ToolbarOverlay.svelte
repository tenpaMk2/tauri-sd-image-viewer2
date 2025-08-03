<script lang="ts">
	const {
		imageFiles,
		currentIndex,
		openFileDialog
	}: {
		imageFiles: string[];
		currentIndex: number;
		openFileDialog: () => void;
	} = $props();
</script>

<!-- オーバーレイツールバー -->
<div
	class="absolute top-0 right-0 left-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4"
>
	<div class="flex items-center justify-between text-white">
		<div class="flex items-center gap-4">
			<h1 class="text-xl font-bold">画像ビュワー</h1>
			{#if imageFiles.length > 1}
				<div class="text-sm opacity-80">
					{currentIndex + 1} / {imageFiles.length}
				</div>
			{/if}
		</div>
		<button class="btn btn-sm btn-primary" onclick={openFileDialog}> ファイルを開く </button>
	</div>
</div>