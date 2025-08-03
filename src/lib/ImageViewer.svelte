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
		onImageChange
	}: {
		metadata: ImageMetadata;
		imagePath: string;
		onImageChange: (newPath: string) => void;
	} = $props();

	let imageUrl = $state<string>('');
	let isLoading = $state<boolean>(true);
	let error = $state<string>('');
	let imageFiles = $state<string[]>([]);
	let currentIndex = $state<number>(0);

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
		if (index >= 0 && index < imageFiles.length) {
			currentIndex = index;
			const newPath = imageFiles[index];
			await loadCurrentImage(newPath);
			onImageChange(newPath);
		}
	};

	const goToPrevious = async () => {
		if (currentIndex > 0) {
			await navigateToImage(currentIndex - 1);
		}
	};

	const goToNext = async () => {
		if (currentIndex < imageFiles.length - 1) {
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

<div class="grid h-[calc(100vh-8rem)] grid-cols-1 gap-6 lg:grid-cols-2">
	<!-- 左側: 画像表示エリア -->
	<div class="card bg-base-200 shadow-xl">
		<div class="card-body p-4">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="card-title text-lg">画像表示</h2>
				{#if imageFiles.length > 1}
					<div class="text-sm text-base-content/70">
						{currentIndex + 1} / {imageFiles.length}
					</div>
				{/if}
			</div>
			<div
				class="relative flex flex-1 items-center justify-center overflow-hidden rounded-lg bg-base-300"
			>
				{#if isLoading}
					<div class="flex flex-col items-center gap-2">
						<span class="loading loading-lg loading-spinner"></span>
						<span class="text-base-content/70">画像を読み込み中...</span>
					</div>
				{:else if error}
					<div class="flex flex-col items-center gap-2 text-error">
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
					<img
						src={imageUrl}
						alt={metadata.filename}
						class="max-h-full max-w-full object-contain"
					/>

					<!-- ナビゲーションボタン -->
					{#if imageFiles.length > 1}
						<!-- 前の画像ボタン -->
						{#if currentIndex > 0}
							<button
								class="btn absolute top-1/2 left-4 btn-circle -translate-y-1/2 transform opacity-70 transition-opacity btn-sm btn-primary hover:opacity-100"
								aria-label="前の画像"
								onclick={goToPrevious}
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 19l-7-7 7-7"
									/>
								</svg>
							</button>
						{/if}

						<!-- 次の画像ボタン -->
						{#if currentIndex < imageFiles.length - 1}
							<button
								class="btn absolute top-1/2 right-4 btn-circle -translate-y-1/2 transform opacity-70 transition-opacity btn-sm btn-primary hover:opacity-100"
								aria-label="次の画像"
								onclick={goToNext}
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 5l7 7-7 7"
									/>
								</svg>
							</button>
						{/if}
					{/if}
				{/if}
			</div>
		</div>
	</div>

	<!-- 右側: メタ情報表示エリア -->
	<div class="card bg-base-200 shadow-xl">
		<div class="card-body p-4">
			<h2 class="mb-4 card-title text-lg">画像情報</h2>
			<div class="space-y-4">
				<!-- 基本情報 -->
				<div class="rounded-lg bg-base-300 p-4">
					<h3 class="mb-3 text-base font-semibold">基本情報</h3>
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
				<div class="rounded-lg bg-base-300 p-4">
					<h3 class="mb-3 text-base font-semibold">日時情報</h3>
					<div class="grid grid-cols-2 gap-2 text-sm">
						<div class="text-base-content/70">作成日時:</div>
						<div class="font-mono text-xs">{metadata.created}</div>

						<div class="text-base-content/70">更新日時:</div>
						<div class="font-mono text-xs">{metadata.modified}</div>
					</div>
				</div>

				<!-- 撮影情報 (任意) -->
				{#if metadata.camera || metadata.lens || metadata.settings}
					<div class="rounded-lg bg-base-300 p-4">
						<h3 class="mb-3 text-base font-semibold">撮影情報</h3>
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
