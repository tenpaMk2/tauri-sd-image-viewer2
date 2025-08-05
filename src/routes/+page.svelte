<script lang="ts">
	import GridPage from '$lib/GridPage.svelte';
	import type { ImageMetadata } from '$lib/image/types';
	import { createImageMetadata, getDirectoryFromPath } from '$lib/image/utils';
	import type { ViewMode } from '$lib/ui/types';
	import ViewerPage from '$lib/ViewerPage.svelte';
	import WelcomeScreen from '$lib/WelcomeScreen.svelte';
	import { open } from '@tauri-apps/plugin-dialog';

	// アプリケーション全体の状態を統合
	type AppState = {
		viewMode: ViewMode;
		selectedImagePath: string | null;
		imageMetadata: ImageMetadata | null;
		selectedDirectory: string | null;
	};

	let appState = $state<AppState>({
		viewMode: 'welcome',
		selectedImagePath: null,
		imageMetadata: null,
		selectedDirectory: null
	});

	const openFileDialog = async (): Promise<void> => {
		try {
			const selected = await open({
				multiple: false,
				filters: [
					{
						name: 'Image Files',
						extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'avif']
					}
				]
			});

			if (selected && typeof selected === 'string') {
				appState.selectedImagePath = selected;
				appState.imageMetadata = await createImageMetadata(selected);
				appState.selectedDirectory = await getDirectoryFromPath(selected);
				appState.viewMode = 'viewer';
			}
		} catch (error) {
			console.error('ファイル選択エラー:', error);
		}
	};

	const openDirectoryDialog = async (): Promise<void> => {
		try {
			const selected = await open({
				directory: true,
				multiple: false
			});

			if (selected && typeof selected === 'string') {
				appState.selectedDirectory = selected;
				appState.viewMode = 'grid';
			}
		} catch (error) {
			console.error('フォルダ選択エラー:', error);
		}
	};

	// 状態更新関数を統合
	const updateSelectedImage = async (imagePath: string): Promise<void> => {
		console.log('メタデータ更新開始:', imagePath);
		appState.selectedImagePath = imagePath;
		const newMetadata = await createImageMetadata(imagePath);
		console.log('メタデータ更新完了:', { sdParameters: newMetadata.sdParameters, exifRating: newMetadata.exifInfo?.rating });
		appState.imageMetadata = newMetadata;
	};

	const handleImageChange = async (newPath: string): Promise<void> => {
		await updateSelectedImage(newPath);
	};

	const handleSwitchToGrid = (): void => {
		if (appState.selectedDirectory) {
			appState.viewMode = 'grid';
		}
	};

	const handleImageSelect = async (imagePath: string): Promise<void> => {
		await updateSelectedImage(imagePath);
		appState.viewMode = 'viewer';
	};

	const handleBackToGrid = (): void => {
		appState.viewMode = 'grid';
	};

	const handleBackToWelcome = (): void => {
		appState.viewMode = 'welcome';
		appState.selectedImagePath = null;
		appState.imageMetadata = null;
		appState.selectedDirectory = null;
	};
</script>

<svelte:head>
	<title>画像ビュワー</title>
</svelte:head>

<div class="min-h-screen bg-base-100">
	<main class="h-screen">
		{#if appState.viewMode === 'welcome'}
			<WelcomeScreen {openFileDialog} {openDirectoryDialog} />
		{:else if appState.viewMode === 'grid' && appState.selectedDirectory}
			<GridPage
				selectedDirectory={appState.selectedDirectory}
				{handleBackToWelcome}
				{openDirectoryDialog}
				{handleImageSelect}
			/>
		{:else if appState.viewMode === 'viewer' && appState.imageMetadata && appState.selectedImagePath}
			<ViewerPage
				metadata={appState.imageMetadata}
				imagePath={appState.selectedImagePath}
				onImageChange={handleImageChange}
				{openFileDialog}
				onSwitchToGrid={appState.selectedDirectory ? handleSwitchToGrid : undefined}
			/>
		{/if}
	</main>
</div>
