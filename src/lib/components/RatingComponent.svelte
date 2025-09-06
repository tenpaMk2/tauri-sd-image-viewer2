<script lang="ts">
	import { metadataRegistry } from '$lib/services/metadata-registry';
	import { LOADING_STATUS_CONFIG } from '$lib/ui/loading-status-config';
	import Icon from '@iconify/svelte';

	type Props = {
		imagePath: string;
	};

	const { imagePath }: Props = $props();

	// メタデータストアを取得（imagePathが変更されるたびに新しいストアを取得）
	const metadataStore = metadataRegistry.getOrCreateStore(imagePath);
	metadataStore.actions.ensureLoaded();
	const { state: metadataState, actions: metadataActions } = metadataStore;

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
			await metadataStore.actions.updateRating(newRating);
		} catch (error) {
			console.error('Failed to update rating for ' + imagePath.split('/').pop() + ': ' + error);
		}
	};
</script>

{#snippet statusDisplay(config: (typeof LOADING_STATUS_CONFIG)[keyof typeof LOADING_STATUS_CONFIG])}
	<div
		class="flex items-center gap-1 rounded {config.icon === 'triangle-alert'
			? 'bg-red-600/50'
			: 'bg-black/50'} px-2 py-1"
	>
		{#if config.icon}
			<Icon
				icon="lucide:{config.icon}"
				class="h-3 w-3 text-white {config.icon === 'triangle-alert' ? '' : 'opacity-30'}"
			/>
		{:else if config.loadingIcon}
			<span
				class="loading loading-xs {config.loadingIcon} text-white {config.loadingIcon ===
				'loading-ring'
					? 'opacity-50'
					: ''}"
			></span>
		{/if}
		<span
			class="text-xs text-white {config.icon === 'triangle-alert'
				? ''
				: config.loadingIcon === 'loading-ring'
					? ''
					: 'opacity-30'}">{config.text}</span
		>
	</div>
{/snippet}

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
	{#if metadataState.loadingStatus === 'unloaded'}
		{@render statusDisplay(LOADING_STATUS_CONFIG.unloaded)}
	{:else if metadataState.loadingStatus === 'queued'}
		{@render statusDisplay(LOADING_STATUS_CONFIG.queued)}
	{:else if metadataState.loadingStatus === 'loading'}
		{@render statusDisplay(LOADING_STATUS_CONFIG.loading)}
	{:else if metadataState.loadingStatus === 'loaded'}
		{@render starRating(metadataState.rating ?? 0, isRatingHovered, hoveredRating)}
	{:else if metadataState.loadingStatus === 'error'}
		{@render statusDisplay(LOADING_STATUS_CONFIG.error)}
	{:else}
		<!-- 予期しない状態 -->
		<div class="flex items-center gap-1 rounded bg-orange-600/50 px-2 py-1">
			<span class="text-xs text-white opacity-75">-</span>
		</div>
	{/if}
</div>
