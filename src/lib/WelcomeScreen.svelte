<script lang="ts">
	const {
		openFileDialog,
		openDirectoryDialog
	}: {
		openFileDialog: () => void;
		openDirectoryDialog: () => void;
	} = $props();
</script>

<div class="flex h-full flex-col items-center justify-center bg-base-100 text-center">
	<div class="mb-4 text-6xl">📁</div>
	<h2 class="mb-2 text-2xl font-bold">画像ビュワー</h2>
	<p class="mb-6 text-base-content/70">ファイルまたはフォルダを選択してください</p>
	<div class="flex gap-4">
		<button class="btn btn-lg btn-primary" onclick={openFileDialog}> 画像ファイルを開く </button>
		<button class="btn btn-lg btn-secondary" onclick={openDirectoryDialog}> フォルダを開く </button>
	</div>
</div>
