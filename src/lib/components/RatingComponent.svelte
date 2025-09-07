<script lang="ts">
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import { metadataRegistry } from '$lib/services/metadata-registry';

	type Props = {
		imagePath: string;
	};

	const { imagePath }: Props = $props();

	const { state: metadataState, actions: metadataActions } = $derived(
		metadataRegistry.getOrCreateStore(imagePath),
	);

	$effect(() => {
		metadataActions.ensureLoaded();
	});

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
		const newRating = (metadataState.rating ?? 0) === clickedRating ? 0 : clickedRating;

		try {
			await metadataActions.updateRating(newRating);
		} catch (error) {
			console.error('Failed to update rating for ' + imagePath.split('/').pop() + ': ' + error);
		}
	};
</script>

{#snippet starRating(rating: number, isHovered: boolean, hoveredValue: number)}
	{@const displayRating = isHovered ? hoveredValue : rating}
	<div class="rating-xs rating" title={`Rating: ${rating || 0}/5 (click to change)`}>
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
{/snippet}

<!-- Rating Overlay Component -->
<div
	class="flex justify-center rounded bg-black/30 px-1 py-0.5 align-middle"
	role="group"
	aria-label="Image Rating"
	{onmouseleave}
>
	{#if metadataState.loadingStatus === 'loaded'}
		{@render starRating(metadataState.rating ?? 0, isRatingHovered, hoveredRating)}
	{:else}
		<div class="rounded bg-black/50 px-2 py-1 text-white">
			<LoadingState status={metadataState.loadingStatus} variant="compact" />
		</div>
	{/if}
</div>
