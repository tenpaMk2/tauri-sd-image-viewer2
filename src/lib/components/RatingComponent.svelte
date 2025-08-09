<script lang="ts">
	import { unifiedMetadataService } from '../services/unified-metadata-service.svelte';

	const {
		imagePath,
		rating = 0,
		onRatingChange
	}: {
		imagePath: string;
		rating?: number;
		onRatingChange?: (newRating: number) => void;
	} = $props();

	// Rating書き込み中かどうかをリアクティブにチェック
	const isRatingWriting = $derived(unifiedMetadataService.currentWritingFiles.includes(imagePath));

	let isRatingHovered = $state(false);
	let hoveredRating = $state(0);

	// 表示用のRating値（ホバー中は予想値、それ以外は実際の値）
	const displayRating = $derived(isRatingHovered ? hoveredRating : rating || 0);

	// Rating編集関連のハンドラー
	const handleRatingMouseEnter = (starIndex: number) => {
		isRatingHovered = true;
		hoveredRating = starIndex;
	};

	const handleRatingMouseLeave = () => {
		isRatingHovered = false;
		hoveredRating = 0;
	};

	const handleRatingClick = async (e: Event, clickedRating: number) => {
		e.stopPropagation(); // 親要素のクリックイベントを防ぐ
		
		// 同じ星をクリックした場合は0に戻す、そうでなければ新しいRating値を設定
		const newRating = (rating || 0) === clickedRating ? 0 : clickedRating;
		
		if (onRatingChange) {
			onRatingChange(newRating);
		} else {
			// デフォルトの動作：直接サービスを呼び出し
			await unifiedMetadataService.updateImageRating(imagePath, newRating);
		}
	};
</script>

<!-- Rating Overlay Component -->
<div
	class="rounded bg-black/30 px-1 py-0.5"
	role="group"
	aria-label="Image Rating"
	onmouseleave={handleRatingMouseLeave}
>
	{#if isRatingWriting}
		<!-- Rating書き込み中のスピナー -->
		<div class="flex items-center gap-1 bg-black/50 px-2 py-1 rounded">
			<span class="loading loading-xs loading-spinner text-white"></span>
			<span class="text-xs text-white">Saving...</span>
		</div>
	{:else}
		<!-- 通常のRating表示 -->
		<div class="flex gap-0.5" title={`Rating: ${rating || 0}/5 (click to change)`}>
			{#each Array(5) as _, i}
				<button
					class="text-sm transition-colors duration-100 hover:scale-110 {i < displayRating
						? 'text-white'
						: 'text-white/30'}"
					onmouseenter={() => handleRatingMouseEnter(i + 1)}
					onclick={(e) => handleRatingClick(e, i + 1)}
					style="text-shadow: 0 1px 2px rgba(0,0,0,0.8);"
					aria-label={`${i + 1} star rating`}
				>
					★
				</button>
			{/each}
		</div>
	{/if}
</div>