<script lang="ts">
	import { imageViewStore } from '$lib/stores/image-view-store.svelte';
	import { metadataPanelStore } from '$lib/stores/metadata-panel-store.svelte';
	import { navigationStore } from '$lib/stores/navigation-store.svelte';
	import { viewerUIStore } from '$lib/stores/viewer-ui-store.svelte';
	import { onMount } from 'svelte';
	import ImageCanvas from './ImageCanvas.svelte';
	import MetadataPanel from './MetadataPanel.svelte';
	import ViewerUiOverlay from './ViewerUIOverlay.svelte';

	// imageViewStoreからズーム状態を取得
	const { deriveds: imageViewDeriveds } = imageViewStore;

	// metadataPanelStoreから状態とアクションを取得
	const { state: metadataPanelState } = metadataPanelStore;

	// navigationStoreから現在の画像パスを取得
	const { state: navigationState } = navigationStore;

	// viewerUIStoreから状態とアクションを取得
	const { actions: viewerUIActions } = viewerUIStore;

	// キーボードイベントハンドラー
	const handleKeydown = async (event: KeyboardEvent): Promise<void> => {
		// 情報パネルにフォーカスがある場合はキーボードナビゲーションを無効にする
		if (metadataPanelState.isFocused) return;

		try {
			switch (event.key) {
				case 'ArrowRight':
					event.preventDefault();
					await navigationStore.actions.navigateNext();
					break;
				case 'ArrowLeft':
					event.preventDefault();
					await navigationStore.actions.navigatePrevious();
					break;
			}
		} catch (error) {
			console.error('Keyboard handler error: ' + error);
		}
	};

	// コンポーネントのマウント時とクリーンアップ処理
	onMount(() => {
		// グローバルキーボードイベントリスナーを追加
		const handleGlobalKeydown = (event: KeyboardEvent) => handleKeydown(event);

		window.addEventListener('keydown', handleGlobalKeydown);

		// アンマウント時のクリーンアップ
		return () => {
			window.removeEventListener('keydown', handleGlobalKeydown);
			viewerUIActions.stopAutoNavigation();
			viewerUIActions.resetUITimer();
		};
	});

	console.log('🖼️ ViewerPage initialized with Svelte 5 patterns');
</script>

<div
	class="relative flex h-full bg-base-300 outline-none"
	role="application"
	aria-label="Image viewer"
	onmousemove={() => viewerUIActions.handleMouseMove()}
>
	<!-- メインキャンバスエリア -->
	<div
		class="relative flex-1"
		style="width: {metadataPanelState.isVisible
			? `calc(100% - ${metadataPanelState.width}px)`
			: '100%'}"
	>
		<ImageCanvas />

		<!-- UI要素のオーバーレイ（ズーム時は非表示） -->
		{#if !imageViewDeriveds.isZoomed}
			<ViewerUiOverlay />
		{/if}
	</div>

	<!-- メタデータパネル（右側） -->
	{#if metadataPanelState.isVisible}
		<div
			class="relative h-full bg-base-200 shadow-2xl"
			style="width: {metadataPanelState.width}px; min-width: 280px; max-width: 600px;"
		>
			<!-- リサイズハンドル -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div
				class="absolute top-0 left-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-primary/30 active:bg-primary/50"
				role="separator"
				aria-label="Resize metadata panel"
				onmousedown={(e) => metadataPanelStore.actions.handleResize(e, 280, 600)}
			></div>

			<!-- メタデータパネルのコンテンツ -->
			<MetadataPanel imagePath={navigationState.currentImagePath} />
		</div>
	{/if}
</div>
