<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { onMount } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import ImageCanvas from './ImageCanvas.svelte';
	import MetadataPanel from './MetadataPanel.svelte';
	import { metadataRegistry } from './stores/metadata-registry.svelte';
	import { navigationStore } from './stores/navigation-store.svelte';
	import { thumbnailRegistry } from './stores/thumbnail-registry.svelte';
	import { toastStore } from './stores/toast-store.svelte';
	import { viewerStore } from './stores/viewer-store.svelte';
	import ViewerUIOverlay from './ViewerUIOverlay.svelte';

	const INFO_PANEL_MIN_WIDTH = 280;
	const INFO_PANEL_MAX_WIDTH = 600;

	const {
		imagePath,
		onImageChange,
		openFileDialog,
		onSwitchToGrid
	}: {
		imagePath: string;
		onImageChange: (newPath: string) => Promise<void>;
		openFileDialog: () => void;
		onSwitchToGrid?: () => Promise<void>;
	} = $props();

	// viewerStoreから状態とアクションを取得
	const { state: viewerState, actions: viewerActions } = viewerStore;

	// ズーム状態を管理
	let isZoomed = $state(false);

	const handleZoomStateChange = (zoomed: boolean) => {
		isZoomed = zoomed;
	};

	// navigationStore初期化（imagePath依存）
	onMount(async () => {
		if (imagePath) {
			console.log('🔄 Initializing navigationStore with: ' + imagePath.split('/').pop());
			await navigationStore.actions.initializeNavigation(imagePath);
			console.log('✅ NavigationStore initialized');
		}
	});

	// imagePathが変更された時にnavigationStoreを更新
	$effect(() => {
		if (imagePath) {
			console.log('🔄 Updating navigationStore for: ' + imagePath.split('/').pop());
			navigationStore.actions
				.initializeNavigation(imagePath)
				.then(() => {
					console.log('✅ NavigationStore updated');
				})
				.catch((error: unknown) => {
					console.error('❌ Failed to update navigationStore: ' + error);
				});

			// 現在表示中の画像のメタデータとサムネイルを優先ロード
			console.log('🚨 Priority loading for viewer: ' + imagePath.split('/').pop());
			const metadataStore = metadataRegistry.getOrCreateStore(imagePath);
			const thumbnailStore = thumbnailRegistry.getOrCreateStore(imagePath);

			metadataStore.actions.ensureLoaded().catch((error) => {
				console.error('Failed to load metadata for ' + imagePath.split('/').pop() + ': ' + error);
			});

			thumbnailStore.actions.ensureLoaded().catch((error) => {
				console.error('Failed to load thumbnail for ' + imagePath.split('/').pop() + ': ' + error);
			});
		}
	});

	// キーボードイベントハンドラー（ViewerPageにスコープ）
	const handleKeydown = (event: KeyboardEvent): void => {
		// 情報パネルにフォーカスがある場合はキーボードナビゲーションを無効にする
		if (viewerState.ui.isInfoPanelFocused) return;

		const handleAsync = async (): Promise<void> => {
			switch (event.key) {
				case 'ArrowRight':
					event.preventDefault();
					console.log('➡️➡️➡️');
					await navigationStore.actions.navigateNext();
					if (navigationStore.state.currentFilePath)
						await onImageChange(navigationStore.state.currentFilePath);
					break;
				case 'ArrowLeft':
					event.preventDefault();
					console.log('⬅️⬅️⬅️');
					await navigationStore.actions.navigatePrevious();
					if (navigationStore.state.currentFilePath)
						await onImageChange(navigationStore.state.currentFilePath);
					break;
			}
		};

		handleAsync().catch((error) => {
			console.error('Keyboard handler error: ' + error);
		});
	};

	// グローバルキーボードイベントリスナー（UIの表示状態に関係なく動作）
	onMount(() => {
		const handleGlobalKeyDown = (event: KeyboardEvent) => {
			handleKeydown(event);
		};

		window.addEventListener('keydown', handleGlobalKeyDown);

		return () => {
			window.removeEventListener('keydown', handleGlobalKeyDown);
		};
	});

	// 自動ナビゲーション用のハンドラー
	const handleAutoNavigation = async (): Promise<void> => {
		await navigationStore.actions.navigateNext();
		if (navigationStore.state.currentFilePath) {
			await onImageChange(navigationStore.state.currentFilePath);
		}
	};

	// Svelte 5の@attachで使用するアタッチメント
	const attachment: Attachment = (element) => {
		const htmlElement = element as HTMLElement;
		htmlElement.addEventListener('mousemove', viewerActions.handleMouseMove);
		return () => {
			htmlElement.removeEventListener('mousemove', viewerActions.handleMouseMove);
			// 自動ナビゲーションを停止
			viewerActions.stopAutoNavigation();
			// UIタイマーをリセット（app-store内で管理）
			viewerActions.resetUITimer();
		};
	};

	console.log('🖼️ ViewerPage initialized with Svelte 5 patterns');
</script>

<!-- メイン画面のレイアウト（@attachでキーボードイベントとクリーンアップをこのコンポーネントにスコープ） -->
<div
	class="relative flex h-full bg-base-300 outline-none"
	tabindex="-1"
	role="application"
	aria-label="Image viewer"
	{@attach attachment}
>
	<!-- メインキャンバスエリア -->
	<div
		class="relative flex-1"
		style="width: {viewerState.ui.isInfoPanelVisible
			? `calc(100% - ${viewerState.ui.infoPanelWidth}px)`
			: '100%'}"
	>
		<!-- 画像読み込み状態表示 -->
		{#if viewerState.imageState.isLoading}
			<div class="absolute inset-0 flex items-center justify-center bg-base-300">
				<div class="loading loading-lg loading-spinner text-primary"></div>
			</div>
		{:else if viewerState.imageState.error}
			<div class="absolute inset-0 flex items-center justify-center bg-base-300">
				<div class="text-lg text-error">{viewerState.imageState.error}</div>
			</div>
		{:else if viewerState.imageState.imageUrl}
			<ImageCanvas
				imageUrl={viewerState.imageState.imageUrl}
				isLoading={viewerState.imageState.isLoading}
				error={viewerState.imageState.error}
				onZoomStateChange={handleZoomStateChange}
			/>
		{/if}

		<!-- UI要素のオーバーレイ（ズーム時は非表示） -->
		{#if viewerState.ui.isVisible && !isZoomed}
			<ViewerUIOverlay
				imagePath={navigationStore.state.currentFilePath}
				{openFileDialog}
				{onSwitchToGrid}
				onToggleInfoPanel={viewerActions.toggleInfoPanel}
				isInfoPanelVisible={viewerState.ui.isInfoPanelVisible}
				onToggleAutoNavigation={() => viewerActions.startAutoNavigation(handleAutoNavigation)}
				isAutoNavActive={viewerState.autoNav.isActive}
				onCopyToClipboard={async () => {
					try {
						await invoke('set_clipboard_files', { paths: [imagePath] });
						toastStore.actions.showSuccessToast('Image copied to clipboard');
					} catch (error) {
						console.error('Failed to copy image to clipboard: ' + error);
						toastStore.actions.showInfoToast('Failed to copy image to clipboard');
					}
				}}
				goToPrevious={async () => {
					await navigationStore.actions.navigatePrevious();
					if (navigationStore.state.currentFilePath) {
						await onImageChange(navigationStore.state.currentFilePath);
					}
				}}
				goToNext={async () => {
					await navigationStore.actions.navigateNext();
					if (navigationStore.state.currentFilePath) {
						await onImageChange(navigationStore.state.currentFilePath);
					}
				}}
				isNavigating={navigationStore.state.isNavigating}
			/>
		{/if}
	</div>

	<!-- 情報パネル -->
	{#if viewerState.ui.isInfoPanelVisible}
		<div
			class="relative flex-shrink-0 border-l border-base-300 bg-base-100"
			style="width: {viewerState.ui.infoPanelWidth}px"
		>
			<!-- リサイズハンドル -->
			<button
				type="button"
				class="absolute top-0 bottom-0 left-0 w-1 cursor-col-resize bg-base-300 transition-colors hover:bg-primary"
				onmousedown={(e) =>
					viewerActions.handleResize(e, INFO_PANEL_MIN_WIDTH, INFO_PANEL_MAX_WIDTH)}
				aria-label="Resize panel"
			></button>

			<!-- パネル内容 -->
			<div
				class="h-full overflow-hidden"
				onfocus={() => viewerActions.setInfoPanelFocus(true)}
				onblur={() => viewerActions.setInfoPanelFocus(false)}
				tabindex="-1"
			>
				<MetadataPanel {imagePath} />
			</div>
		</div>
	{/if}
</div>
