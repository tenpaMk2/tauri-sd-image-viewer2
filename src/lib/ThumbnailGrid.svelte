<script lang="ts">
	import { onDestroy } from 'svelte';
	import ImageThumbnail from './ImageThumbnail.svelte';
	import type { TagAggregationResult } from './services/tag-aggregation-service';
	import { TagAggregationService } from './services/tag-aggregation-service';
	import { imageMetadataStore } from './stores/image-metadata-store.svelte';
	import { thumbnailStore } from './stores/thumbnail-store.svelte';

	const {
		imageFiles,
		onImageSelect,
		selectedImages = new Set(),
		onToggleSelection,
		refreshTrigger = 0,
		onFilteredImagesUpdate,
		onTagDataLoaded
	}: {
		imageFiles: string[];
		onImageSelect: (imagePath: string) => void;
		selectedImages?: Set<string>;
		onToggleSelection?: (imagePath: string, shiftKey?: boolean, metaKey?: boolean) => void;
		refreshTrigger?: number;
		onFilteredImagesUpdate?: (filteredCount: number, totalCount: number) => void;
		onTagDataLoaded?: (tagData: TagAggregationResult) => void;
	} = $props();

	// サービスインスタンス
	const tagAggregationService = new TagAggregationService();

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

	// 副作用：ファイルリストが確定したときの後続処理
	$effect(() => {
		if (imageFiles.length > 0) {
			console.log('副作用: 後続処理開始', imageFiles.length);

			// 親コンポーネントに通知
			if (onFilteredImagesUpdate) {
				onFilteredImagesUpdate(imageFiles.length, imageFiles.length); // フィルタなしで全件
			}

			// SDタグ集計のみ開始（サムネイルはオンデマンド）
			setTimeout(() => loadTagData(), 0);
		}
	});

	// クリーンアップ
	onDestroy(() => {
		// 未使用メタデータをクリア
		imageMetadataStore.clearUnused([]);
		// 未使用サムネイルをクリア
		thumbnailStore.clearUnused([]);
	});
</script>

<!-- サムネイルグリッド -->
<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
	{#each imageFiles as imagePath (imagePath)}
		{@const thumbnail = thumbnailStore.getThumbnail(imagePath)}
		{@const thumbnailUrl = thumbnail.thumbnailValue}
		{@const isSelected = selectedImages.has(imagePath)}
		{@const isLoading = !thumbnailUrl}

		{@const metadata = imageMetadataStore.getMetadata(imagePath)}

		<ImageThumbnail
			{imagePath}
			{thumbnailUrl}
			{metadata}
			{isSelected}
			{isLoading}
			onImageClick={onImageSelect}
			{onToggleSelection}
		/>
	{/each}
</div>

<!-- 画像数表示 -->
<div class="mt-4 text-center text-sm text-gray-500">
	{imageFiles.length} images
</div>
