<script lang="ts">
	import type { MetadataStore } from '$lib/components/metadata/metadata-store.svelte';
	import { createRatingKeyboardHandler } from '$lib/services/keyboard-shortcut';
	import LoadingState from '../ui/LoadingState.svelte';

	type Props = {
		imagePath: string;
		metadataStore: MetadataStore | undefined;
	};

	let { imagePath, metadataStore }: Props = $props();

	let currentRating = $derived(metadataStore?.state.metadata?.rating ?? 0);

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

	const updateRating = async (newRating: number) => {
		if (!metadataStore || !imagePath) {
			console.error('No metadata store or image path available for rating update');
			return;
		}

		// 楽観的UIのため、$derivedした値を直接override
		const oldRating = currentRating;
		currentRating = newRating;

		try {
			await metadataStore.actions.updateRating(newRating);
		} catch (error) {
			// エラーが発生したら元の値に戻す
			currentRating = oldRating;
			console.error('Failed to update rating for ' + imagePath.split('/').pop() + ': ' + error);
		}
	};

	const handleStarClick = async (e: Event, clickedRating: number) => {
		e.stopPropagation(); // 親要素のクリックイベントを防ぐ

		// 同じ星をクリックした場合は0に戻す、そうでなければ新しいRating値を設定
		const newRating = currentRating === clickedRating ? 0 : clickedRating;
		await updateRating(newRating);
	};

	// Keyboard shortcuts for rating (0-5)
	$effect(() => {
		const ratingHandler = createRatingKeyboardHandler({ updateRating });
		ratingHandler.addEventListeners();

		return () => {
			ratingHandler.removeEventListeners();
		};
	});
</script>

{#snippet starRating(rating: number)}
	<div class="rating-xs rating" title={`Rating: ${rating || 0}/5`}>
		{#each Array(5) as _, i}
			<input
				type="radio"
				name={`rating-${imagePath}`}
				class="mask bg-white mask-star-2"
				class:opacity-100={i < rating}
				class:opacity-30={rating <= i}
				aria-label={`${i + 1} star rating`}
				checked={i + 1 === rating}
				onmouseenter={() => handleStarMouseEnter(i + 1)}
				onclick={(e) => handleStarClick(e, i + 1)}
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
	{#if !metadataStore}
		<LoadingState status="loading" variant="compact" />
	{:else if metadataStore.state.loadingStatus === 'loading'}
		<LoadingState status="loading" variant="compact" />
	{:else if metadataStore.state.loadingStatus === 'error'}
		<LoadingState status="error" variant="compact" />
	{:else}
		{@render starRating(isRatingHovered ? hoveredRating : currentRating)}
	{/if}
</div>
