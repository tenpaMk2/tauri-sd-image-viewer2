<script lang="ts">
	import RatingComponent from './components/RatingComponent.svelte';
	import NavigationButtons from './NavigationButtons.svelte';
	import { imageMetadataStore } from './stores/image-metadata-store.svelte';
	import ToolbarOverlay from './ToolbarOverlay.svelte';

	const {
		imagePath,
		openFileDialog,
		onSwitchToGrid,
		onToggleInfoPanel,
		isInfoPanelVisible,
		onToggleAutoNavigation,
		isAutoNavActive,
		onCopyToClipboard,
		isMacOS,
		goToPrevious,
		goToNext,
		isNavigating,
		onRatingChange
	}: {
		imagePath?: string;
		openFileDialog: () => void;
		onSwitchToGrid?: () => Promise<void>;
		onToggleInfoPanel?: () => void;
		isInfoPanelVisible?: boolean;
		onToggleAutoNavigation?: () => void;
		isAutoNavActive?: boolean;
		onCopyToClipboard?: () => void;
		isMacOS?: boolean;
		goToPrevious: () => void;
		goToNext: () => void;
		isNavigating: boolean;
		onRatingChange?: (newRating: number) => void;
	} = $props();

	const handleRatingChange = async (newRating: number) => {
		if (onRatingChange) {
			onRatingChange(newRating);
		} else if (imagePath) {
			// デフォルト動作: メタデータストアを直接更新
			const metadata = imageMetadataStore.getMetadata(imagePath);
			await metadata.updateRating(newRating);
		}
	};
</script>

<!-- UI要素のオーバーレイ -->
<div class="pointer-events-none absolute inset-0">
	<!-- ツールバー -->
	<div class="pointer-events-auto">
		<ToolbarOverlay
			{openFileDialog}
			{onSwitchToGrid}
			{onToggleInfoPanel}
			{isInfoPanelVisible}
			{onToggleAutoNavigation}
			{isAutoNavActive}
			isUIVisible={true}
			{onCopyToClipboard}
			{isMacOS}
		/>
	</div>

	<!-- ナビゲーションボタン -->
	<div class="pointer-events-auto">
		<NavigationButtons {isNavigating} {goToPrevious} {goToNext} isUIVisible={true} />
	</div>

	<!-- Rating Component -->
	{#if imagePath}
		<div class="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 transform">
			<RatingComponent
				metadata={imageMetadataStore.getMetadata(imagePath)}
				onRatingChange={handleRatingChange}
			/>
		</div>
	{/if}
</div>
