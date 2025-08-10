<script lang="ts">
	import { getVersion } from '@tauri-apps/api/app';

	const {
		openFileDialog,
		openDirectoryDialog
	}: {
		openFileDialog: () => void;
		openDirectoryDialog: () => void;
	} = $props();

	let version = $state<string>('');

	// バージョン情報を取得
	$effect(() => {
		const loadVersion = async () => {
			try {
				version = await getVersion();
			} catch (error) {
				console.error('Failed to get app version: ' + error);
			}
		};

		loadVersion();
	});
</script>

<div class="flex h-full flex-col items-center justify-center bg-base-100 text-center">
	<div class="mb-4 text-6xl">📁</div>
	<h2 class="mb-2 text-2xl font-bold">Tauri SD Image Viewer</h2>
	{#if version}
		<p class="mb-2 text-sm text-base-content/50">v{version}</p>
	{/if}
	<p class="mb-6 text-base-content/70">Please select a file or folder</p>
	<div class="flex gap-4">
		<button class="btn btn-lg btn-primary" onclick={openFileDialog}> Open Image File </button>
		<button class="btn btn-lg btn-secondary" onclick={openDirectoryDialog}> Open Folder </button>
	</div>
</div>
