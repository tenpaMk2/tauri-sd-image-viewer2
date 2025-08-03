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
	}
	
	let selectedImagePath: string | null = $state(null);
	let imageMetadata: ImageMetadata | null = $state(null);
	
	const openFileDialog = async () => {
		try {
			const selected = await open({
				multiple: false,
				filters: [{
					name: 'PNG Images',
					extensions: ['png']
				}]
			});
			
			if (selected && typeof selected === 'string') {
				selectedImagePath = selected;
				
				// ファイル情報を取得してメタデータを作成
				const filename = selected.split('/').pop() || 'unknown.png';
				imageMetadata = {
					filename,
					size: '不明',
					dimensions: '不明',
					format: 'PNG',
					created: new Date().toLocaleString('ja-JP'),
					modified: new Date().toLocaleString('ja-JP')
				};
			}
		} catch (error) {
			console.error('ファイル選択エラー:', error);
		}
	};
</script>

<svelte:head>
	<title>画像ビュワー</title>
</svelte:head>

<div class="min-h-screen bg-base-100">
	<div class="navbar bg-base-200 shadow-lg">
		<div class="flex-1">
			<h1 class="text-xl font-bold">画像ビュワー</h1>
		</div>
		<div class="flex-none">
			<button class="btn btn-primary" onclick={openFileDialog}>
				ファイルを開く
			</button>
		</div>
	</div>
	
	<main class="container mx-auto p-4">
		{#if imageMetadata && selectedImagePath}
			<ImageViewer metadata={imageMetadata} imagePath={selectedImagePath} />
		{:else}
			<div class="flex flex-col items-center justify-center h-[60vh] text-center">
				<div class="text-6xl mb-4">📁</div>
				<h2 class="text-2xl font-bold mb-2">画像を選択してください</h2>
				<p class="text-base-content/70 mb-6">「ファイルを開く」ボタンをクリックしてPNG画像を選択してください</p>
				<button class="btn btn-primary btn-lg" onclick={openFileDialog}>
					ファイルを開く
				</button>
			</div>
		{/if}
	</main>
</div>