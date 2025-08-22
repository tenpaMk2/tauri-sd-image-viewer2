<script lang="ts">
	import RatingComponent from './components/RatingComponent.svelte';
	import NavigationButtons from './NavigationButtons.svelte';
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
		goToPrevious,
		goToNext,
		isNavigating
	}: {
		imagePath?: string;
		openFileDialog: () => void;
		onSwitchToGrid?: () => Promise<void>;
		onToggleInfoPanel?: () => void;
		isInfoPanelVisible?: boolean;
		onToggleAutoNavigation?: () => void;
		isAutoNavActive?: boolean;
		onCopyToClipboard?: () => void;
		goToPrevious: () => void;
		goToNext: () => void;
		isNavigating: boolean;
	} = $props();
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
		/>
	</div>

	<!-- ナビゲーションボタン -->
	<div class="pointer-events-auto">
		<NavigationButtons {isNavigating} {goToPrevious} {goToNext} isUIVisible={true} />
	</div>

	<!-- Rating Component -->
	{#if imagePath}
		<div class="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 transform">
			<RatingComponent {imagePath} />
		</div>
	{/if}
</div>
