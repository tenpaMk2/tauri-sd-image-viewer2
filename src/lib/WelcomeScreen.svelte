<script lang="ts">
	import { dialogService } from '$lib/services/dialog';
	import { transitionToViewer, transitionToGrid } from '$lib/services/app-transitions';
	import { getVersion } from '@tauri-apps/api/app';

	// ファイル選択ハンドラー
	const openFileDialog = async () => {
		const result = await dialogService.openFileDialog();
		if (result) {
			transitionToViewer(result);
		}
	};

	// ディレクトリ選択ハンドラー
	const openDirectoryDialog = async () => {
		const result = await dialogService.openDirectoryDialog();
		if (result) {
			transitionToGrid(result);
		}
	};

	const version = getVersion();
</script>

<div class="flex h-full flex-col items-center justify-center bg-base-100 text-center">
	<div class="mb-4 text-6xl">📁</div>
	<h2 class="mb-2 text-2xl font-bold">Tauri SD Image Viewer</h2>
	{#await version}
		<p class="mb-2 text-sm text-base-content/50">v{version}</p>
	{/await}
	<p class="mb-6 text-base-content/70">Please select a file or folder</p>
	<div class="flex flex-col gap-4">
		<div class="flex gap-4">
			<button class="btn btn-lg btn-primary" onclick={openFileDialog}> Open Image File </button>
			<button class="btn btn-lg btn-secondary" onclick={openDirectoryDialog}> Open Folder </button>
		</div>
	</div>
</div>
