<script lang="ts">
	import { imageMetadataStore } from '$lib/stores/image-metadata-store.svelte';

	type Props = {
		imagePath: string;
	};

	const { imagePath }: Props = $props();

	const metadata = imageMetadataStore.getMetadata(imagePath);

	let isRatingHovered = $state(false);
	let hoveredRating = $state(0);

	const onmouseleave = () => {
		isRatingHovered = false;
		hoveredRating = 0;
	};

	// Rating編集関連のハンドラー
	const handleStarMouseEnter = (starIndex: number) => {
		isRatingHovered = true;
		hoveredRating = starIndex;
	};

	const handleStarClick = async (e: Event, clickedRating: number) => {
		e.stopPropagation(); // 親要素のクリックイベントを防ぐ

		try {
			// 現在のrating値を取得（新しいPromiseベースAPI使用）
			const currentRating = await metadata.getRating();

			// 同じ星をクリックした場合は0に戻す、そうでなければ新しいRating値を設定
			const newRating = (currentRating ?? 0) === clickedRating ? 0 : clickedRating;

			await metadata.updateRating(newRating);
		} catch (error) {
			console.error(`Failed to update rating for ${imagePath.split('/').pop()}:`, error);
		}
	};
</script>

<!-- Rating Overlay Component -->
<div class="rounded bg-black/30 px-1 py-0.5" role="group" aria-label="Image Rating" {onmouseleave}>
	{#await metadata.getRating()}
		<!-- メタデータロード中のスピナー -->
		<div class="flex items-center gap-1 rounded bg-black/50 px-2 py-1">
			<span class="loading loading-xs loading-spinner text-white"></span>
			<span class="text-xs text-white">Loading...</span>
		</div>
	{:then rating}
		<!-- 通常のRating表示 -->
		{@const displayRating = isRatingHovered ? hoveredRating : (rating ?? 0)}
		<div class="flex gap-0.5" title={`Rating: ${rating || 0}/5 (click to change)`}>
			{#each Array(5) as _, i}
				<button
					class="text-sm transition-colors duration-100 hover:scale-110 {i < displayRating
						? 'text-white'
						: 'text-white/30'}"
					onmouseenter={() => handleStarMouseEnter(i + 1)}
					onclick={(e) => handleStarClick(e, i + 1)}
					style="text-shadow: 0 1px 2px rgba(0,0,0,0.8);"
					aria-label={`${i + 1} star rating`}
				>
					★
				</button>
			{/each}
		</div>
	{:catch error}
		<!-- エラー表示 -->
		<div class="flex items-center gap-1 rounded bg-red-500/50 px-2 py-1">
			<span class="text-xs text-white">Error</span>
		</div>
	{/await}
</div>
