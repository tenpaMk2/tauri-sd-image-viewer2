<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { platform } from '@tauri-apps/plugin-os';
	import { onMount } from 'svelte';
	import { createKeyboardNavigationHandler } from './hooks/use-keyboard-navigation';
	import ImageCanvas from './ImageCanvas.svelte';
	import MetadataPanel from './MetadataPanel.svelte';
	import NavigationButtons from './NavigationButtons.svelte';
	import { navigationService } from './services/navigation-service.svelte';
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

	// メタデータサービスを$derivedで取得（状態更新なし）
	let reactiveMetadata = $derived.by(() => {
		if (!imagePath) return null;
		console.log('📊 Getting reactive metadata for: ' + imagePath.split('/').pop());
		return imageMetadataStore.getMetadata(imagePath);
	});

	// デバッグ: ViewerPage初期化ログ
	console.log(
		'🖼️ ViewerPage initialized with imagePath: ' + (imagePath ? imagePath.split('/').pop() : 'null')
	);

	console.log('🔄 Initializing ViewerPage states...');

	// 画像表示関連の状態を個別のリアクティブ変数に分割
	let imageUrl = $state<string>('');
	let imageIsLoading = $state<boolean>(true);
	let imageError = $state<string>('');

	console.log('✅ ImageState initialized');

	let isInfoPanelFocused = $state<boolean>(false);
	let isInfoPanelVisible = $state<boolean>(true);
	let infoPanelWidth = $state<number>(320);
	let isResizing = $state<boolean>(false);
	let isAutoNavActive = $state<boolean>(false);
	let autoNavTimer: number | null = null;
	console.log('✅ All ViewerPage states initialized');

	// UI自動隠し機能
	let isUIVisible = $state<boolean>(true);
	let uiTimer: number | null = null;

	// プラットフォーム判定
	let isMacOS = $state<boolean>(false);

	// 基本的な画像読み込み機能
	const loadCurrentImage = async (path: string) => {
		console.log('📸 loadCurrentImage called with path: ' + (path ? path.split('/').pop() : 'null'));
		try {
			// 個別状態を更新
			imageUrl = '';
			imageIsLoading = true;
			imageError = '';

			console.log('🔄 Calling navigationService.loadImage...');
			const url = await navigationService.loadImage(path);
			console.log('✅ Image loaded, URL: ' + (url ? 'blob:...' : 'null'));

			// 成功時の状態更新
			imageUrl = url;
			imageIsLoading = false;
			imageError = '';

			console.log(
				'🔄 ViewerPage state updated: imageUrl=' +
					(imageUrl ? 'set' : 'null') +
					' isLoading=' +
					imageIsLoading +
					' error=' +
					(imageError || 'empty')
			);
		} catch (err) {
			console.error('❌ loadCurrentImage failed: ' + err);
			// エラー時の状態更新
			imageUrl = '';
			imageIsLoading = false;
			imageError = err instanceof Error ? err.message : 'Failed to load image';
		}
		console.log('✅ loadCurrentImage completed, final state:', {
			url: imageUrl ? 'blob:...' : 'null',
			isLoading: imageIsLoading,
			error: imageError || 'empty'
		});
	};

	// 初期化処理を簡略化
	const initializeImages = async (path: string): Promise<void> => {
		console.log('📂 ===== initializeImages START =====');
		console.log('📂 Path: ' + (path ? path.split('/').pop() : 'null'));
		console.log('📂 Full path: ' + path);

		try {
			// 画像状態をリセット
			imageUrl = '';
			imageIsLoading = true;
			imageError = '';
			console.log('🔄 Image state reset to loading');

			console.log('🧭 Calling navigationService.initializeNavigation...');
			await navigationService.initializeNavigation(path);
			console.log(
				'✅ Navigation initialized successfully:' +
					' files=' +
					navigationService.navigationState.files.length +
					' currentIndex=' +
					navigationService.navigationState.currentIndex +
					' isNavigating=' +
					navigationService.navigationState.isNavigating
			);

			if (navigationService.navigationState.files.length === 0) {
				throw new Error('No image files found in the directory');
			}

			console.log('🖼️ Loading current image...');
			await loadCurrentImage(path);
			console.log('✅ Current image loaded successfully - URL generated');

			console.log('📂 ===== initializeImages SUCCESS =====');
		} catch (error) {
			console.error('❌ initializeImages failed: ' + error);
			// エラー時の状態更新
			imageUrl = '';
			imageIsLoading = false;
			imageError = error instanceof Error ? error.message : 'Failed to load directory';
			console.log('📂 ===== initializeImages FAILED =====');
		}
	};

	// ナビゲーション状態をパス基準で更新
	const updateNavigationFromPath = async (currentPath: string): Promise<void> => {
		try {
			await navigationService.updateNavigationWithCurrentPath(currentPath);
		} catch (error) {
			console.error('Failed to update navigation from path: ' + error);
		}
	};

	// ナビゲーション関数（新しいリアクティブサービスに対応）
	const goToPrevious = async (): Promise<void> => {
		if (!navigationService.navigationState.isNavigating) {
			stopAutoNavigation(); // 手動ナビゲーション時は自動ナビゲーション停止
			showUI(); // ナビゲーション時にUIを表示

			// パス基準でナビゲーション状態を更新
			const currentPath =
				navigationService.navigationState.files[navigationService.navigationState.currentIndex];
			await updateNavigationFromPath(currentPath);

			// 前の画像があるかチェック
			if (navigationService.hasPrevious) {
				const newPath = await navigationService.navigatePrevious();
				if (newPath) {
					await loadCurrentImage(newPath);
					await onImageChange(newPath);

					// 隣接画像のプリロード（バックグラウンドで実行）
					navigationService.preloadAdjacentByPath(newPath).catch((error) => {
						console.warn('Preload failed:', error);
					});
				}
			}
		}
	};

	const goToNext = async (): Promise<void> => {
		if (!navigationService.navigationState.isNavigating) {
			stopAutoNavigation(); // 手動ナビゲーション時は自動ナビゲーション停止
			showUI(); // ナビゲーション時にUIを表示

			// パス基準でナビゲーション状態を更新
			const currentPath =
				navigationService.navigationState.files[navigationService.navigationState.currentIndex];
			await updateNavigationFromPath(currentPath);

			// 次の画像があるかチェック
			if (navigationService.hasNext) {
				const newPath = await navigationService.navigateNext();
				if (newPath) {
					await loadCurrentImage(newPath);
					await onImageChange(newPath);

					// 隣接画像のプリロード（バックグラウンドで実行）
					navigationService.preloadAdjacentByPath(newPath).catch((error) => {
						console.warn('Preload failed:', error);
					});
				}
			}
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
		const latestIndex = navigationService.navigationState.files.length - 1;
		if (
			0 <= latestIndex &&
			latestIndex !== navigationService.navigationState.currentIndex &&
			!navigationService.navigationState.isNavigating
		) {
			const newPath = await navigationService.navigateToIndex(latestIndex);
			if (newPath) {
				await loadCurrentImage(newPath);
				await onImageChange(newPath);
			}
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
				const latestIndex = navigationService.navigationState.files.length - 1;
				if (latestIndex !== navigationService.navigationState.currentIndex) {
					await goToLatest();
				}
			}, 2000);
		}
	};

	// クリップボード機能
	const copyToClipboard = async (): Promise<void> => {
		const currentPath =
			navigationService.navigationState.files[navigationService.navigationState.currentIndex];
		if (!currentPath) return;

		try {
			await invoke('set_clipboard_files', { paths: [currentPath] });
			showSuccessToast('Image copied to clipboard');
		} catch (error) {
			console.error('Failed to copy to clipboard: ' + error);
		}
	};

	// TestViewerPageと同じパターン：$effect外で実行される画像読み込み関数
	const loadImageForPath = async (path: string): Promise<void> => {
		console.log('📂 ===== ViewerPage loadImageForPath START =====');
		console.log('📂 Path: ' + (path ? path.split('/').pop() : 'null'));

		try {
			// 画像状態をリセット
			imageUrl = '';
			imageIsLoading = true;
			imageError = '';
			console.log('🔄 Image state reset to loading');

			console.log('🧭 Calling navigationService.initializeNavigation...');
			await navigationService.initializeNavigation(path);

			console.log(
				'✅ Navigation initialized: files=' +
					navigationService.navigationState.files.length +
					' currentIndex=' +
					navigationService.navigationState.currentIndex
			);

			if (navigationService.navigationState.files.length === 0) {
				throw new Error('No image files found in the directory');
			}

			console.log('🖼️ Loading current image...');
			await loadCurrentImage(path);
			console.log('✅ Current image loaded successfully');

			console.log('📂 ===== ViewerPage loadImageForPath SUCCESS =====');
		} catch (err) {
			console.error('❌ ViewerPage loadImageForPath failed: ' + err);
			// エラー時の状態更新
			imageUrl = '';
			imageIsLoading = false;
			imageError = err instanceof Error ? err.message : 'Failed to load directory';
			console.log('📂 ===== ViewerPage loadImageForPath FAILED =====');
		}
	};

	// $effectは状態更新しないでサイドエフェクト（画像読み込みトリガー）のみ
	$effect(() => {
		const currentPath = imagePath;
		const metadata = reactiveMetadata; // メタデータ依存関係を追加

		console.log(
			'🔄 ViewerPage Path/metadata changed, triggering image load: ' +
				(currentPath ? currentPath.split('/').pop() : 'null')
		);
		console.log(
			'📊 ViewerPage Metadata state: ' +
				(metadata ? 'isLoaded=' + metadata.isLoaded + ' isLoading=' + metadata.isLoading : 'null')
		);

		if (!currentPath) {
			console.warn('⚠️ No imagePath provided');
			return;
		}

		// メタデータが存在し、読み込み完了または読み込み中でない場合は読み込みを開始
		if (metadata && !metadata.isLoaded && !metadata.isLoading) {
			console.log('📊 ViewerPage Starting metadata load before image load...');
			metadata
				.load()
				.then(() => {
					console.log('✅ ViewerPage Metadata load completed, now loading image');
					loadImageForPath(currentPath);
				})
				.catch((error: unknown) => {
					console.error('❌ ViewerPage Metadata load failed: ' + error);
					// メタデータ読み込み失敗でも画像読み込みは実行
					loadImageForPath(currentPath);
				});
		} else {
			console.log('⏭️ ViewerPage Metadata already loaded or loading, proceeding with image load');
			// 直接非同期処理を実行（状態更新は関数内で行う）
			loadImageForPath(currentPath);
		}
	});

	// 一回だけの初期化処理（同期処理のみ）
	onMount(() => {
		// プラットフォーム判定（非同期だが一回だけなのでonMount内で実行）
		const initializePlatform = async () => {
			try {
				const currentPlatform = await platform();
				isMacOS = currentPlatform === 'macos';
			} catch (error) {
				console.error('Failed to detect platform: ' + error);
				isMacOS = false;
			}
		};
		initializePlatform();

		// キーボードイベントリスナーの設定
		document.addEventListener('keydown', handleKeydown);

		// UI自動隠しタイマーの初期化
		resetUITimer();

		// マウスムーブイベントリスナーの設定
		document.addEventListener('mousemove', handleMouseMove);

		// クリーンアップ関数を返す（同期関数なので正常に動作）
		return () => {
			document.removeEventListener('keydown', handleKeydown);
			document.removeEventListener('mousemove', handleMouseMove);
			stopAutoNavigation();
			if (uiTimer !== null) {
				clearTimeout(uiTimer);
			}
		};
	});
</script>

{console.log('🎨 ViewerPage rendering started')}
<div class="relative flex h-screen">
	<!-- Image Display Area (Full) -->
	<div class="relative flex-1 bg-black">
		<ToolbarOverlay
			imageFiles={navigationService.navigationState.files}
			currentIndex={navigationService.navigationState.currentIndex}
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
			{imageUrl}
			isLoading={imageIsLoading}
			error={imageError}
			imagePath={navigationService.navigationState.files[
				navigationService.navigationState.currentIndex
			]}
			{isUIVisible}
		/>
		<NavigationButtons
			imageFiles={navigationService.navigationState.files}
			currentIndex={navigationService.navigationState.currentIndex}
			isNavigating={navigationService.navigationState.isNavigating}
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
				imagePath={navigationService.navigationState.files[
					navigationService.navigationState.currentIndex
				]}
				onFocus={handleInfoPanelFocus}
				onBlur={handleInfoPanelBlur}
			/>
		</div>
	{/if}
</div>
