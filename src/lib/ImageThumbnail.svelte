<script lang="ts">
	const {
		imagePath,
		thumbnailUrl,
		rating,
		isSelected = false,
		isSelectionMode = false,
		isLoading = false,
		onImageClick,
		onToggleSelection
	}: {
		imagePath: string;
		thumbnailUrl?: string;
		rating?: number;
		isSelected?: boolean;
		isSelectionMode?: boolean;
		isLoading?: boolean;
		onImageClick: (imagePath: string) => void;
		onToggleSelection?: (imagePath: string) => void;
	} = $props();

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

	// Rating星表示を生成（白黒表示用）
	const generateStars = (rating?: number): string => {
		if (!rating || rating < 1 || rating > 5) {
			return '';
		}
		return '★'.repeat(rating);
	};
</script>

<div class="group relative cursor-pointer">
	<button
		class="aspect-square w-full overflow-hidden rounded-lg border-0 bg-base-200 p-0 shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg"
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
				
				<!-- Rating オーバーレイ表示 -->
				{#if rating && rating >= 1 && rating <= 5}
					<div class="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-black/30 px-1 py-0.5">
						<span class="text-sm text-white drop-shadow-lg" title={`Rating: ${rating}/5`}>
							{generateStars(rating)}
						</span>
					</div>
				{/if}
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
