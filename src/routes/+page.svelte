<script lang="ts">
	import { open } from '@tauri-apps/plugin-dialog';
	import ImageViewer from '$lib/ImageViewer.svelte';
	import WelcomeScreen from '$lib/WelcomeScreen.svelte';
	import GridView from '$lib/GridView.svelte';
	import type { ImageMetadata } from '$lib/image/types';
	import type { ViewMode } from '$lib/ui/types';
	import { createImageMetadata, getDirectoryFromPath } from '$lib/image/utils';

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
				appState.imageMetadata = createImageMetadata(selected);
				appState.selectedDirectory = getDirectoryFromPath(selected);
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
	const updateSelectedImage = (imagePath: string): void => {
		appState.selectedImagePath = imagePath;
		appState.imageMetadata = createImageMetadata(imagePath);
	};

	const handleImageChange = (newPath: string): void => {
		updateSelectedImage(newPath);
	};

	const handleSwitchToGrid = (): void => {
		if (appState.selectedDirectory) {
			appState.viewMode = 'grid';
		}
	};

	const handleImageSelect = (imagePath: string): void => {
		updateSelectedImage(imagePath);
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
			<GridView
				selectedDirectory={appState.selectedDirectory}
				{handleBackToWelcome}
				{openDirectoryDialog}
				{handleImageSelect}
			/>
		{:else if appState.viewMode === 'viewer' && appState.imageMetadata && appState.selectedImagePath}
			<ImageViewer
				metadata={appState.imageMetadata}
				imagePath={appState.selectedImagePath}
				onImageChange={handleImageChange}
				{openFileDialog}
				onBack={appState.selectedDirectory ? handleBackToGrid : handleBackToWelcome}
				onSwitchToGrid={appState.selectedDirectory ? handleSwitchToGrid : undefined}
			/>
		{/if}
	</main>
</div>
