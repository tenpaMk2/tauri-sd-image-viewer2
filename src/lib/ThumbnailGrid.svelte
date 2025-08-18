<script lang="ts">
	import ImageThumbnail from './ImageThumbnail.svelte';
	import { metadataService } from './services/metadata-service.svelte';
	import type { TagAggregationResult } from './services/tag-aggregation-service';
	import { TagAggregationService } from './services/tag-aggregation-service';
	import { thumbnailService } from './services/thumbnail-service.svelte';
	import { filterStore } from './stores/filter-store.svelte';
	import { SvelteMap } from 'svelte/reactivity';

	const {
		directoryPath,
		onImageSelect,
		selectedImages = new Set(),
		onToggleSelection,
		refreshTrigger = 0,
		onImageFilesLoaded,
		onFilteredImagesUpdate,
		onTagDataLoaded
	}: {
		directoryPath: string;
		onImageSelect: (imagePath: string) => void;
		selectedImages?: Set<string>;
		onToggleSelection?: (imagePath: string, shiftKey?: boolean, metaKey?: boolean) => void;
		refreshTrigger?: number;
		onImageFilesLoaded?: (files: string[]) => void;
		onFilteredImagesUpdate?: (filteredCount: number, totalCount: number) => void;
		onTagDataLoaded?: (tagData: TagAggregationResult) => void;
	} = $props();

	// ローディング状態を統合
	type LoadingState = {
		isLoading: boolean;
		isProcessing: boolean;
		error: string;
		loadedCount: number;
		totalCount: number;
	};

	// サービスインスタンス
	const tagAggregationService = new TagAggregationService(thumbnailService);

	let imageFiles = $state<string[]>([]);
	let filteredImageFiles = $state<string[]>([]);
	let ratings = new SvelteMap<string, number | undefined>(); // リアクティブなレーティングキャッシュ
	let loadingState = $state<LoadingState>({
		isLoading: true,
		isProcessing: false,
		error: '',
		loadedCount: 0,
		totalCount: 0
	});
	let lastRefreshTrigger = $state<number>(-1);
	let ratingUpdateTrigger = $state<number>(0); // Rating更新をトリガーするためのstate

	// レーティング読み込み関数（順次更新方式）
	const loadRatings = async (imagePaths: string[]) => {
		console.log('=== loadRatings開始 === ' + imagePaths.length + '個のファイル');
		for (const imagePath of imagePaths) {
			// 既に取得済みの場合はスキップ
			if (ratings.has(imagePath)) {
				console.log('スキップ: ' + imagePath.split('/').pop());
				continue;
			}

			try {
				console.log('取得中: ' + imagePath.split('/').pop());
				const rating = await metadataService.getRating(imagePath);
				console.log('取得完了: ' + imagePath.split('/').pop() + ' → ' + JSON.stringify(rating));
				// 取得完了ごとに即座にSvelteMapを更新（順次表示、自動リアクティブ）
				ratings.set(imagePath, rating);
				console.log('SvelteMap更新完了。ratingsサイズ: ' + ratings.size);
			} catch (error) {
				console.warn('レーティング取得失敗: ' + imagePath.split('/').pop() + ' ' + error);
				ratings.set(imagePath, undefined);
			}
		}
		console.log('=== loadRatings完了 ===');
	};

	// ThumbnailServiceの状態を監視して進捗を同期
	$effect(() => {
		const progress = thumbnailService.progress;
		loadingState.loadedCount = progress.completed;
		loadingState.totalCount = progress.total;

		// 処理状態も同期
		loadingState.isProcessing = thumbnailService.status === 'running';

		if (thumbnailService.status === 'completed') {
			console.log('サムネイル生成完了');
			loadingState.isProcessing = false;
		} else if (thumbnailService.status === 'cancelled') {
			console.log('サムネイル生成がキャンセルされました');
			loadingState.isProcessing = false;
		}
	});

	// サムネイル数の変化をリアルタイム監視
	$effect(() => {
		const thumbnailCount = thumbnailService.thumbnails.size;
		console.log(
			'=== サムネイル総数変化 === ' +
				thumbnailCount +
				' / ' +
				imageFiles.length +
				' keys: [' +
				Array.from(thumbnailService.thumbnails.keys())
					.map((path) => path.split('/').pop())
					.join(', ') +
				']'
		);
		console.log(
			'表示可能なサムネイル:' +
				Array.from(thumbnailService.thumbnails.keys())
					.slice(0, 5)
					.map((path) => (path as string).split('/').pop())
		);
	});

	// フィルタが変更されたときに画像リストを再計算
	$effect(() => {
		// フィルタストアの状態変更を監視
		filterStore.state.targetRating;
		filterStore.state.ratingComparison;
		filterStore.state.filenamePattern;
		filterStore.state.selectedTags;
		// レーティング更新も監視
		ratingUpdateTrigger;

		if (imageFiles.length > 0) {
			// フィルタを適用して表示用の画像リストを更新（同期処理で高速化）
			const filtered = filterStore.filterImages(imageFiles, ratings, tagAggregationService);

			// 変更があった場合のみ更新
			if (
				filtered.length !== filteredImageFiles.length ||
				!filtered.every((path, index) => path === filteredImageFiles[index])
			) {
				filteredImageFiles = filtered;
				console.log('フィルタ適用結果: ' + filtered.length + ' / ' + imageFiles.length);

				// 親コンポーネントにフィルタ結果を通知
				if (onFilteredImagesUpdate) {
					onFilteredImagesUpdate(filtered.length, imageFiles.length);
				}
			}
		}
	});

	// 第1段階：画像ファイル一覧の取得とグリッド表示
	const loadImageFileList = async () => {
		console.log('=== loadImageFileList 開始 ===', directoryPath);

		if (loadingState.isProcessing) {
			console.log('サムネイル処理中のため、スキップします');
			return;
		}

		try {
			loadingState.isProcessing = true;
			loadingState.isLoading = true;
			loadingState.error = '';
			loadingState.loadedCount = 0;

			console.log('既存のサムネイルをクリア');
			// 既存のサムネイルをクリア
			thumbnailService.clearThumbnails();

			console.log('画像ファイル一覧を取得中...', directoryPath);
			// ディレクトリ内の画像ファイル一覧を取得
			imageFiles = await thumbnailService.getImageFiles(directoryPath);
			console.log('取得された画像ファイル数:', imageFiles.length);

			// 初期状態でフィルタを適用（同期処理のみ）
			filteredImageFiles = imageFiles; // SDタグフィルタが設定されるまでは全画像を表示

			// 親コンポーネントに画像ファイル一覧を通知
			if (onImageFilesLoaded) {
				onImageFilesLoaded(imageFiles);
			}

			// フィルタ結果も通知
			if (onFilteredImagesUpdate) {
				onFilteredImagesUpdate(filteredImageFiles.length, imageFiles.length);
			}

			if (imageFiles.length === 0) {
				loadingState.error = 'No image files found';
				loadingState.isLoading = false;
				loadingState.isProcessing = false;
				return;
			}

			loadingState.totalCount = imageFiles.length;
			loadingState.isLoading = false; // グリッドを表示可能にする

			console.log('画像ファイル一覧取得完了: ' + imageFiles.length + '個のファイル');

			// 第2段階：サムネイル生成を開始
			console.log('loadThumbnails() を呼び出します');
			loadThumbnails();

			// 第3段階：SDタグデータを集計
			loadTagData();
		} catch (err) {
			loadingState.error = err instanceof Error ? err.message : 'Failed to load image files';
			console.error('Failed to load image files: ' + err);
			loadingState.isLoading = false;
			loadingState.isProcessing = false;
		}
	};

	// サムネイル生成を開始（新しいリアクティブサービスを使用）
	const loadThumbnails = async () => {
		console.log('=== サムネイル生成開始 ===');
		console.log('imageFiles: ' + imageFiles.length + '個のファイル');

		try {
			// ThumbnailServiceでサムネイル生成を開始
			await thumbnailService.startProcessing(imageFiles);
		} catch (err) {
			console.error('サムネイル生成エラー: ' + err);
			loadingState.error = err instanceof Error ? err.message : 'Failed to load thumbnails';
			loadingState.isProcessing = false;
		}
	};

	// SDタグデータを集計
	const loadTagData = async () => {
		console.log('=== SDタグ集計開始 ===');

		try {
			const tagData = await tagAggregationService.aggregateTagsFromFiles(imageFiles);
			console.log('SDタグ集計完了: ' + tagData.allTags.length + '個のタグ');

			// 親コンポーネントにタグデータを通知
			if (onTagDataLoaded) {
				onTagDataLoaded(tagData);
			}
		} catch (err) {
			console.error('SDタグ集計エラー: ' + err);
		}
	};

	// レーティング更新時の処理
	const handleRatingUpdate = async (imagePath: string, newRating: number) => {
		try {
			const success = await metadataService.updateImageRating(imagePath, newRating);
			if (success) {
				ratings.set(imagePath, newRating);
				ratingUpdateTrigger++; // フィルタを再適用させるためのトリガー
				console.log('レーティング更新成功: ' + imagePath + ' -> ' + newRating);
			} else {
				console.warn('レーティング更新失敗: ' + imagePath);
			}
		} catch (error) {
			console.error('レーティング更新エラー: ' + imagePath + ' ' + error);
		}
	};

	// ディレクトリパスまたはrefreshTriggerが変更されたときに画像リストを再読み込み
	$effect(() => {
		console.log('$effect ディレクトリパス変更チェック:', {
			directoryPath,
			refreshTrigger,
			lastRefreshTrigger
		});

		if (directoryPath && refreshTrigger !== lastRefreshTrigger) {
			lastRefreshTrigger = refreshTrigger;
			console.log('リフレッシュトリガー発動: ' + directoryPath);
			loadImageFileList();
		}
	});

	// 画像ファイルが読み込まれたらレーティングを取得
	$effect(() => {
		if (imageFiles.length > 0) {
			loadRatings(imageFiles);
		}
	});

	// onDestroy時のクリーンアップ
	$effect(() => {
		return () => {
			// サムネイル生成を停止
			thumbnailService.stop();
		};
	});
</script>

<!-- ローディング表示 -->
{#if loadingState.isLoading}
	<div class="flex h-96 items-center justify-center">
		<div class="flex items-center space-x-2">
			<span class="loading loading-md loading-spinner"></span>
			<span>Loading image files...</span>
		</div>
	</div>
{:else if loadingState.error}
	<div class="flex h-96 items-center justify-center">
		<div class="alert max-w-md alert-error">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6 shrink-0 stroke-current"
				fill="none"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<span>Error: {loadingState.error}</span>
		</div>
	</div>
{:else if imageFiles.length === 0}
	<div class="flex h-96 items-center justify-center">
		<div class="text-center">
			<p class="text-lg">No images found in directory</p>
			<p class="text-sm text-gray-500">{directoryPath}</p>
		</div>
	</div>
{:else}
	<!-- 進捗表示 -->
	{#if loadingState.isProcessing}
		<div class="mb-4 rounded-lg bg-base-200 p-4">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm font-medium">Loading thumbnails...</span>
				<span class="text-sm">{loadingState.loadedCount} / {loadingState.totalCount}</span>
			</div>
			<progress
				class="progress w-full progress-primary"
				value={loadingState.loadedCount}
				max={loadingState.totalCount}
			></progress>
		</div>
	{/if}

	<!-- サムネイルグリッド -->
	<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
		{#each filteredImageFiles as imagePath (imagePath)}
			{@const thumbnailUrl = thumbnailService.getThumbnail(imagePath)}
			{@const isSelected = selectedImages.has(imagePath)}
			{@const currentRating = ratings.get(imagePath)}
			{console.log(
				'📺 ThumbnailGrid描画: ' +
					imagePath.split('/').pop() +
					' rating=' +
					JSON.stringify(currentRating)
			)}

			<ImageThumbnail
				{imagePath}
				{thumbnailUrl}
				rating={currentRating}
				{isSelected}
				onImageClick={onImageSelect}
				{onToggleSelection}
				onRatingChange={handleRatingUpdate}
			/>
		{/each}
	</div>

	<!-- フィルタ結果の表示 -->
	{#if filteredImageFiles.length !== imageFiles.length}
		<div class="mt-4 text-center text-sm text-gray-500">
			Showing {filteredImageFiles.length} of {imageFiles.length} images
		</div>
	{/if}
{/if}
