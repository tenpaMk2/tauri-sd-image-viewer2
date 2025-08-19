<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { platform } from '@tauri-apps/plugin-os';
	import { onMount } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import ImageCanvas from './ImageCanvas.svelte';
	import MetadataPanel from './MetadataPanel.svelte';
	import NavigationButtons from './NavigationButtons.svelte';
	import { navigationService } from './services/navigation-service.svelte';
	import { appStore } from './stores/app-store.svelte';
	import { imageMetadataStore } from './stores/image-metadata-store.svelte';
	import { showInfoToast, showSuccessToast } from './stores/toast.svelte';
	import ToolbarOverlay from './ToolbarOverlay.svelte';

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

	// メタデータを$derivedで取得
	let reactiveMetadata = $derived.by(() => {
		if (!imagePath) return null;
		console.log('📊 Getting reactive metadata for: ' + imagePath.split('/').pop());
		return imageMetadataStore.getMetadata(imagePath);
	});

	// プラットフォーム判定
	let isMacOS = $state(false);

	// 一回限りの初期化処理
	onMount(async () => {
		// プラットフォーム判定（一回だけ実行）
		try {
			const platformName = await platform();
			isMacOS = platformName === 'macos';
		} catch (error) {
			console.error('Failed to get platform: ' + error);
		}

		// navigationServiceを初期化
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
					const next = await navigationService.navigateNext();
					if (next) await onImageChange(next);
					break;
				case 'ArrowLeft':
					event.preventDefault();
					console.log('⬅️⬅️⬅️');
					const prev = await navigationService.navigatePrevious();
					if (prev) await onImageChange(prev);
					break;
			}
		};

		handleAsync().catch((error) => {
			console.error('Keyboard handler error: ' + error);
		});
	};

	// 自動ナビゲーション用のハンドラー
	const handleAutoNavigation = async (): Promise<void> => {
		const next = await navigationService.navigateNext();
		if (next) await onImageChange(next);
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
			/>
		{/if}

		<!-- UI要素のオーバーレイ -->
		{#if appState.viewer.ui.isVisible}
			<div class="pointer-events-none absolute inset-0">
				<!-- ツールバー -->
				<div class="pointer-events-auto">
					<ToolbarOverlay
						imageFiles={navigationService.files}
						currentIndex={navigationService.currentIndex}
						{openFileDialog}
						{onSwitchToGrid}
						onToggleInfoPanel={actions.toggleInfoPanel}
						isInfoPanelVisible={appState.viewer.ui.isInfoPanelVisible}
						onToggleAutoNavigation={() => actions.startAutoNavigation(handleAutoNavigation)}
						isAutoNavActive={appState.viewer.autoNav.isActive}
						isUIVisible={appState.viewer.ui.isVisible}
						onCopyToClipboard={async () => {
							try {
								await invoke('copy_image_to_clipboard', { imagePath });
								showSuccessToast('Image copied to clipboard');
							} catch (error) {
								console.error('Failed to copy image to clipboard: ' + error);
								showInfoToast('Failed to copy image to clipboard');
							}
						}}
						{isMacOS}
					/>
				</div>

				<!-- ナビゲーションボタン -->
				<div class="pointer-events-auto">
					<NavigationButtons
						imageFiles={navigationService.files}
						currentIndex={navigationService.currentIndex}
						isNavigating={navigationService.isNavigating}
						goToPrevious={async () => {
							const prev = await navigationService.navigatePrevious();
							if (prev) await onImageChange(prev);
						}}
						goToNext={async () => {
							const next = await navigationService.navigateNext();
							if (next) await onImageChange(next);
						}}
						isUIVisible={appState.viewer.ui.isVisible}
					/>
				</div>
			</div>
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
				onmousedown={(e) => actions.handleResize(e, 280, 600)}
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
