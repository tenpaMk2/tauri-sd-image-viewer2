<script lang="ts">
	import { goto } from '$app/navigation';
	import { asset } from '$app/paths';
	import { dialogService } from '$lib/services/dialog';
	import Icon from '@iconify/svelte';
	import { app } from '@tauri-apps/api';

	// ファイル選択ハンドラー
	const openFileDialog = async () => {
		const result = await dialogService.openFileDialog();
		if (result) {
			goto(`/viewer/${encodeURIComponent(result)}`);
		}
	};

	// ディレクトリ選択ハンドラー
	const openDirectoryDialog = async () => {
		const result = await dialogService.openDirectoryDialog();
		if (result) {
			goto(`/grid/${encodeURIComponent(result)}`);
		}
	};

	const versionPromise = app.getVersion();
</script>

<svelte:head>
	<title>Image Viewer</title>
</svelte:head>

<div class="hero min-h-screen bg-base-200">
	<div class="hero-content flex-row">
		<img src={asset('/icon.png')} alt="App Icon" class=" w-56 shadow-lg" />
		<div>
			{#await versionPromise}
				<h1 class="text-4xl font-bold">Tauri SD Image Viewer</h1>
			{:then version}
				<h1 class="text-4xl font-bold">Tauri SD Image Viewer v{version}</h1>
			{/await}
			<p class="my-6 text-base-content/70">Please select a file or folder</p>
			<div class="flex gap-4">
				<button class="btn btn-lg btn-primary" onclick={openFileDialog}>
					<Icon icon="lucide:image-plus" class="mr-2 h-5 w-5" />
					Open Image File
				</button>
				<button class="btn btn-lg btn-secondary" onclick={openDirectoryDialog}>
					<Icon icon="lucide:folder" class="mr-2 h-5 w-5" />
					Open Folder
				</button>
			</div>
		</div>
	</div>
</div>
