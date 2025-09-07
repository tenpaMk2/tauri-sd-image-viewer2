<script lang="ts">
	import RatingComponent from '$lib/components/RatingComponent.svelte';
	import NavigationButtons from '$lib/NavigationButtons.svelte';
	import { navigationStore } from '$lib/stores/navigation-store.svelte';
	import { viewerUIStore } from '$lib/stores/viewer-ui-store.svelte';
	import ToolbarOverlay from '$lib/ToolbarOverlay.svelte';
	import { onDestroy, onMount } from 'svelte';

	// navigationStoreから画像状態を取得
	const { state: navigationState } = navigationStore;
	const { state: viewerUIState, actions: viewerUIActions } = viewerUIStore;

	onMount(() => {
		// ViewerUIがマウントされた時にタイマーをリセット
		viewerUIActions.resetUITimer();
	});

	onDestroy(() => {
		// ViewerUIがアンマウントされる時にタイマーをクリーンアップ
		viewerUIActions.resetUITimer();
	});
</script>

<!-- UI要素のオーバーレイ -->
<div
	class="pointer-events-none absolute inset-0 transition-opacity duration-300"
	class:opacity-0={!viewerUIState.isVisible}
	onmousemove={viewerUIActions.handleMouseMove}
	role="presentation"
>
	<!-- ツールバー -->
	<div class="pointer-events-auto">
		<ToolbarOverlay />
	</div>

	<!-- ナビゲーションボタン -->
	<div class="pointer-events-auto">
		<NavigationButtons />
	</div>

	<!-- Rating Component -->
	<div class="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 transform">
		{#key navigationState.currentImagePath}
			<RatingComponent imagePath={navigationState.currentImagePath} />
		{/key}
	</div>
</div>
