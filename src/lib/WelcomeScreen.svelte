<script lang="ts">
	import { getVersion } from '@tauri-apps/api/app';
	import { onMount } from 'svelte';
	import { dialogService } from './services/dialog-service';
	import { appStore } from './stores/app-store.svelte';

	// ファイル選択ハンドラー
	const openFileDialog = async () => {
		const result = await dialogService.openFileDialog();
		if (result) {
			await appStore.actions.transitionToViewer(result);
		}
	};

	// ディレクトリ選択ハンドラー
	const openDirectoryDialog = async () => {
		const result = await dialogService.openDirectoryDialog();
		if (result) {
			await appStore.actions.transitionToGrid(result);
		}
	};

	let version = $state<string>('');

	// バージョン情報を取得（一回だけの初期化処理）
	onMount(async () => {
		try {
			version = await getVersion();
		} catch (error) {
			console.error('Failed to get app version: ' + error);
		}
	});
</script>

<div class="flex h-full flex-col items-center justify-center bg-base-100 text-center">
	<div class="mb-4 text-6xl">📁</div>
	<h2 class="mb-2 text-2xl font-bold">Tauri SD Image Viewer</h2>
	{#if version}
		<p class="mb-2 text-sm text-base-content/50">v{version}</p>
	{/if}
	<p class="mb-6 text-base-content/70">Please select a file or folder</p>
	<div class="flex flex-col gap-4">
		<div class="flex gap-4">
			<button class="btn btn-lg btn-primary" onclick={openFileDialog}> Open Image File </button>
			<button class="btn btn-lg btn-secondary" onclick={openDirectoryDialog}> Open Folder </button>
		</div>
	</div>
</div>
