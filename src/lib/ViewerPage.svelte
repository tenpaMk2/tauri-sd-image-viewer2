<script lang="ts">
	import { onMount } from 'svelte';
	import ImageCanvas from './ImageCanvas.svelte';
	import MetadataPanel from './MetadataPanel.svelte';
	import { metadataPanelStore } from './stores/metadata-panel-store.svelte';
	import { navigationStore } from './stores/navigation-store.svelte';
	import { viewerUIStore } from './stores/viewer-ui-store.svelte';
	import ViewerUiOverlay from './ViewerUIOverlay.svelte';

	// viewerUIStoreから状態とアクションを取得
	const { state: viewerUIState, actions: viewerUIActions } = viewerUIStore;

	// metadataPanelStoreから状態とアクションを取得
	const { state: metadataPanelState } = metadataPanelStore;

	// navigationStoreから現在の画像パスを取得
	const { state: navigationState } = navigationStore; // ズーム状態を管理
	let isZoomed = $state(false);

	const handleZoomStateChange = (zoomed: boolean) => {
		isZoomed = zoomed;
	};

	// マウスムーブイベントハンドラー
	const handleMouseMove = () => {
		viewerUIActions.handleMouseMove();
	};

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
		const handleGlobalKeydown = (event: KeyboardEvent) => {
			handleKeydown(event);
		};

		window.addEventListener('keydown', handleGlobalKeydown);

		const cleanup = () => {
			window.removeEventListener('keydown', handleGlobalKeydown);
			viewerUIActions.stopAutoNavigation();
			viewerUIActions.resetUITimer();
		};

		// アンマウント時のクリーンアップ
		return cleanup;
	});

	console.log('🖼️ ViewerPage initialized with Svelte 5 patterns');
</script>

<!-- メイン画面のレイアウト -->
<div
	class="relative flex h-full bg-base-300 outline-none"
	role="application"
	aria-label="Image viewer"
	onmousemove={handleMouseMove}
>
	<!-- メインキャンバスエリア -->
	<div
		class="relative flex-1"
		style="width: {metadataPanelState.isVisible
			? `calc(100% - ${metadataPanelState.width}px)`
			: '100%'}"
	>
		<ImageCanvas onZoomStateChange={handleZoomStateChange} />

		<!-- UI要素のオーバーレイ（ズーム時は非表示） -->
		{#if !isZoomed}
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
