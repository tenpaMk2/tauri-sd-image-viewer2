<script lang="ts">
	import type { ImageMetadata } from './image/types';
	import ImageCanvas from './ImageCanvas.svelte';
	import MetadataPanel from './MetadataPanel.svelte';
	import NavigationButtons from './NavigationButtons.svelte';
	import ToolbarOverlay from './ToolbarOverlay.svelte';
	import { NavigationService, type NavigationState } from './services/navigation-service';
	import { createKeyboardNavigationHandler } from './hooks/use-keyboard-navigation';
	import { platform } from '@tauri-apps/plugin-os';
	import { invoke } from '@tauri-apps/api/core';

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

	// 画像表示関連の状態
	type ImageState = {
		url: string;
		isLoading: boolean;
		error: string;
	};

	const navigationService = new NavigationService();

	let imageState = $state<ImageState>({
		url: '',
		isLoading: true,
		error: ''
	});

	let navigationState = $state<NavigationState>({
		files: [],
		currentIndex: 0,
		isNavigating: false
	});

	let isInfoPanelFocused = $state<boolean>(false);
	let isInfoPanelVisible = $state<boolean>(true);
	let infoPanelWidth = $state<number>(320);
	let isResizing = $state<boolean>(false);
	let isAutoNavActive = $state<boolean>(false);
	let autoNavTimer: number | null = null;
	
	// UI自動隠し機能
	let isUIVisible = $state<boolean>(true);
	let uiTimer: number | null = null;

	// プラットフォーム判定
	let isMacOS = $state<boolean>(false);

	// 基本的な画像読み込み機能
	const loadCurrentImage = async (path: string) => {
		try {
			imageState.isLoading = true;
			imageState.error = '';
			const url = await navigationService.loadImage(path);
			imageState.url = url;
		} catch (err) {
			imageState.error = err instanceof Error ? err.message : '画像の読み込みに失敗しました';
		} finally {
			imageState.isLoading = false;
		}
	};

	// 初期化処理を簡略化
	const initializeImages = async (path: string): Promise<void> => {
		try {
			navigationState = await navigationService.initializeNavigation(path);
			await loadCurrentImage(path);
		} catch (error) {
			imageState.error =
				error instanceof Error ? error.message : 'ディレクトリの読み込みに失敗しました';
		}
	};

	// ナビゲーション関数
	const goToPrevious = async (): Promise<void> => {
		if (0 < navigationState.currentIndex && !navigationState.isNavigating) {
			stopAutoNavigation(); // 手動ナビゲーション時は自動ナビゲーション停止
			showUI(); // ナビゲーション時にUIを表示
			navigationState.isNavigating = true;
			navigationState.currentIndex = navigationState.currentIndex - 1;
			const newPath = navigationState.files[navigationState.currentIndex];
			await loadCurrentImage(newPath);
			await onImageChange(newPath);
			navigationState.isNavigating = false;
		}
	};

	const goToNext = async (): Promise<void> => {
		if (
			navigationState.currentIndex < navigationState.files.length - 1 &&
			!navigationState.isNavigating
		) {
			stopAutoNavigation(); // 手動ナビゲーション時は自動ナビゲーション停止
			showUI(); // ナビゲーション時にUIを表示
			navigationState.isNavigating = true;
			navigationState.currentIndex = navigationState.currentIndex + 1;
			const newPath = navigationState.files[navigationState.currentIndex];
			await loadCurrentImage(newPath);
			await onImageChange(newPath);
			navigationState.isNavigating = false;
		}
	};

	// キーボードナビゲーション
	const handleKeydown = (event: KeyboardEvent) => {
		showUI(); // キーボード操作時にUIを表示
		return createKeyboardNavigationHandler(
			goToPrevious,
			goToNext,
			() => isInfoPanelFocused
		)(event);
	};

	// 情報ペインの制御
	const toggleInfoPanel = (): void => {
		isInfoPanelVisible = !isInfoPanelVisible;
	};

	const handleInfoPanelFocus = (): void => {
		isInfoPanelFocused = true;
	};

	const handleInfoPanelBlur = (): void => {
		isInfoPanelFocused = false;
	};

	const refreshCurrentImage = async (): Promise<void> => {
		const currentPath = navigationState.files[navigationState.currentIndex];
		if (currentPath) {
			await onImageChange(currentPath);
		}
	};

	// リサイザーの制御
	const MIN_PANEL_WIDTH = 250;
	const MAX_PANEL_WIDTH = 600;

	const startResize = (event: MouseEvent): void => {
		isResizing = true;
		event.preventDefault();
		
		const handleMouseMove = (e: MouseEvent): void => {
			if (!isResizing) return;
			
			const containerWidth = window.innerWidth;
			const newWidth = containerWidth - e.clientX;
			
			if (MIN_PANEL_WIDTH <= newWidth && newWidth <= MAX_PANEL_WIDTH) {
				infoPanelWidth = newWidth;
			}
		};
		
		const handleMouseUp = (): void => {
			isResizing = false;
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
		
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	};

	// UI自動隠し機能
	const showUI = (): void => {
		isUIVisible = true;
		resetUITimer();
	};

	const hideUI = (): void => {
		isUIVisible = false;
	};

	const resetUITimer = (): void => {
		if (uiTimer !== null) {
			clearTimeout(uiTimer);
		}
		uiTimer = setTimeout(() => {
			hideUI();
		}, 1500);
	};

	const handleMouseMove = (): void => {
		if (!isUIVisible) {
			showUI();
		} else {
			resetUITimer();
		}
	};

	// 自動ナビゲーション機能
	const stopAutoNavigation = (): void => {
		if (autoNavTimer !== null) {
			clearInterval(autoNavTimer);
			autoNavTimer = null;
		}
		isAutoNavActive = false;
	};

	const goToLatest = async (): Promise<void> => {
		const latestIndex = navigationState.files.length - 1;
		if (0 <= latestIndex && latestIndex !== navigationState.currentIndex && !navigationState.isNavigating) {
			navigationState.isNavigating = true;
			navigationState.currentIndex = latestIndex;
			const newPath = navigationState.files[latestIndex];
			await loadCurrentImage(newPath);
			await onImageChange(newPath);
			navigationState.isNavigating = false;
		}
	};

	const toggleAutoNavigation = async (): Promise<void> => {
		if (isAutoNavActive) {
			stopAutoNavigation();
		} else {
			// 最初に最新画像に移動
			await goToLatest();
			
			// 自動ナビゲーションを開始
			isAutoNavActive = true;
			autoNavTimer = setInterval(async () => {
				const latestIndex = navigationState.files.length - 1;
				if (latestIndex !== navigationState.currentIndex) {
					await goToLatest();
				}
			}, 2000);
		}
	};

	// クリップボード機能
	const copyToClipboard = async (): Promise<void> => {
		const currentPath = navigationState.files[navigationState.currentIndex];
		if (!currentPath) return;

		try {
			await invoke('set_clipboard_files', { paths: [currentPath] });
			console.log('画像をクリップボードにコピーしました');
		} catch (error) {
			console.error('クリップボードへのコピーに失敗:', error);
		}
	};

	// 初期化
	$effect(() => {
		initializeImages(imagePath);
	});

	// プラットフォーム判定の初期化
	$effect(() => {
		const checkPlatform = async () => {
			try {
				const currentPlatform = await platform();
				isMacOS = currentPlatform === 'macos';
			} catch (error) {
				console.error('プラットフォーム判定に失敗:', error);
				isMacOS = false;
			}
		};
		checkPlatform();
	});

	// キーボードイベントリスナーの設定
	$effect(() => {
		document.addEventListener('keydown', handleKeydown);
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	// UI自動隠しタイマーの初期化
	$effect(() => {
		resetUITimer();
	});

	// マウスムーブイベントリスナーの設定
	$effect(() => {
		document.addEventListener('mousemove', handleMouseMove);
		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
		};
	});

	// コンポーネント破棄時のクリーンアップ
	$effect(() => {
		return () => {
			stopAutoNavigation();
			if (uiTimer !== null) {
				clearTimeout(uiTimer);
			}
		};
	});
</script>

<div class="relative flex h-screen">
	<!-- 画像表示エリア (全面) -->
	<div class="relative flex-1 bg-black">
		<ToolbarOverlay
			imageFiles={navigationState.files}
			currentIndex={navigationState.currentIndex}
			{openFileDialog}
			{onSwitchToGrid}
			onToggleInfoPanel={toggleInfoPanel}
			{isInfoPanelVisible}
			onToggleAutoNavigation={toggleAutoNavigation}
			{isAutoNavActive}
			{isUIVisible}
			onCopyToClipboard={copyToClipboard}
			{isMacOS}
		/>

		<ImageCanvas
			imageUrl={imageState.url}
			isLoading={imageState.isLoading}
			error={imageState.error}
			{metadata}
			imagePath={navigationState.files[navigationState.currentIndex]}
			onRatingUpdate={() => refreshCurrentImage()}
		/>
		<NavigationButtons
			imageFiles={navigationState.files}
			currentIndex={navigationState.currentIndex}
			isNavigating={navigationState.isNavigating}
			{goToPrevious}
			{goToNext}
			{isUIVisible}
		/>
	</div>

	<!-- リサイザー -->
	{#if isInfoPanelVisible}
		<div
			class="z-20 w-1 flex-shrink-0 cursor-col-resize bg-base-300 transition-colors hover:bg-primary select-none"
			class:bg-primary={isResizing}
			role="button"
			tabindex="0"
			aria-label="情報ペインの幅を調整"
			title="ドラッグして幅を調整"
			onmousedown={startResize}
		></div>
	{/if}

	<!-- 情報ペイン -->
	{#if isInfoPanelVisible}
		<div style="width: {infoPanelWidth}px" class="flex-shrink-0">
			<MetadataPanel
				{metadata}
				imagePath={navigationState.files[navigationState.currentIndex]}
				onRatingUpdate={() => refreshCurrentImage()}
				onFocus={handleInfoPanelFocus}
				onBlur={handleInfoPanelBlur}
			/>
		</div>
	{/if}
</div>
