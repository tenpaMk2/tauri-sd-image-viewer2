<script lang="ts">
	import { asset } from '$app/paths';
	import OptionsModal from '$lib/components/OptionsModal.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import IconTextButton from '$lib/components/ui/IconTextButton.svelte';
	import { navigateToGrid, navigateToViewer } from '$lib/services/app-navigation';
	import { dialogService } from '$lib/services/dialog';
	import { app } from '@tauri-apps/api';

	// オプションモーダル状態
	let isOptionsModalOpen = $state(false);

	// ファイル選択ハンドラー
	const openFileDialog = async () => {
		const result = await dialogService.openFileDialog();
		if (result) {
			navigateToViewer(result);
		}
	};

	// ディレクトリ選択ハンドラー
	const openDirectoryDialog = async () => {
		const result = await dialogService.openDirectoryDialog();
		if (result) {
			navigateToGrid(result);
		}
	};

	// オプションモーダル操作
	const toggleOptionsModal = () => {
		isOptionsModalOpen = !isOptionsModalOpen;
	};

	const closeOptionsModal = () => {
		isOptionsModalOpen = false;
	};

	const versionPromise = app.getVersion();
</script>

<svelte:head>
	<title>Image Viewer</title>
</svelte:head>

<div class="hero min-h-screen bg-base-200">
	<!-- Options button positioned at top-right -->
	<div class="absolute top-4 right-4">
		<IconButton
			icon="settings"
			title="Options"
			size="medium"
			onClick={toggleOptionsModal}
			extraClass="btn-ghost"
		/>
	</div>

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
				<IconTextButton
					text="Open Image File"
					icon="image-plus"
					size="large"
					variant="primary"
					onClick={openFileDialog}
				/>
				<IconTextButton
					text="Open Folder"
					icon="folder"
					size="large"
					variant="secondary"
					onClick={openDirectoryDialog}
				/>
			</div>
		</div>
	</div>
</div>

<!-- Options Modal -->
<OptionsModal {isOptionsModalOpen} onClose={closeOptionsModal} />
