<script lang="ts">
	import RatingComponent from './components/RatingComponent.svelte';

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

	const handleRatingChange = (newRating: number) => {
		if (onRatingChange) {
			onRatingChange(imagePath, newRating);
		}
	};
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

	<!-- Rating Component -->
	<div class="absolute bottom-1 left-1/2 -translate-x-1/2">
		<RatingComponent 
			{imagePath} 
			{rating} 
			onRatingChange={handleRatingChange}
		/>
	</div>
</div>
