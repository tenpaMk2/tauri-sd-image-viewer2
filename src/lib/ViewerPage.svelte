<script lang="ts">
	import { navigationService } from '$lib/services/navigation-service.svelte';
	import { invoke } from '@tauri-apps/api/core';
	import { platform } from '@tauri-apps/plugin-os';
	import { onMount } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import ImageCanvas from './ImageCanvas.svelte';
	import MetadataPanel from './MetadataPanel.svelte';
	import { appStore } from './stores/app-store.svelte';
	import { showInfoToast, showSuccessToast } from './stores/toast.svelte';
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

	// app-storeから状態とアクションを取得
	const { state: appState, actions } = appStore;

	// ズーム状態を管理
	let isZoomed = $state(false);

	const handleZoomStateChange = (zoomed: boolean) => {
		isZoomed = zoomed;
	};

	// プラットフォーム判定
	let isMacOs = $state(false);

	// プラットフォーム判定（一回だけ実行）
	onMount(async () => {
		try {
			const platformName = await platform();
			isMacOs = platformName === 'macos';
		} catch (error) {
			console.error('Failed to get platform: ' + error);
		}
	});

	// navigationService初期化（imagePath依存）
	onMount(async () => {
		if (imagePath) {
			console.log('🔄 Initializing navigationService with: ' + imagePath.split('/').pop());
			await navigationService.initializeNavigation(imagePath);
			console.log('✅ NavigationService initialized');
		}
	});

	// imagePathが変更された時にnavigationServiceを更新
	$effect(() => {
		if (imagePath) {
			console.log('🔄 Updating navigationService for: ' + imagePath.split('/').pop());
			navigationService
				.initializeNavigation(imagePath)
				.then(() => {
					console.log('✅ NavigationService updated');
				})
				.catch((error: unknown) => {
					console.error('❌ Failed to update navigationService: ' + error);
				});
		}
	});

	// キーボードイベントハンドラー（ViewerPageにスコープ）
	const handleKeydown = (event: KeyboardEvent): void => {
		// 情報パネルにフォーカスがある場合はキーボードナビゲーションを無効にする
		if (appState.viewer.ui.isInfoPanelFocused) return;

		const handleAsync = async (): Promise<void> => {
			switch (event.key) {
				case 'ArrowRight':
					event.preventDefault();
					console.log('➡️➡️➡️');
					await navigationService.navigateNext();
					if (navigationService.currentFilePath)
						await onImageChange(navigationService.currentFilePath);
					break;
				case 'ArrowLeft':
					event.preventDefault();
					console.log('⬅️⬅️⬅️');
					await navigationService.navigatePrevious();
					if (navigationService.currentFilePath)
						await onImageChange(navigationService.currentFilePath);
					break;
			}
		};

		handleAsync().catch((error) => {
			console.error('Keyboard handler error: ' + error);
		});
	};

	// 自動ナビゲーション用のハンドラー
	const handleAutoNavigation = async (): Promise<void> => {
		await navigationService.navigateNext();
		if (navigationService.currentFilePath) {
			await onImageChange(navigationService.currentFilePath);
		}
	};

	// Svelte 5の@attachで使用するアタッチメント
	const attachment: Attachment = (element) => {
		const htmlElement = element as HTMLElement;
		htmlElement.addEventListener('mousemove', actions.handleMouseMove);
		htmlElement.addEventListener('keydown', handleKeydown);
		return () => {
			htmlElement.removeEventListener('mousemove', actions.handleMouseMove);
			htmlElement.removeEventListener('keydown', handleKeydown);
			// 自動ナビゲーションを停止
			actions.stopAutoNavigation();
			// UIタイマーをリセット（app-store内で管理）
			actions.resetUITimer();
		};
	};

	console.log('🖼️ ViewerPage initialized with Svelte 5 patterns');
</script>

<!-- メイン画面のレイアウト（@attachでキーボードイベントとクリーンアップをこのコンポーネントにスコープ） -->
<div
	class="relative flex h-full bg-base-300"
	tabindex="-1"
	role="application"
	aria-label="Image viewer"
	{@attach attachment}
>
	<!-- メインキャンバスエリア -->
	<div
		class="relative flex-1"
		style="width: {appState.viewer.ui.isInfoPanelVisible
			? `calc(100% - ${appState.viewer.ui.infoPanelWidth}px)`
			: '100%'}"
	>
		<!-- 画像読み込み状態表示 -->
		{#if appState.viewer.isLoading}
			<div class="absolute inset-0 flex items-center justify-center bg-base-300">
				<div class="loading loading-lg loading-spinner text-primary"></div>
			</div>
		{:else if appState.viewer.error}
			<div class="absolute inset-0 flex items-center justify-center bg-base-300">
				<div class="text-lg text-error">{appState.viewer.error}</div>
			</div>
		{:else if appState.viewer.imageUrl}
			<ImageCanvas
				imageUrl={appState.viewer.imageUrl}
				isLoading={appState.viewer.isLoading}
				error={appState.viewer.error}
				onZoomStateChange={handleZoomStateChange}
			/>
		{/if}

		<!-- UI要素のオーバーレイ（ズーム時は非表示） -->
		{#if appState.viewer.ui.isVisible && !isZoomed}
			<ViewerUIOverlay
				imagePath={navigationService.currentFilePath}
				{openFileDialog}
				{onSwitchToGrid}
				onToggleInfoPanel={actions.toggleInfoPanel}
				isInfoPanelVisible={appState.viewer.ui.isInfoPanelVisible}
				onToggleAutoNavigation={() => actions.startAutoNavigation(handleAutoNavigation)}
				isAutoNavActive={appState.viewer.autoNav.isActive}
				onCopyToClipboard={async () => {
					try {
						await invoke('copy_image_to_clipboard', { imagePath });
						showSuccessToast('Image copied to clipboard');
					} catch (error) {
						console.error('Failed to copy image to clipboard: ' + error);
						showInfoToast('Failed to copy image to clipboard');
					}
				}}
				isMacOS={isMacOs}
				goToPrevious={async () => {
					await navigationService.navigatePrevious();
					if (navigationService.currentFilePath) {
						await onImageChange(navigationService.currentFilePath);
					}
				}}
				goToNext={async () => {
					await navigationService.navigateNext();
					if (navigationService.currentFilePath) {
						await onImageChange(navigationService.currentFilePath);
					}
				}}
				isNavigating={navigationService.isNavigating}
			/>
		{/if}
	</div>

	<!-- 情報パネル -->
	{#if appState.viewer.ui.isInfoPanelVisible}
		<div
			class="relative flex-shrink-0 border-l border-base-300 bg-base-100"
			style="width: {appState.viewer.ui.infoPanelWidth}px"
		>
			<!-- リサイズハンドル -->
			<button
				type="button"
				class="absolute top-0 bottom-0 left-0 w-1 cursor-col-resize bg-base-300 transition-colors hover:bg-primary"
				onmousedown={(e) => actions.handleResize(e, INFO_PANEL_MIN_WIDTH, INFO_PANEL_MAX_WIDTH)}
				aria-label="Resize panel"
			></button>

			<!-- パネル内容 -->
			<div
				class="h-full overflow-hidden"
				onfocus={() => actions.setInfoPanelFocus(true)}
				onblur={() => actions.setInfoPanelFocus(false)}
				tabindex="-1"
			>
				<MetadataPanel {imagePath} />
			</div>
		</div>
	{/if}
</div>
