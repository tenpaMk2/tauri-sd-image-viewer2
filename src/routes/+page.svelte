<script lang="ts">
	import { open } from '@tauri-apps/plugin-dialog';
	import ImageViewer from '$lib/ImageViewer.svelte';
	import ImageGrid from '$lib/ImageGrid.svelte';

	type ImageMetadata = {
		filename: string;
		size: string;
		dimensions: string;
		format: string;
		created: string;
		modified: string;
		camera?: string;
		lens?: string;
		settings?: string;
	};

	type ViewMode = 'welcome' | 'grid' | 'viewer';

	let selectedImagePath: string | null = $state(null);
	let imageMetadata: ImageMetadata | null = $state(null);
	let selectedDirectory: string | null = $state(null);
	let viewMode: ViewMode = $state('welcome');

	const openFileDialog = async () => {
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
				const directory = selected.substring(0, selected.lastIndexOf('/'));
				selectedDirectory = directory;
				viewMode = 'viewer';
			}
		} catch (error) {
			console.error('ファイル選択エラー:', error);
		}
	};

	const openDirectoryDialog = async () => {
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

	const updateSelectedImage = (imagePath: string) => {
		selectedImagePath = imagePath;

		// ファイル情報を取得してメタデータを作成
		const filename = imagePath.split('/').pop() || 'unknown';
		const extension = filename.split('.').pop()?.toUpperCase() || '';

		imageMetadata = {
			filename,
			size: '不明',
			dimensions: '不明',
			format: extension,
			created: new Date().toLocaleString('ja-JP'),
			modified: new Date().toLocaleString('ja-JP')
		};
	};

	const handleImageChange = (newPath: string) => {
		updateSelectedImage(newPath);
	};

	const handleImageSelect = (imagePath: string) => {
		updateSelectedImage(imagePath);
		viewMode = 'viewer';
	};

	const handleBackToGrid = () => {
		viewMode = 'grid';
	};

	const handleBackToWelcome = () => {
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
			<div class="flex h-full flex-col items-center justify-center bg-base-100 text-center">
				<div class="mb-4 text-6xl">📁</div>
				<h2 class="mb-2 text-2xl font-bold">画像ビュワー</h2>
				<p class="mb-6 text-base-content/70">
					ファイルまたはフォルダを選択してください
				</p>
				<div class="flex gap-4">
					<button class="btn btn-lg btn-primary" onclick={openFileDialog}>
						画像ファイルを開く
					</button>
					<button class="btn btn-lg btn-secondary" onclick={openDirectoryDialog}>
						フォルダを開く
					</button>
				</div>
			</div>
		{:else if viewMode === 'grid' && selectedDirectory}
			<div class="flex h-full flex-col">
				<!-- ヘッダー -->
				<div class="flex items-center justify-between bg-base-200 p-4">
					<div class="flex items-center gap-4">
						<button 
							class="btn btn-sm btn-ghost"
							onclick={handleBackToWelcome}
							title="ホームに戻る"
						>
							🏠
						</button>
						<h1 class="text-lg font-semibold truncate">
							{selectedDirectory.split('/').pop() || 'フォルダ'}
						</h1>
					</div>
					<button 
						class="btn btn-sm btn-primary"
						onclick={openDirectoryDialog}
					>
						別のフォルダを開く
					</button>
				</div>
				
				<!-- グリッド表示 -->
				<div class="flex-1">
					<ImageGrid 
						directoryPath={selectedDirectory} 
						onImageSelect={handleImageSelect}
					/>
				</div>
			</div>
		{:else if viewMode === 'viewer' && imageMetadata && selectedImagePath}
			<div class="relative h-full">
				<!-- ビューアーヘッダー -->
				<div class="absolute top-0 left-0 right-0 z-10 bg-base-200/90 backdrop-blur">
					<div class="flex items-center gap-2 p-2">
						{#if selectedDirectory}
							<button 
								class="btn btn-sm btn-ghost"
								onclick={handleBackToGrid}
								title="グリッドに戻る"
							>
								🏠 戻る
							</button>
						{:else}
							<button 
								class="btn btn-sm btn-ghost"
								onclick={handleBackToWelcome}
								title="ホームに戻る"
							>
								🏠 ホーム
							</button>
						{/if}
						<span class="text-sm font-medium truncate">
							{imageMetadata.filename}
						</span>
					</div>
				</div>
				
				<!-- 画像ビューア -->
				<ImageViewer
					metadata={imageMetadata}
					imagePath={selectedImagePath}
					onImageChange={handleImageChange}
					{openFileDialog}
				/>
			</div>
		{/if}
	</main>
</div>
