<script lang="ts">
	import ImageThumbnail from './ImageThumbnail.svelte';
	import { ThumbnailService } from './services/thumbnail-service';
	import { globalThumbnailService } from './services/global-thumbnail-service';
	import { filterStore } from './stores/filter-store.svelte';
	import { TagAggregationService } from './services/tag-aggregation-service';
	import type { TagAggregationResult } from './services/tag-aggregation-service';

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
	const thumbnailService = new ThumbnailService();
	const tagAggregationService = new TagAggregationService(thumbnailService);

	let imageFiles = $state<string[]>([]);
	let filteredImageFiles = $state<string[]>([]);
	let thumbnails = $state<Map<string, string>>(new Map());
	let ratings = $state<Map<string, number | undefined>>(new Map()); // レーティングキャッシュ
	let loadingState = $state<LoadingState>({
		isLoading: true,
		isProcessing: false,
		error: '',
		loadedCount: 0,
		totalCount: 0
	});
	let lastRefreshTrigger = $state<number>(0);
	let ratingUpdateTrigger = $state<number>(0); // Rating更新をトリガーするためのstate

	// レーティング読み込み関数
	const loadRatings = async (imagePaths: string[]) => {
		const newRatings = new Map(ratings);
		for (const imagePath of imagePaths) {
			try {
				const rating = await thumbnailService.getImageRating(imagePath);
				newRatings.set(imagePath, rating);
			} catch (error) {
				console.warn('レーティング取得失敗:', imagePath, error);
				newRatings.set(imagePath, undefined);
			}
		}
		ratings = newRatings;
	};

	// サムネイル数の変化をリアルタイム監視
	$effect(() => {
		console.log('=== サムネイル総数変化 ===', thumbnails.size, '/', imageFiles.length);
		console.log(
			'表示可能なサムネイル:',
			Array.from(thumbnails.keys())
				.slice(0, 5)
				.map((path) => path.split('/').pop())
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
			const filtered = filterStore.filterImages(
				imageFiles,
				ratings,
				tagAggregationService
			);
			filteredImageFiles = filtered;

			// 親コンポーネントにフィルタ結果を通知
			if (onFilteredImagesUpdate) {
				onFilteredImagesUpdate(filtered.length, imageFiles.length);
			}

			console.log('フィルタ適用結果:', filtered.length, '/', imageFiles.length);
		}
	});

	// 第1段階：画像ファイル一覧の取得とグリッド表示
	const loadImageFileList = async () => {
		if (loadingState.isProcessing) {
			console.log('サムネイル処理中のため、スキップします');
			return;
		}

		try {
			loadingState.isProcessing = true;
			loadingState.isLoading = true;
			loadingState.error = '';
			loadingState.loadedCount = 0;
			thumbnails.clear();

			// ディレクトリ内の画像ファイル一覧を取得
			imageFiles = await thumbnailService.getImageFiles(directoryPath);

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

			console.log('画像ファイル一覧取得完了:', imageFiles.length, '個のファイル');

			// 第2段階：シンプルキューをテスト
			loadThumbnailsWithSimpleQueue();

			// 第3段階：SDタグデータを集計
			loadTagData();
		} catch (err) {
			loadingState.error =
				err instanceof Error ? err.message : 'Failed to load image files';
			console.error('Failed to load image files:', err);
			loadingState.isLoading = false;
			loadingState.isProcessing = false;
		}
	};




	// シンプルなキューベースのサムネイル生成（キュー停止機能付き）
	const loadThumbnailsWithSimpleQueue = async () => {
		console.log('=== loadThumbnailsWithSimpleQueue 開始 ===');
		console.log('imageFiles:', imageFiles.length, '個のファイル');

		try {
			console.log('シンプルキューベースのサムネイル生成開始:', imageFiles.length, '個のファイル');

			const resultThumbnails = await thumbnailService.loadThumbnailsWithSimpleQueue(
				imageFiles,
				(chunkResults) => {
					console.log('=== シンプルチャンク完了 ===');
					console.log('チャンク結果受信:', chunkResults.size, '個のサムネイル');

					// 既存のthumbnailsに新しいチャンク結果をマージ
					const newThumbnails = new Map(thumbnails);
					for (const [imagePath, thumbnailUrl] of chunkResults) {
						console.log(
							'サムネイル追加:',
							imagePath.split('/').pop(),
							thumbnailUrl.substring(0, 50) + '...'
						);
						newThumbnails.set(imagePath, thumbnailUrl);
					}

					thumbnails = newThumbnails;

					// リアルタイム更新時にレーティングも読み込み
					const chunkPaths = Array.from(chunkResults.keys());
					loadRatings(chunkPaths);
					ratingUpdateTrigger = Date.now();
					console.log('🔄 リアルタイム更新、Rating表示更新トリガー:', ratingUpdateTrigger);
					console.log('thumbnails更新 (リアルタイム):', thumbnails.size, '個のサムネイル');
				},
				(loadedCount, totalCount) => {
					console.log('プロセス通知:', loadedCount, '/', totalCount);
					loadingState.loadedCount = loadedCount;
					loadingState.totalCount = totalCount;
				}
			);

			// 最終結果をセット
			thumbnails = resultThumbnails;
			
			// 全レーティングを読み込み
			await loadRatings(imageFiles);
			ratingUpdateTrigger = Date.now();

			console.log('シンプルキューベースのサムネイル生成完了');
			loadingState.isProcessing = false;
		} catch (err) {
			console.error('シンプルキューベース処理エラー:', err);
			loadingState.isProcessing = false;
		}
	};


	// クリーンアップ関数
	const cleanup = () => {
		// キューを停止してからクリーンアップ
		thumbnailService.stopCurrentQueue();
		thumbnailService.cleanupThumbnails(thumbnails);
		thumbnails.clear();
	};

	// コンポーネントマウント時と directoryPath 変更時の処理
	let currentDirectory = '';

	// 初期化処理
	$effect(() => {
		if (directoryPath && !currentDirectory) {
			currentDirectory = directoryPath;
			// このサービスをアクティブなサービスとして登録
			globalThumbnailService.setActiveService(thumbnailService);
			loadImageFileList();
		}

		// クリーンアップ関数を返す
		return () => {
			cleanup();
		};
	});

	// directoryPath が変更された時の処理（watcherとして）
	$effect(() => {
		if (directoryPath && directoryPath !== currentDirectory && !loadingState.isProcessing) {
			console.log('ディレクトリ変更検出:', currentDirectory, '->', directoryPath);
			currentDirectory = directoryPath;
			cleanup();
			loadImageFileList();
		}
	});

	// refreshTrigger が変更された時の処理（削除後の再読み込み用）
	$effect(() => {
		if (0 < refreshTrigger && refreshTrigger !== lastRefreshTrigger && !loadingState.isProcessing) {
			console.log('リフレッシュトリガー検出:', refreshTrigger);
			lastRefreshTrigger = refreshTrigger;
			cleanup();
			loadImageFileList();
		}
	});

	const handleImageClick = (imagePath: string): void => {
		onImageSelect(imagePath);
	};

	const handleToggleSelection = (
		imagePath: string,
		shiftKey: boolean = false,
		metaKey: boolean = false
	): void => {
		if (onToggleSelection) {
			onToggleSelection(imagePath, shiftKey, metaKey);
		}
	};

	const handleRatingChange = async (imagePath: string, newRating: number): Promise<void> => {
		const success = await thumbnailService.updateImageRating(imagePath, newRating);
		if (success) {
			// ローカルratingsマップを即座に更新
			const newRatings = new Map(ratings);
			newRatings.set(imagePath, newRating);
			ratings = newRatings;
			
			// 成功時にリアクティブ更新をトリガー
			ratingUpdateTrigger = Date.now();
			console.log('Rating更新成功:', imagePath, newRating);
		} else {
			// エラー時の処理
			console.warn('Rating更新に失敗しました:', imagePath);
		}
	};

	// SDタグデータを集計
	const loadTagData = async () => {
		try {
			console.log('SDタグデータ集計開始:', imageFiles.length, '個のファイル');

			const tagData = await tagAggregationService.aggregateTagsFromFiles(imageFiles);

			console.log('SDタグデータ集計完了:', tagData.allTags.length, '個のユニークタグ');
			console.log('SDタグキャッシュ統計:', tagAggregationService.getCacheStats());

			// 親コンポーネントにタグデータを通知
			if (onTagDataLoaded) {
				onTagDataLoaded(tagData);
			}
		} catch (err) {
			console.error('SDタグデータ集計エラー:', err);
		}
	};
</script>

<div class="h-full p-4">
	{#if loadingState.isLoading}
		<div class="flex h-full flex-col items-center justify-center">
			<div class="loading mb-4 loading-lg loading-spinner"></div>
			<p class="text-lg">Loading image file list...</p>
		</div>
	{:else if loadingState.error}
		<div class="flex h-full flex-col items-center justify-center">
			<div class="mb-4 text-6xl">⚠️</div>
			<p class="mb-2 text-lg text-error">An error occurred</p>
			<p class="text-sm text-base-content/70">{loadingState.error}</p>
		</div>
	{:else if imageFiles.length === 0}
		<div class="flex h-full flex-col items-center justify-center">
			<div class="mb-4 text-6xl">📁</div>
			<p class="text-lg">No image files found</p>
		</div>
	{:else}
		<div class="flex h-full flex-col">
			<!-- サムネイル生成進捗表示 -->
			{#if loadingState.isProcessing && 0 < loadingState.totalCount}
				<div class="mb-4 flex items-center justify-between rounded-lg bg-base-200 p-3">
					<div class="flex items-center gap-3">
						<div class="loading loading-sm loading-spinner"></div>
						<span class="text-sm">Generating thumbnails...</span>
					</div>
					<div class="text-sm text-base-content/70">
						{loadingState.loadedCount} / {loadingState.totalCount} completed ({thumbnails.size} displayed)
					</div>
				</div>
			{/if}

			<!-- グリッド表示 -->
			<div class="flex-1 overflow-auto">
				<div
					class="grid grid-cols-2 gap-3 p-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
				>
					{#each filteredImageFiles as imagePath (imagePath)}
						{@const isSelected = selectedImages.has(imagePath)}
						{@const rating = (() => {
							// ratingUpdateTriggerを参照することで、Rating更新時にリアクティブに再計算される
							ratingUpdateTrigger;
							return ratings.get(imagePath);
						})()}
						{@const thumbnailUrl = thumbnails.get(imagePath)}
						{@const isLoading = !thumbnails.has(imagePath)}
						<ImageThumbnail
							{imagePath}
							{thumbnailUrl}
							{rating}
							{isSelected}
							{isLoading}
							onImageClick={handleImageClick}
							onToggleSelection={handleToggleSelection}
							onRatingChange={handleRatingChange}
						/>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>
