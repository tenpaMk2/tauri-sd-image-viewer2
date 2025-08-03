<script lang="ts">
	const {
		imagePath,
		thumbnailUrl,
		isSelected = false,
		isSelectionMode = false,
		isLoading = false,
		onImageClick,
		onToggleSelection
	}: {
		imagePath: string;
		thumbnailUrl?: string;
		isSelected?: boolean;
		isSelectionMode?: boolean;
		isLoading?: boolean;
		onImageClick: (imagePath: string) => void;
		onToggleSelection?: (imagePath: string) => void;
	} = $props();

	const getImageName = (path: string): string => {
		return path.split('/').pop() || 'unknown';
	};

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
</script>

<div class="group relative cursor-pointer">
	<button
		class="aspect-square w-full overflow-hidden rounded-lg border-0 bg-base-200 p-0 shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg"
		class:ring-4={isSelected}
		class:ring-blue-500={isSelected}
		class:opacity-80={isSelected}
		onclick={handleClick}
		onkeydown={(e) => e.key === 'Enter' && handleClick()}
		aria-label={isSelectionMode
			? `画像を選択: ${getImageName(imagePath)}`
			: `画像を開く: ${getImageName(imagePath)}`}
	>
		{#if thumbnailUrl}
			<div class="flex h-full w-full items-center justify-center p-2">
				<img
					src={thumbnailUrl}
					alt={getImageName(imagePath)}
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

	<p class="mt-2 truncate text-xs text-base-content/70" title={getImageName(imagePath)}>
		{getImageName(imagePath)}
	</p>
</div>
