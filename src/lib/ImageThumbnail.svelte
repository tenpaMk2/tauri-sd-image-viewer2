<script lang="ts">
	import { unifiedMetadataService } from './services/unified-metadata-service.svelte';

	const {
		imagePath,
		thumbnailUrl,
		rating,
		isSelected = false,
		isLoading = false,
		onImageClick,
		onToggleSelection,
		onRatingChange
	}: {
		imagePath: string;
		thumbnailUrl?: string;
		rating?: number;
		isSelected?: boolean;
		isLoading?: boolean;
		onImageClick: (imagePath: string) => void;
		onToggleSelection?: (imagePath: string, shiftKey?: boolean, metaKey?: boolean) => void;
		onRatingChange?: (imagePath: string, newRating: number) => void;
	} = $props();

	let isRatingHovered = $state(false);
	let hoveredRating = $state(0);
	
	// Rating書き込み中かどうかをリアクティブにチェック（配列版）
	const isRatingWriting = $derived(unifiedMetadataService.currentWritingFiles.includes(imagePath));



	const handleClick = (event?: MouseEvent): void => {
		if (onToggleSelection) {
			onToggleSelection(imagePath, event?.shiftKey, event?.metaKey);
		}
	};

	const handleDoubleClick = (): void => {
		onImageClick(imagePath);
	};

	const handleCheckboxChange = (e: Event): void => {
		e.stopPropagation();
		if (onToggleSelection) {
			onToggleSelection(imagePath);
		}
	};

	// Rating星表示を生成（編集可能版）
	const generateStars = (rating?: number): string => {
		if (!rating || rating < 1 || rating > 5) {
			return '';
		}
		return '★'.repeat(rating);
	};

	// Rating編集関連のハンドラー
	const handleRatingMouseEnter = (starIndex: number) => {
		isRatingHovered = true;
		hoveredRating = starIndex;
	};

	const handleRatingMouseLeave = () => {
		isRatingHovered = false;
		hoveredRating = 0;
	};

	const handleRatingClick = (e: Event, newRating: number) => {
		e.stopPropagation(); // 画像クリックイベントを防ぐ
		if (onRatingChange) {
			onRatingChange(imagePath, newRating);
		}
	};

	// 表示用のRating値（ホバー中は予想値、それ以外は実際の値）
	const displayRating = $derived(isRatingHovered ? hoveredRating : rating || 0);
</script>

<div class="group relative cursor-pointer">
	<button
		class="aspect-square w-full cursor-pointer overflow-hidden rounded-lg border-0 bg-base-200 p-0 shadow-md transition-all duration-200 hover:bg-primary/10 hover:shadow-lg"
		class:ring-4={isSelected}
		class:ring-blue-500={isSelected}
		class:opacity-80={isSelected}
		onclick={handleClick}
		ondblclick={handleDoubleClick}
		onkeydown={(e) => e.key === 'Enter' && handleClick()}
		aria-label="Select image (double-click to open)"
	>
		{#if thumbnailUrl}
			<div class="relative flex h-full w-full items-center justify-center p-1">
				<img
					src={thumbnailUrl}
					alt="thumbnail"
					class="h-full w-full rounded object-contain"
					loading="lazy"
				/>
			</div>
		{:else if isLoading}
			<div class="flex h-full flex-col items-center justify-center bg-base-300/30">
				<div class="loading mb-2 loading-sm loading-spinner"></div>
				<div class="text-xs text-base-content/50">Loading...</div>
			</div>
		{:else}
			<div class="flex h-full flex-col items-center justify-center bg-base-300/20">
				<div class="mb-1 text-2xl opacity-30">📷</div>
				<div class="text-xs text-base-content/50">No Image</div>
			</div>
		{/if}
	</button>

	<!-- Rating Overlay -->
	<div
		class="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-black/30 px-1 py-0.5"
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
</div>
