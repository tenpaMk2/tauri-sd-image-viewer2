<script lang="ts">
	const {
		imagePath,
		thumbnailUrl,
		rating,
		isSelected = false,
		isSelectionMode = false,
		isLoading = false,
		onImageClick,
		onToggleSelection,
		onRatingChange
	}: {
		imagePath: string;
		thumbnailUrl?: string;
		rating?: number;
		isSelected?: boolean;
		isSelectionMode?: boolean;
		isLoading?: boolean;
		onImageClick: (imagePath: string) => void;
		onToggleSelection?: (imagePath: string) => void;
		onRatingChange?: (imagePath: string, newRating: number) => void;
	} = $props();

	let isRatingHovered = $state(false);
	let hoveredRating = $state(0);

	const handleClick = (): void => {
		if (isSelectionMode && onToggleSelection) {
			onToggleSelection(imagePath);
		} else {
			onImageClick(imagePath);
		}
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
		class="aspect-square w-full cursor-pointer overflow-hidden rounded-lg border-0 bg-base-200 p-0 shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg hover:bg-primary/10"
		class:ring-4={isSelected}
		class:ring-blue-500={isSelected}
		class:opacity-80={isSelected}
		onclick={handleClick}
		onkeydown={(e) => e.key === 'Enter' && handleClick()}
		aria-label={isSelectionMode ? '画像を選択' : '画像を開く'}
	>
		{#if thumbnailUrl}
			<div class="relative flex h-full w-full items-center justify-center p-2">
				<img
					src={thumbnailUrl}
					alt="thumbnail"
					class="max-h-full max-w-full rounded object-contain"
					loading="lazy"
				/>
				
			</div>
		{:else if isLoading}
			<div class="flex h-full items-center justify-center">
				<div class="loading loading-sm loading-spinner"></div>
			</div>
		{:else}
			<div class="flex h-full items-center justify-center">
				<div class="text-base-content/50">No Image</div>
			</div>
		{/if}
	</button>

	<!-- Rating オーバーレイ表示 -->
	<div 
		class="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-black/30 px-1 py-0.5"
		role="group"
		aria-label="画像評価"
		onmouseleave={handleRatingMouseLeave}
	>
		<div class="flex gap-0.5" title={`Rating: ${rating || 0}/5 (クリックで変更)`}>
			{#each Array(5) as _, i}
				<button
					class="text-sm transition-colors duration-100 hover:scale-110 {i < displayRating ? 'text-white' : 'text-white/30'}"
					onmouseenter={() => handleRatingMouseEnter(i + 1)}
					onclick={(e) => handleRatingClick(e, i + 1)}
					style="text-shadow: 0 1px 2px rgba(0,0,0,0.8);"
					aria-label={`${i + 1}星評価`}
				>
					★
				</button>
			{/each}
		</div>
	</div>

	<!-- 選択機能 -->
	{#if isSelectionMode}
		<div class="absolute top-2 right-2 z-10">
			<input
				type="checkbox"
				class="checkbox border-2 border-white bg-black/50 checkbox-sm checkbox-primary"
				checked={isSelected}
				onchange={handleCheckboxChange}
				title={isSelected ? '選択解除' : '選択'}
			/>
		</div>
	{/if}
</div>
