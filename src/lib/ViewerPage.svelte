<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { platform } from '@tauri-apps/plugin-os';
	import { createKeyboardNavigationHandler } from './hooks/use-keyboard-navigation';
	import type { ImageMetadata } from './image/types';
	import ImageCanvas from './ImageCanvas.svelte';
	import MetadataPanel from './MetadataPanel.svelte';
	import NavigationButtons from './NavigationButtons.svelte';
	import { NavigationService, type NavigationState } from './services/navigation-service';
	import { showInfoToast, showSuccessToast } from './stores/toast.svelte';
	import ToolbarOverlay from './ToolbarOverlay.svelte';

	const {
		metadata,
		imagePath,
		onImageChange,
		openFileDialog,
		onSwitchToGrid,
		refreshMetadata
	}: {
		metadata: ImageMetadata;
		imagePath: string;
		onImageChange: (newPath: string) => Promise<void>;
		openFileDialog: () => void;
		onSwitchToGrid?: () => Promise<void>;
		refreshMetadata?: () => Promise<void>;
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
			imageState.error = err instanceof Error ? err.message : 'Failed to load image';
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
			imageState.error = error instanceof Error ? error.message : 'Failed to load directory';
		}
	};

	// ナビゲーション状態をパス基準で更新
	const updateNavigationFromPath = async (currentPath: string): Promise<void> => {
		try {
			const updatedNavigation = await navigationService.updateNavigationWithCurrentPath(currentPath);
			navigationState.files = updatedNavigation.files;
			navigationState.currentIndex = updatedNavigation.currentIndex;
		} catch (error) {
			console.error('Failed to update navigation from path: ' + error);
		}
	};

	// ナビゲーション関数（パス基準で改良）
	const goToPrevious = async (): Promise<void> => {
		if (!navigationState.isNavigating) {
			stopAutoNavigation(); // 手動ナビゲーション時は自動ナビゲーション停止
			showUI(); // ナビゲーション時にUIを表示
			
			navigationState.isNavigating = true;
			
			// パス基準でナビゲーション状態を更新
			const currentPath = navigationState.files[navigationState.currentIndex];
			await updateNavigationFromPath(currentPath);
			
			// 前の画像があるかチェック
			if (0 < navigationState.currentIndex) {
				const newIndex = navigationState.currentIndex - 1;
				const newPath = navigationState.files[newIndex];
				
				navigationState.currentIndex = newIndex;
				await loadCurrentImage(newPath);
				await onImageChange(newPath);
				
				// 隣接画像のプリロード（バックグラウンドで実行）
				navigationService.preloadAdjacentByPath(newPath).catch((error) => {
					console.warn('Preload failed:', error);
				});
			}
			
			navigationState.isNavigating = false;
		}
	};

	const goToNext = async (): Promise<void> => {
		if (!navigationState.isNavigating) {
			stopAutoNavigation(); // 手動ナビゲーション時は自動ナビゲーション停止
			showUI(); // ナビゲーション時にUIを表示
			
			navigationState.isNavigating = true;
			
			// パス基準でナビゲーション状態を更新
			const currentPath = navigationState.files[navigationState.currentIndex];
			await updateNavigationFromPath(currentPath);
			
			// 次の画像があるかチェック
			if (navigationState.currentIndex < navigationState.files.length - 1) {
				const newIndex = navigationState.currentIndex + 1;
				const newPath = navigationState.files[newIndex];
				
				navigationState.currentIndex = newIndex;
				await loadCurrentImage(newPath);
				await onImageChange(newPath);
				
				// 隣接画像のプリロード（バックグラウンドで実行）
				navigationService.preloadAdjacentByPath(newPath).catch((error) => {
					console.warn('Preload failed:', error);
				});
			}
			
			navigationState.isNavigating = false;
		}
	};

	// キーボードナビゲーション
	const handleKeydown = (event: KeyboardEvent) => {
		showUI(); // キーボード操作時にUIを表示
		return createKeyboardNavigationHandler(goToPrevious, goToNext, () => isInfoPanelFocused)(event);
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

	// Rating更新用の軽量メタデータ再読み込み（画像は再読み込みしない）
	const refreshMetadataOnly = async (): Promise<void> => {
		if (refreshMetadata) {
			// 軽量なメタデータ更新を実行
			await refreshMetadata();
		} else {
			// fallback: 従来の方法
			const currentPath = navigationState.files[navigationState.currentIndex];
			if (currentPath) {
				await onImageChange(currentPath);
			}
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
		if (
			0 <= latestIndex &&
			latestIndex !== navigationState.currentIndex &&
			!navigationState.isNavigating
		) {
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
			showInfoToast('Auto navigation to latest image enabled');
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
			showSuccessToast('Image copied to clipboard');
		} catch (error) {
			console.error('Failed to copy to clipboard: ' + error);
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
				console.error('Failed to detect platform: ' + error);
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
	<!-- Image Display Area (Full) -->
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
			onRatingUpdate={() => refreshMetadataOnly()}
			{isUIVisible}
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

	<!-- Resizer -->
	{#if isInfoPanelVisible}
		<div
			class="z-20 w-1 flex-shrink-0 cursor-col-resize bg-base-300 transition-colors select-none hover:bg-primary"
			class:bg-primary={isResizing}
			role="button"
			tabindex="0"
			aria-label="Adjust Info Panel Width"
			title="Drag to adjust width"
			onmousedown={startResize}
		></div>
	{/if}

	<!-- Info Panel -->
	{#if isInfoPanelVisible}
		<div style="width: {infoPanelWidth}px" class="flex-shrink-0">
			<MetadataPanel
				imagePath={navigationState.files[navigationState.currentIndex]}
				onRatingUpdate={() => refreshMetadataOnly()}
				onFocus={handleInfoPanelFocus}
				onBlur={handleInfoPanelBlur}
			/>
		</div>
	{/if}
</div>
