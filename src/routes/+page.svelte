<script lang="ts">
	import { open } from '@tauri-apps/plugin-dialog';
	import ImageViewer from '$lib/ImageViewer.svelte';

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

	let selectedImagePath: string | null = $state(null);
	let imageMetadata: ImageMetadata | null = $state(null);

	const openFileDialog = async () => {
		try {
			const selected = await open({
				multiple: false,
				filters: [
					{
						name: 'Image Files',
						extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp']
					}
				]
			});

			if (selected && typeof selected === 'string') {
				updateSelectedImage(selected);
			}
		} catch (error) {
			console.error('ファイル選択エラー:', error);
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
</script>

<svelte:head>
	<title>画像ビュワー</title>
</svelte:head>

<div class="min-h-screen bg-base-100">
	<main class="h-screen">
		{#if imageMetadata && selectedImagePath}
			<ImageViewer
				metadata={imageMetadata}
				imagePath={selectedImagePath}
				onImageChange={handleImageChange}
				{openFileDialog}
			/>
		{:else}
			<div class="flex h-full flex-col items-center justify-center bg-base-100 text-center">
				<div class="mb-4 text-6xl">📁</div>
				<h2 class="mb-2 text-2xl font-bold">画像を選択してください</h2>
				<p class="mb-6 text-base-content/70">
					「ファイルを開く」ボタンをクリックして画像を選択してください
				</p>
				<button class="btn btn-lg btn-primary" onclick={openFileDialog}> ファイルを開く </button>
			</div>
		{/if}
	</main>
</div>
