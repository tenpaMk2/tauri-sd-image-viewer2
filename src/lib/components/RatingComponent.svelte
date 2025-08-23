<script lang="ts">
	import { metadataRegistry } from '$lib/stores/metadata-registry.svelte';

	type Props = {
		imagePath: string;
	};

	const { imagePath }: Props = $props();

	// メタデータストアを取得（imagePathが変更されるたびに新しいストアを取得）
	const store = $derived(metadataRegistry.getOrCreateStore(imagePath));
	const metadata = $derived(store.state);

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

		// 同じ星をクリックした場合は0に戻す、そうでなければ新しいRating値を設定
		const newRating = (metadata.rating ?? 0) === clickedRating ? 0 : clickedRating;

		try {
			await store.actions.updateRating(newRating);
		} catch (error) {
			console.error('Failed to update rating for ' + imagePath.split('/').pop() + ': ' + error);
		}
	};
</script>

<!-- Rating Overlay Component -->
<div
	class="flex justify-center rounded bg-black/30 px-1 py-0.5 align-middle"
	role="group"
	aria-label="Image Rating"
	{onmouseleave}
>
	{#if metadata.loadingStatus === 'unloaded'}
		<!-- unloaded状態は初期化中のため非表示 -->
		<div class="flex items-center gap-1 rounded bg-black/50 px-2 py-1">
			<span class="loading loading-xs loading-ball text-white opacity-30"></span>
			<span class="text-xs text-white opacity-30">Init...</span>
		</div>
	{:else if metadata.loadingStatus === 'queued'}
		<!-- メタデータキュー待ちの表示 -->
		<div class="flex items-center gap-1 rounded bg-black/50 px-2 py-1">
			<span class="loading loading-xs loading-ring text-white opacity-50"></span>
			<span class="text-xs text-white">Queue...</span>
		</div>
	{:else if metadata.loadingStatus === 'loading'}
		<!-- メタデータ処理中のスピナー -->
		<div class="flex items-center gap-1 rounded bg-black/50 px-2 py-1">
			<span class="loading loading-xs loading-spinner text-white"></span>
			<span class="text-xs text-white">Loading...</span>
		</div>
	{:else if metadata.loadingStatus === 'loaded'}
		<!-- DaisyUI Rating表示 -->
		{@const displayRating = isRatingHovered ? hoveredRating : (metadata.rating ?? 0)}
		<div class="rating-xs rating" title={`Rating: ${metadata.rating || 0}/5 (click to change)`}>
			{#each Array(5) as _, i}
				<input
					type="radio"
					name="rating-{imagePath}"
					class="mask bg-white mask-star-2 transition-all duration-100 hover:scale-110 {i <
					displayRating
						? 'opacity-100'
						: 'opacity-30'}"
					onmouseenter={() => handleStarMouseEnter(i + 1)}
					onclick={(e) => handleStarClick(e, i + 1)}
					style="text-shadow: 0 1px 2px rgba(0,0,0,0.8);"
					aria-label={`${i + 1} star rating`}
					checked={i + 1 === displayRating}
				/>
			{/each}
		</div>
	{:else if metadata.loadingStatus === 'error'}
		<!-- エラー状態の表示 -->
		<div class="flex items-center gap-1 rounded bg-red-600/50 px-2 py-1">
			<span class="text-xs text-white">Error</span>
		</div>
	{:else}
		<!-- 予期しない状態 -->
		<div class="flex items-center gap-1 rounded bg-orange-600/50 px-2 py-1">
			<span class="text-xs text-white opacity-75">-</span>
		</div>
	{/if}
</div>
