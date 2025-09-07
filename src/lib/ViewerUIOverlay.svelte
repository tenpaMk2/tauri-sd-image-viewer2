<script lang="ts">
	import RatingComponent from '$lib/components/RatingComponent.svelte';
	import NavigationButtons from '$lib/NavigationButtons.svelte';
	import { navigationStore } from '$lib/stores/navigation-store.svelte';
	import { viewerUIStore } from '$lib/stores/viewer-ui-store.svelte';
	import ToolbarOverlay from '$lib/ToolbarOverlay.svelte';

	// navigationStoreから画像状態を取得
	const { state: navigationState } = navigationStore;
	const { state: viewerUIState } = viewerUIStore;
</script>

<!-- UI要素のオーバーレイ -->
<div class="pointer-events-none absolute inset-0">
	<!-- ツールバー -->
	<div class="pointer-events-auto">
		<ToolbarOverlay />
	</div>

	<!-- ナビゲーションボタン -->
	<div class="pointer-events-auto" class:opacity-0={!viewerUIState.isVisible}>
		<NavigationButtons />
	</div>

	<!-- Rating Component -->
	<div class="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 transform">
		<RatingComponent imagePath={navigationState.currentImagePath} />
	</div>
</div>
