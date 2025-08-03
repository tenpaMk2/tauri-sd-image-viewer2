<script lang="ts">
	import { onMount } from 'svelte';
	import { invoke } from '@tauri-apps/api/core';
	import { getImageFiles } from './image/image-loader';
	import type { BatchThumbnailResult } from './image/types';

	const {
		directoryPath,
		onImageSelect,
		isSelectionMode = false,
		selectedImages = new Set(),
		onToggleSelection,
		refreshTrigger = 0,
		onImageFilesLoaded
	}: {
		directoryPath: string;
		onImageSelect: (imagePath: string) => void;
		isSelectionMode?: boolean;
		selectedImages?: Set<string>;
		onToggleSelection?: (imagePath: string) => void;
		refreshTrigger?: number;
		onImageFilesLoaded?: (files: string[]) => void;
	} = $props();

	let imageFiles = $state<string[]>([]);
	let thumbnails = $state<Map<string, string>>(new Map());
	let isLoading = $state<boolean>(true);
	let error = $state<string>('');
	let loadedCount = $state<number>(0);
	let isProcessing = $state<boolean>(false);
	let lastRefreshTrigger = $state<number>(0);

	const loadImageGrid = async () => {
		if (isProcessing) {
			console.log('サムネイル処理中のため、スキップします');
			return;
		}

		try {
			isProcessing = true;
			isLoading = true;
			error = '';
			loadedCount = 0;
			thumbnails.clear();

			// ディレクトリ内の画像ファイル一覧を取得
			imageFiles = await getImageFiles(directoryPath);

			// 親コンポーネントに画像ファイル一覧を通知
			if (onImageFilesLoaded) {
				onImageFilesLoaded(imageFiles);
			}

			if (imageFiles.length === 0) {
				error = '画像ファイルが見つかりません';
				return;
			}

			// チャンク単位でサムネイル生成（プログレス表示のため）
			console.log('サムネイル生成開始:', imageFiles.length, '個のファイル');

			await loadThumbnailsInChunks(imageFiles);
		} catch (err) {
			error = err instanceof Error ? err.message : 'サムネイルの読み込みに失敗しました';
			console.error('Failed to load thumbnails:', err);
		} finally {
			isLoading = false;
			isProcessing = false;
		}
	};

	// チャンク単位でサムネイルを処理する関数
	const loadThumbnailsInChunks = async (allImageFiles: string[]) => {
		const CHUNK_SIZE = 16; // チャンクサイズ
		const newThumbnails = new Map<string, string>();

		// 配列をチャンクに分割
		const chunks: string[][] = [];
		for (let i = 0; i < allImageFiles.length; i += CHUNK_SIZE) {
			chunks.push(allImageFiles.slice(i, i + CHUNK_SIZE));
		}

		console.log(`チャンク処理開始: ${chunks.length}チャンク, チャンクサイズ: ${CHUNK_SIZE}`);

		// チャンクごとに処理
		for (const [chunkIndex, chunk] of chunks.entries()) {
			try {
				console.log(
					`チャンク ${chunkIndex + 1}/${chunks.length} 処理開始 (${chunk.length}ファイル)`
				);

				const results: BatchThumbnailResult[] = await invoke('load_thumbnails_batch', {
					imagePaths: chunk
				});

				// 結果を即座にUI更新
				for (const result of results) {
					if (result.thumbnail && result.thumbnail.data) {
						// number[]をUint8Arrayに変換
						const uint8Array = new Uint8Array(result.thumbnail.data);
						const blob = new Blob([uint8Array], { type: result.thumbnail.mime_type });
						const url = URL.createObjectURL(blob);
						newThumbnails.set(result.path, url);
						loadedCount++;
						console.log(`サムネイル生成成功: ${result.path}`);
					} else if (result.error) {
						console.warn(`サムネイル生成失敗: ${result.path} - ${result.error}`);
					}
				}

				// UI更新（リアルタイム）
				thumbnails = new Map(newThumbnails);

				console.log(`チャンク ${chunkIndex + 1}/${chunks.length} 完了`);

				// 少し待機（UI更新のため）
				await new Promise((resolve) => setTimeout(resolve, 10));
			} catch (chunkError) {
				console.error(`チャンク ${chunkIndex + 1} 処理エラー:`, chunkError);
			}
		}

		console.log('全チャンク処理完了');
	};

	// クリーンアップ関数
	const cleanup = () => {
		// Blob URLをクリーンアップ
		for (const url of thumbnails.values()) {
			URL.revokeObjectURL(url);
		}
		thumbnails.clear();
	};

	// コンポーネントマウント時と directoryPath 変更時の処理
	let currentDirectory = '';

	onMount(() => {
		if (directoryPath) {
			currentDirectory = directoryPath;
			loadImageGrid();
		}

		// クリーンアップ関数を返す
		return () => {
			cleanup();
		};
	});

	// directoryPath が変更された時の処理（watcherとして）
	$effect(() => {
		if (directoryPath && directoryPath !== currentDirectory && !isProcessing) {
			console.log('ディレクトリ変更検出:', currentDirectory, '->', directoryPath);
			currentDirectory = directoryPath;
			cleanup();
			loadImageGrid();
		}
	});

	// refreshTrigger が変更された時の処理（削除後の再読み込み用）
	$effect(() => {
		if (refreshTrigger > 0 && refreshTrigger !== lastRefreshTrigger && !isProcessing) {
			console.log('リフレッシュトリガー検出:', refreshTrigger);
			lastRefreshTrigger = refreshTrigger;
			cleanup();
			loadImageGrid();
		}
	});

	const handleImageClick = (imagePath: string) => {
		if (isSelectionMode && onToggleSelection) {
			onToggleSelection(imagePath);
		} else {
			onImageSelect(imagePath);
		}
	};

	const getImageName = (path: string) => {
		return path.split('/').pop() || 'unknown';
	};
</script>

<div class="h-full p-4">
	{#if isLoading}
		<div class="flex h-full flex-col items-center justify-center">
			<div class="loading mb-4 loading-lg loading-spinner"></div>
			<p class="text-lg">サムネイルを生成中...</p>
			{#if imageFiles.length > 0}
				<p class="mt-2 text-sm text-base-content/70">
					{loadedCount} / {imageFiles.length} 完了
				</p>
				<div class="mt-4 h-2 w-64 rounded-full bg-base-300">
					<div
						class="h-2 rounded-full bg-primary transition-all duration-300"
						style="width: {(loadedCount / imageFiles.length) * 100}%"
					></div>
				</div>
			{/if}
		</div>
	{:else if error}
		<div class="flex h-full flex-col items-center justify-center">
			<div class="mb-4 text-6xl">⚠️</div>
			<p class="mb-2 text-lg text-error">エラーが発生しました</p>
			<p class="text-sm text-base-content/70">{error}</p>
		</div>
	{:else if imageFiles.length === 0}
		<div class="flex h-full flex-col items-center justify-center">
			<div class="mb-4 text-6xl">📁</div>
			<p class="text-lg">画像ファイルが見つかりません</p>
		</div>
	{:else}
		<div class="h-full overflow-auto">
			<div
				class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
			>
				{#each imageFiles as imagePath (imagePath)}
					{@const isSelected = selectedImages.has(imagePath)}
					<div class="group cursor-pointer relative">
						<button
							class="aspect-square w-full overflow-hidden rounded-lg border-0 bg-base-200 p-0 shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg"
							class:ring-4={isSelected}
							class:ring-blue-500={isSelected}
							class:opacity-80={isSelected}
							onclick={() => handleImageClick(imagePath)}
							onkeydown={(e) => e.key === 'Enter' && handleImageClick(imagePath)}
							aria-label={isSelectionMode ? `画像を選択: ${getImageName(imagePath)}` : `画像を開く: ${getImageName(imagePath)}`}
						>
							{#if thumbnails.has(imagePath)}
								<div class="flex h-full w-full items-center justify-center p-2">
									<img
										src={thumbnails.get(imagePath)}
										alt={getImageName(imagePath)}
										class="max-h-full max-w-full object-contain rounded"
										loading="lazy"
									/>
								</div>
							{:else}
								<div class="flex h-full items-center justify-center">
									<div class="loading loading-sm loading-spinner"></div>
								</div>
							{/if}
						</button>
						
						<!-- 選択機能 -->
						{#if isSelectionMode}
							<!-- チェックボックス -->
							<div class="absolute top-2 right-2 z-10">
								<input 
									type="checkbox"
									class="checkbox checkbox-sm checkbox-primary bg-black/50 border-white border-2"
									checked={isSelected}
									onchange={(e) => {
										e.stopPropagation();
										if (onToggleSelection) {
											onToggleSelection(imagePath);
										}
									}}
									title={isSelected ? '選択解除' : '選択'}
								/>
							</div>
						{/if}
						<p class="mt-2 truncate text-xs text-base-content/70" title={getImageName(imagePath)}>
							{getImageName(imagePath)}
						</p>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
