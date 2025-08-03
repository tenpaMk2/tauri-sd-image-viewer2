<script lang="ts">
	import { open } from '@tauri-apps/plugin-dialog';
	import ImageViewer from '$lib/ImageViewer.svelte';
	import WelcomeScreen from '$lib/WelcomeScreen.svelte';
	import GridView from '$lib/GridView.svelte';
	import type { ImageMetadata } from '$lib/image/types';
	import type { ViewMode } from '$lib/ui/types';
	import { createImageMetadata, getDirectoryFromPath } from '$lib/image/utils';

	let selectedImagePath: string | null = $state(null);
	let imageMetadata: ImageMetadata | null = $state(null);
	let selectedDirectory: string | null = $state(null);
	let viewMode: ViewMode = $state('welcome');

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
				updateSelectedImage(selected);
				selectedDirectory = getDirectoryFromPath(selected);
				viewMode = 'viewer';
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
				selectedDirectory = selected;
				viewMode = 'grid';
			}
		} catch (error) {
			console.error('フォルダ選択エラー:', error);
		}
	};

	const updateSelectedImage = (imagePath: string): void => {
		selectedImagePath = imagePath;
		imageMetadata = createImageMetadata(imagePath);
	};

	const handleImageChange = (newPath: string): void => {
		updateSelectedImage(newPath);
	};

	const handleSwitchToGrid = (): void => {
		if (selectedDirectory) {
			viewMode = 'grid';
		}
	};

	const handleImageSelect = (imagePath: string): void => {
		updateSelectedImage(imagePath);
		viewMode = 'viewer';
	};

	const handleBackToGrid = (): void => {
		viewMode = 'grid';
	};

	const handleBackToWelcome = (): void => {
		viewMode = 'welcome';
		selectedImagePath = null;
		imageMetadata = null;
		selectedDirectory = null;
	};
</script>

<svelte:head>
	<title>画像ビュワー</title>
</svelte:head>

<div class="min-h-screen bg-base-100">
	<main class="h-screen">
		{#if viewMode === 'welcome'}
			<WelcomeScreen {openFileDialog} {openDirectoryDialog} />
		{:else if viewMode === 'grid' && selectedDirectory}
			<GridView
				{selectedDirectory}
				{handleBackToWelcome}
				{openDirectoryDialog}
				{handleImageSelect}
			/>
		{:else if viewMode === 'viewer' && imageMetadata && selectedImagePath}
			<ImageViewer
				metadata={imageMetadata}
				imagePath={selectedImagePath}
				onImageChange={handleImageChange}
				{openFileDialog}
				onBack={selectedDirectory ? handleBackToGrid : handleBackToWelcome}
				onSwitchToGrid={selectedDirectory ? handleSwitchToGrid : undefined}
			/>
		{/if}
	</main>
</div>
