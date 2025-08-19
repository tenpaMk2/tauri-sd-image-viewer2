<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { platform } from '@tauri-apps/plugin-os';
	import { onMount } from 'svelte';
	import { createKeyboardNavigationHandler } from './hooks/use-keyboard-navigation';
	import ImageCanvas from './ImageCanvas.svelte';
	import MetadataPanel from './MetadataPanel.svelte';
	import NavigationButtons from './NavigationButtons.svelte';
	import { metadataService } from './services/metadata-service.svelte';
	import { NavigationService, type NavigationState } from './services/navigation-service';
	import { showInfoToast, showSuccessToast } from './stores/toast.svelte';
	import ToolbarOverlay from './ToolbarOverlay.svelte';

	const {
		imagePath,
		onImageChange,
		openFileDialog,
		onSwitchToGrid,
		refreshMetadata
	}: {
		imagePath: string;
		onImageChange: (newPath: string) => Promise<void>;
		openFileDialog: () => void;
		onSwitchToGrid?: () => Promise<void>;
		refreshMetadata?: () => Promise<void>;
	} = $props();

	// メタデータサービスを$derivedで取得（状態更新なし）
	let reactiveMetadata = $derived.by(() => {
		if (!imagePath) return null;
		console.log('📊 Getting reactive metadata for: ' + imagePath.split('/').pop());
		return metadataService.getReactiveMetadata(imagePath);
	});

	// デバッグ: ViewerPage初期化ログ
	console.log(
		'🖼️ ViewerPage initialized with imagePath: ' + (imagePath ? imagePath.split('/').pop() : 'null')
	);

	// フォールバックタイマーは削除（$effectの正しい使用で不要）

	// NavigationService初期化
	let navigationService: NavigationService;
	try {
		console.log('🧭 Initializing NavigationService...');
		navigationService = new NavigationService();
		console.log('✅ NavigationService initialized successfully');
	} catch (error) {
		console.error('❌ NavigationService initialization failed: ' + error);
		throw error;
	}

	console.log('🔄 Initializing ViewerPage states...');

	// 画像表示関連の状態を個別のリアクティブ変数に分割
	let imageUrl = $state<string>('');
	let imageIsLoading = $state<boolean>(true);
	let imageError = $state<string>('');

	console.log('✅ ImageState initialized');

	let navigationState = $state<NavigationState>({
		files: [],
		currentIndex: 0,
		isNavigating: false
	});
	console.log('✅ NavigationState initialized');

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
			navigationState = await navigationService.initializeNavigation(path);
			console.log(
				'✅ Navigation initialized successfully:' +
					' files=' +
					navigationState.files.length +
					' currentIndex=' +
					navigationState.currentIndex +
					' isNavigating=' +
					navigationState.isNavigating
			);

			if (navigationState.files.length === 0) {
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
			const updatedNavigation =
				await navigationService.updateNavigationWithCurrentPath(currentPath);
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
			const newNavigationState = await navigationService.initializeNavigation(path);

			// Navigation状態を更新
			navigationState.files = newNavigationState.files;
			navigationState.currentIndex = newNavigationState.currentIndex;
			navigationState.isNavigating = newNavigationState.isNavigating;

			console.log(
				'✅ Navigation initialized: files=' +
					navigationState.files.length +
					' currentIndex=' +
					navigationState.currentIndex
			);

			if (navigationState.files.length === 0) {
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
			{imageUrl}
			isLoading={imageIsLoading}
			error={imageError}
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
