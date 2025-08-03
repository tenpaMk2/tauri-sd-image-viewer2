<script lang="ts">
	import { onMount } from 'svelte';
	import { getImageFiles, loadImage, type ImageData } from './image-loader';

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

	const {
		metadata,
		imagePath,
		onImageChange,
		openFileDialog
	}: {
		metadata: ImageMetadata;
		imagePath: string;
		onImageChange: (newPath: string) => void;
		openFileDialog: () => void;
	} = $props();

	let imageUrl = $state<string>('');
	let isLoading = $state<boolean>(true);
	let error = $state<string>('');
	let imageFiles = $state<string[]>([]);
	let currentIndex = $state<number>(0);
	let isNavigating = $state<boolean>(false);

	const loadCurrentImage = async (path: string) => {
		try {
			isLoading = true;
			error = '';
			const imageData: ImageData = await loadImage(path);
			imageUrl = imageData.url;
		} catch (err) {
			error = err instanceof Error ? err.message : '画像の読み込みに失敗しました';
			console.error('Failed to load image:', err);
		} finally {
			isLoading = false;
		}
	};

	const navigateToImage = async (index: number) => {
		if (index >= 0 && index < imageFiles.length && !isNavigating) {
			isNavigating = true;
			currentIndex = index;
			const newPath = imageFiles[index];
			await loadCurrentImage(newPath);
			onImageChange(newPath);
			isNavigating = false;
		}
	};

	const goToPrevious = async () => {
		if (currentIndex > 0 && !isNavigating) {
			await navigateToImage(currentIndex - 1);
		}
	};

	const goToNext = async () => {
		if (currentIndex < imageFiles.length - 1 && !isNavigating) {
			await navigateToImage(currentIndex + 1);
		}
	};

	const initializeImages = async (path: string) => {
		// 同一ディレクトリの画像ファイル一覧を取得
		imageFiles = await getImageFiles(path);
		currentIndex = imageFiles.findIndex((file) => file === path);

		// 初期画像を読み込み
		await loadCurrentImage(path);
	};

	onMount(async () => {
		await initializeImages(imagePath);
	});

	// imagePathが変更された時に再初期化
	$effect(() => {
		if (imagePath) {
			initializeImages(imagePath);
		}
	});
</script>

<div class="relative flex h-screen">
	<!-- 画像表示エリア (全面) -->
	<div class="relative flex-1 bg-black">
		<!-- オーバーレイツールバー -->
		<div
			class="absolute top-0 right-0 left-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4"
		>
			<div class="flex items-center justify-between text-white">
				<div class="flex items-center gap-4">
					<h1 class="text-xl font-bold">画像ビュワー</h1>
					{#if imageFiles.length > 1}
						<div class="text-sm opacity-80">
							{currentIndex + 1} / {imageFiles.length}
						</div>
					{/if}
				</div>
				<button class="btn btn-sm btn-primary" onclick={openFileDialog}> ファイルを開く </button>
			</div>
		</div>

		<!-- 画像コンテナ -->
		<div class="absolute inset-0 flex items-center justify-center">
			{#if isLoading}
				<div class="flex flex-col items-center gap-2 text-white">
					<span class="loading loading-lg loading-spinner"></span>
					<span class="opacity-80">画像を読み込み中...</span>
				</div>
			{:else if error}
				<div class="flex flex-col items-center gap-2 text-red-400">
					<svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
						></path>
					</svg>
					<span class="text-center">{error}</span>
				</div>
			{:else if imageUrl}
				<img src={imageUrl} alt={metadata.filename} class="max-h-full max-w-full object-contain" />
			{/if}
		</div>

		<!-- ナビゲーションボタン -->
		{#if imageFiles.length > 1}
			<!-- 前の画像ボタン -->
			{#if currentIndex > 0}
				<div class="absolute top-0 left-6 flex h-full items-center">
					<button
						class="btn btn-circle btn-ghost btn-lg"
						class:btn-disabled={isNavigating}
						aria-label="前の画像"
						onclick={goToPrevious}
					>
						{#if isNavigating}
							<span class="loading loading-sm loading-spinner"></span>
						{:else}
							<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 19l-7-7 7-7"
								/>
							</svg>
						{/if}
					</button>
				</div>
			{/if}

			<!-- 次の画像ボタン -->
			{#if currentIndex < imageFiles.length - 1}
				<div class="absolute top-0 right-6 flex h-full items-center">
					<button
						class="btn btn-circle btn-ghost btn-lg"
						class:btn-disabled={isNavigating}
						aria-label="次の画像"
						onclick={goToNext}
					>
						{#if isNavigating}
							<span class="loading loading-sm loading-spinner"></span>
						{:else}
							<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/>
							</svg>
						{/if}
					</button>
				</div>
			{/if}
		{/if}
	</div>

	<!-- 右側: 情報ペイン (固定幅) -->
	<div class="w-80 overflow-y-auto bg-base-200 shadow-2xl">
		<div class="p-4">
			<h2 class="mb-4 text-lg font-bold">画像情報</h2>
			<div class="space-y-4">
				<!-- 基本情報 -->
				<div class="rounded-lg bg-base-300 p-4">
					<h3 class="mb-3 text-base font-semibold">基本情報</h3>
					<div class="space-y-2 text-sm">
						<div class="flex flex-col gap-1">
							<div class="text-base-content/70">ファイル名:</div>
							<div class="font-mono text-xs break-all">{metadata.filename}</div>
						</div>

						<div class="flex justify-between">
							<div class="text-base-content/70">サイズ:</div>
							<div>{metadata.size}</div>
						</div>

						<div class="flex justify-between">
							<div class="text-base-content/70">解像度:</div>
							<div>{metadata.dimensions}</div>
						</div>

						<div class="flex justify-between">
							<div class="text-base-content/70">形式:</div>
							<div>{metadata.format}</div>
						</div>
					</div>
				</div>

				<!-- 日時情報 -->
				<div class="rounded-lg bg-base-300 p-4">
					<h3 class="mb-3 text-base font-semibold">日時情報</h3>
					<div class="space-y-2 text-sm">
						<div class="flex flex-col gap-1">
							<div class="text-base-content/70">作成日時:</div>
							<div class="font-mono text-xs">{metadata.created}</div>
						</div>

						<div class="flex flex-col gap-1">
							<div class="text-base-content/70">更新日時:</div>
							<div class="font-mono text-xs">{metadata.modified}</div>
						</div>
					</div>
				</div>

				<!-- 撮影情報 (任意) -->
				{#if metadata.camera || metadata.lens || metadata.settings}
					<div class="rounded-lg bg-base-300 p-4">
						<h3 class="mb-3 text-base font-semibold">撮影情報</h3>
						<div class="space-y-2 text-sm">
							{#if metadata.camera}
								<div class="flex justify-between">
									<div class="text-base-content/70">カメラ:</div>
									<div>{metadata.camera}</div>
								</div>
							{/if}

							{#if metadata.lens}
								<div class="flex justify-between">
									<div class="text-base-content/70">レンズ:</div>
									<div>{metadata.lens}</div>
								</div>
							{/if}

							{#if metadata.settings}
								<div class="flex flex-col gap-1">
									<div class="text-base-content/70">設定:</div>
									<div class="font-mono text-xs">{metadata.settings}</div>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
