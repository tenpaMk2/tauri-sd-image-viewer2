<script lang="ts">
	import { loadImage, type ImageData } from './image-loader';
	import { onMount } from 'svelte';
	
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
	
	const { metadata, imagePath }: { metadata: ImageMetadata; imagePath: string } = $props();
	
	let imageUrl = $state<string>('');
	let isLoading = $state<boolean>(true);
	let error = $state<string>('');
	
	onMount(async () => {
		try {
			isLoading = true;
			error = '';
			const imageData: ImageData = await loadImage(imagePath);
			imageUrl = imageData.url;
		} catch (err) {
			error = err instanceof Error ? err.message : '画像の読み込みに失敗しました';
			console.error('Failed to load image:', err);
		} finally {
			isLoading = false;
		}
	});
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-8rem)]">
	<!-- 左側: 画像表示エリア -->
	<div class="card bg-base-200 shadow-xl">
		<div class="card-body p-4">
			<h2 class="card-title text-lg mb-4">画像表示</h2>
			<div class="flex-1 flex items-center justify-center bg-base-300 rounded-lg overflow-hidden">
				{#if isLoading}
					<div class="flex flex-col items-center gap-2">
						<span class="loading loading-spinner loading-lg"></span>
						<span class="text-base-content/70">画像を読み込み中...</span>
					</div>
				{:else if error}
					<div class="flex flex-col items-center gap-2 text-error">
						<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
						</svg>
						<span class="text-center">{error}</span>
					</div>
				{:else if imageUrl}
					<img 
						src={imageUrl} 
						alt={metadata.filename}
						class="max-w-full max-h-full object-contain"
					/>
				{/if}
			</div>
		</div>
	</div>
	
	<!-- 右側: メタ情報表示エリア -->
	<div class="card bg-base-200 shadow-xl">
		<div class="card-body p-4">
			<h2 class="card-title text-lg mb-4">画像情報</h2>
			<div class="space-y-4">
				<!-- 基本情報 -->
				<div class="bg-base-300 p-4 rounded-lg">
					<h3 class="font-semibold text-base mb-3">基本情報</h3>
					<div class="grid grid-cols-2 gap-2 text-sm">
						<div class="text-base-content/70">ファイル名:</div>
						<div class="font-mono">{metadata.filename}</div>
						
						<div class="text-base-content/70">サイズ:</div>
						<div>{metadata.size}</div>
						
						<div class="text-base-content/70">解像度:</div>
						<div>{metadata.dimensions}</div>
						
						<div class="text-base-content/70">形式:</div>
						<div>{metadata.format}</div>
					</div>
				</div>
				
				<!-- 日時情報 -->
				<div class="bg-base-300 p-4 rounded-lg">
					<h3 class="font-semibold text-base mb-3">日時情報</h3>
					<div class="grid grid-cols-2 gap-2 text-sm">
						<div class="text-base-content/70">作成日時:</div>
						<div class="font-mono text-xs">{metadata.created}</div>
						
						<div class="text-base-content/70">更新日時:</div>
						<div class="font-mono text-xs">{metadata.modified}</div>
					</div>
				</div>
				
				<!-- 撮影情報 (任意) -->
				{#if metadata.camera || metadata.lens || metadata.settings}
					<div class="bg-base-300 p-4 rounded-lg">
						<h3 class="font-semibold text-base mb-3">撮影情報</h3>
						<div class="grid grid-cols-2 gap-2 text-sm">
							{#if metadata.camera}
								<div class="text-base-content/70">カメラ:</div>
								<div>{metadata.camera}</div>
							{/if}
							
							{#if metadata.lens}
								<div class="text-base-content/70">レンズ:</div>
								<div>{metadata.lens}</div>
							{/if}
							
							{#if metadata.settings}
								<div class="text-base-content/70">設定:</div>
								<div class="font-mono text-xs">{metadata.settings}</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>