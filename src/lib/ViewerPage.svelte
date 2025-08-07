<script lang="ts">
	import type { ImageMetadata } from './image/types';
	import ImageCanvas from './ImageCanvas.svelte';
	import MetadataPanel from './MetadataPanel.svelte';
	import NavigationButtons from './NavigationButtons.svelte';
	import ToolbarOverlay from './ToolbarOverlay.svelte';
	import { createImageViewerHook } from './hooks/use-image-viewer';
	import { createKeyboardNavigationHandler } from './hooks/use-keyboard-navigation';
	import { createResizerHook } from './hooks/use-resizer';

	const {
		metadata,
		imagePath,
		onImageChange,
		openFileDialog,
		onSwitchToGrid
	}: {
		metadata: ImageMetadata;
		imagePath: string;
		onImageChange: (newPath: string) => Promise<void>;
		openFileDialog: () => void;
		onSwitchToGrid?: () => void;
	} = $props();

	let isInfoPanelFocused = $state<boolean>(false);

	// カスタムフックの使用
	const imageViewer = createImageViewerHook(metadata, imagePath, onImageChange);
	const resizer = createResizerHook(imageViewer.actions.setInfoPanelWidth);

	// キーボードナビゲーション
	const handleKeydown = createKeyboardNavigationHandler(
		imageViewer.actions.goToPrevious,
		imageViewer.actions.goToNext,
		() => isInfoPanelFocused
	);

	// 情報ペインのフォーカス状態を管理
	const handleInfoPanelFocus = (): void => {
		isInfoPanelFocused = true;
	};

	const handleInfoPanelBlur = (): void => {
		isInfoPanelFocused = false;
	};

	// キーボードイベントリスナーの設定
	$effect(() => {
		document.addEventListener('keydown', handleKeydown);
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<div class="relative flex h-screen">
	<!-- 画像表示エリア (全面) -->
	<div class="relative flex-1 bg-black">
		<ToolbarOverlay
			imageFiles={imageViewer.navigationState.files}
			currentIndex={imageViewer.navigationState.currentIndex}
			{openFileDialog}
			{onSwitchToGrid}
			onToggleInfoPanel={imageViewer.actions.toggleInfoPanel}
			isInfoPanelVisible={imageViewer.isInfoPanelVisible}
		/>

		<ImageCanvas
			imageUrl={imageViewer.imageState.url}
			isLoading={imageViewer.imageState.isLoading}
			error={imageViewer.imageState.error}
			{metadata}
			imagePath={imageViewer.navigationState.files[imageViewer.navigationState.currentIndex]}
			onRatingUpdate={imageViewer.actions.refreshCurrentImage}
		/>
		<NavigationButtons
			imageFiles={imageViewer.navigationState.files}
			currentIndex={imageViewer.navigationState.currentIndex}
			isNavigating={imageViewer.navigationState.isNavigating}
			goToPrevious={imageViewer.actions.goToPrevious}
			goToNext={imageViewer.actions.goToNext}
		/>
	</div>

	<!-- リサイザー -->
	{#if imageViewer.isInfoPanelVisible}
		<div
			class="z-20 w-1 flex-shrink-0 cursor-col-resize bg-base-300 transition-colors hover:bg-primary"
			onmousedown={resizer.handleMouseDown}
			role="button"
			tabindex="0"
			aria-label="情報ペインの幅を調整"
			title="ドラッグして幅を調整"
		></div>
	{/if}

	<!-- 情報ペイン -->
	{#if imageViewer.isInfoPanelVisible}
		<div style="width: {imageViewer.infoPanelWidth}px" class="flex-shrink-0">
			<MetadataPanel
				{metadata}
				imagePath={imageViewer.navigationState.files[imageViewer.navigationState.currentIndex]}
				onRatingUpdate={imageViewer.actions.refreshCurrentImage}
				onFocus={handleInfoPanelFocus}
				onBlur={handleInfoPanelBlur}
			/>
		</div>
	{/if}
</div>
