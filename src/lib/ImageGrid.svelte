<script lang="ts">
	import { onMount } from 'svelte';
	import { invoke } from '@tauri-apps/api/core';
	import { getImageFiles } from './image-loader';

	type ThumbnailInfo = {
		data: number[];
		width: number;
		height: number;
		mime_type: string;
	};

	type BatchThumbnailResult = {
		path: string;
		thumbnail: ThumbnailInfo | null;
		error: string | null;
	};

	const {
		directoryPath,
		onImageSelect
	}: {
		directoryPath: string;
		onImageSelect: (imagePath: string) => void;
	} = $props();

	let imageFiles = $state<string[]>([]);
	let thumbnails = $state<Map<string, string>>(new Map());
	let isLoading = $state<boolean>(true);
	let error = $state<string>('');
	let loadedCount = $state<number>(0);
	let isProcessing = $state<boolean>(false);

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
			
			if (imageFiles.length === 0) {
				error = '画像ファイルが見つかりません';
				return;
			}

			// Tauriのサムネイル生成コマンドを呼び出し
			console.log('サムネイル生成開始:', imageFiles.length, '個のファイル');
			console.log('ファイルリスト:', imageFiles);
			
			try {
				const results: BatchThumbnailResult[] = await invoke('load_thumbnails_batch', {
					imagePaths: imageFiles
				});
				
				console.log('サムネイル生成結果:', results);
				console.log('成功したサムネイル数:', results.filter(r => r.thumbnail).length);
				console.log('失敗したサムネイル数:', results.filter(r => r.error).length);

				// サムネイルデータをBlob URLに変換
				const newThumbnails = new Map<string, string>();
				for (const result of results) {
					if (result.thumbnail && result.thumbnail.data) {
						// number[]をUint8Arrayに変換
						const uint8Array = new Uint8Array(result.thumbnail.data);
						const blob = new Blob([uint8Array], { type: result.thumbnail.mime_type });
						const url = URL.createObjectURL(blob);
						newThumbnails.set(result.path, url);
						loadedCount++;
						console.log(`サムネイル生成成功: ${result.path} (${result.thumbnail.data.length} bytes)`);
					} else if (result.error) {
						console.warn(`サムネイル生成失敗: ${result.path} - ${result.error}`);
					}
				}
				
				thumbnails = newThumbnails;
			} catch (invokeError) {
				console.error('Tauriコマンド呼び出しエラー:', invokeError);
				error = `サムネイル生成中にエラーが発生: ${invokeError}`;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'サムネイルの読み込みに失敗しました';
			console.error('Failed to load thumbnails:', err);
		} finally {
			isLoading = false;
			isProcessing = false;
		}
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


	const handleImageClick = (imagePath: string) => {
		onImageSelect(imagePath);
	};

	const getImageName = (path: string) => {
		return path.split('/').pop() || 'unknown';
	};
</script>

<div class="h-full p-4">
	{#if isLoading}
		<div class="flex h-full flex-col items-center justify-center">
			<div class="loading loading-spinner loading-lg mb-4"></div>
			<p class="text-lg">サムネイルを生成中...</p>
			{#if imageFiles.length > 0}
				<p class="text-sm text-base-content/70 mt-2">
					{loadedCount} / {imageFiles.length} 完了
				</p>
			{/if}
		</div>
	{:else if error}
		<div class="flex h-full flex-col items-center justify-center">
			<div class="text-6xl mb-4">⚠️</div>
			<p class="text-lg text-error mb-2">エラーが発生しました</p>
			<p class="text-sm text-base-content/70">{error}</p>
		</div>
	{:else if imageFiles.length === 0}
		<div class="flex h-full flex-col items-center justify-center">
			<div class="text-6xl mb-4">📁</div>
			<p class="text-lg">画像ファイルが見つかりません</p>
		</div>
	{:else}
		<div class="h-full overflow-auto">
			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
				{#each imageFiles as imagePath (imagePath)}
					<div class="group cursor-pointer">
						<button 
							class="aspect-square overflow-hidden rounded-lg bg-base-200 shadow-md transition-all duration-200 hover:shadow-lg hover:scale-105 w-full border-0 p-0"
							onclick={() => handleImageClick(imagePath)}
							onkeydown={(e) => e.key === 'Enter' && handleImageClick(imagePath)}
							aria-label={`画像を開く: ${getImageName(imagePath)}`}
						>
							{#if thumbnails.has(imagePath)}
								<img
									src={thumbnails.get(imagePath)}
									alt={getImageName(imagePath)}
									class="h-full w-full object-cover"
									loading="lazy"
								/>
							{:else}
								<div class="flex h-full items-center justify-center">
									<div class="loading loading-spinner loading-sm"></div>
								</div>
							{/if}
						</button>
						<p class="mt-2 truncate text-xs text-base-content/70" title={getImageName(imagePath)}>
							{getImageName(imagePath)}
						</p>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>