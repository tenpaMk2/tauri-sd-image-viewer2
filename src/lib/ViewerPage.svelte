<script lang="ts">
	import type { ImageMetadata } from './image/types';
	import ImageCanvas from './ImageCanvas.svelte';
	import MetadataPanel from './MetadataPanel.svelte';
	import NavigationButtons from './NavigationButtons.svelte';
	import ToolbarOverlay from './ToolbarOverlay.svelte';
	import { NavigationService, type NavigationState } from './services/navigation-service';
	import { createKeyboardNavigationHandler } from './hooks/use-keyboard-navigation';

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

	// サービスインスタンス
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
	let infoPanelWidth = $state<number>(320); // デフォルト320px (w-80相当)
	let isDragging = $state<boolean>(false);

	// プリロード機能付きの画像読み込み
	const preloadImageData = async (path: string): Promise<string> => {
		return await navigationService.loadImage(path);
	};

	const loadCurrentImage = async (path: string) => {
		try {
			imageState.isLoading = true;
			imageState.error = '';
			const url = await preloadImageData(path);
			imageState.url = url;
		} catch (err) {
			imageState.error = err instanceof Error ? err.message : '画像の読み込みに失敗しました';
			console.error('Failed to load image:', err);
		} finally {
			imageState.isLoading = false;
		}
	};

	// 隣接する画像をプリロード
	const preloadAdjacentImages = async (index: number) => {
		await navigationService.preloadAdjacentImages(navigationState.files, index);
	};

	const navigateToImage = async (index: number): Promise<void> => {
		if (0 <= index && index < navigationState.files.length && !navigationState.isNavigating) {
			navigationState.isNavigating = true;
			navigationState.currentIndex = index;
			const newPath = navigationState.files[index];

			// 画像が既にキャッシュされている場合は即座に切り替え
			if (navigationService.isCached(newPath)) {
				imageState.url = navigationService.getCachedImageUrl(newPath)!;
				await onImageChange(newPath);
				navigationState.isNavigating = false;
				// バックグラウンドで隣接画像をプリロード
				preloadAdjacentImages(index);
			} else {
				// キャッシュにない場合は読み込み状態を表示
				await loadCurrentImage(newPath);
				await onImageChange(newPath);
				navigationState.isNavigating = false;
				// 読み込み完了後に隣接画像をプリロード
				preloadAdjacentImages(index);
			}
		}
	};

	const goToPrevious = async (): Promise<void> => {
		if (0 < navigationState.currentIndex && !navigationState.isNavigating) {
			await navigateToImage(navigationState.currentIndex - 1);
		}
	};

	const goToNext = async (): Promise<void> => {
		if (
			navigationState.currentIndex < navigationState.files.length - 1 &&
			!navigationState.isNavigating
		) {
			await navigateToImage(navigationState.currentIndex + 1);
		}
	};

	const initializeImages = async (path: string): Promise<void> => {
		try {
			// NavigationServiceを使用してナビゲーション状態を初期化
			navigationState = await navigationService.initializeNavigation(path);

			// 初期画像を読み込み
			await loadCurrentImage(path);

			// 初期化完了後に隣接画像をプリロード
			if (0 <= navigationState.currentIndex) {
				preloadAdjacentImages(navigationState.currentIndex);
			}
		} catch (error) {
			imageState.error =
				error instanceof Error ? error.message : 'ディレクトリの読み込みに失敗しました';
			console.error('画像の初期化に失敗:', error);
		}
	};

	// キーボードナビゲーション
	const handleKeydown = createKeyboardNavigationHandler(
		goToPrevious,
		goToNext,
		() => isInfoPanelFocused
	);

	// 情報ペインのフォーカス状態を管理
	const handleInfoPanelFocus = (): void => {
		isInfoPanelFocused = true;
	};

	const handleInfoPanelBlur = (): void => {
		isInfoPanelFocused = false;
	};

	// 現在の画像情報を再読み込み
	const refreshCurrentImage = async (): Promise<void> => {
		const currentPath = navigationState.files[navigationState.currentIndex];
		if (currentPath) {
			console.log('Rating更新後のメタデータ再読み込み:', currentPath);
			// 親コンポーネントに画像変更を通知（メタデータも再取得される）
			await onImageChange(currentPath);
		}
	};

	// 情報ペインの表示/非表示切り替え
	const toggleInfoPanel = (): void => {
		isInfoPanelVisible = !isInfoPanelVisible;
	};

	// リサイザーのマウスイベント処理
	const handleMouseDown = (e: MouseEvent): void => {
		isDragging = true;
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
		e.preventDefault();
	};

	const handleMouseMove = (e: MouseEvent): void => {
		if (!isDragging) return;
		
		const newWidth = window.innerWidth - e.clientX;
		// 最小幅200px、最大幅画面の60%に制限
		const minWidth = 200;
		const maxWidth = window.innerWidth * 0.6;
		infoPanelWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
	};

	const handleMouseUp = (): void => {
		isDragging = false;
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);
	};

	// 初期化（初回のみ）
	$effect(() => {
		initializeImages(imagePath);
	});

	// キーボードイベントリスナーの設定（初回のみ）
	$effect(() => {
		document.addEventListener('keydown', handleKeydown);

		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	// imagePathが変更された時に必要最小限の処理
	let previousImagePath = '';
	$effect(() => {
		if (imagePath && imagePath !== previousImagePath) {
			const handleImagePathChange = async () => {
				// 同じディレクトリ内の場合は再初期化をスキップ
				const currentDir = await navigationService.getDirname(imagePath);
				const previousDir = previousImagePath
					? await navigationService.getDirname(previousImagePath)
					: '';

				if (currentDir === previousDir && 0 < navigationState.files.length) {
					// 同じディレクトリなので、インデックスの更新と画像読み込みのみ
					navigationState.currentIndex = navigationState.files.findIndex(
						(file) => file === imagePath
					);
					loadCurrentImage(imagePath);
				} else {
					// 異なるディレクトリの場合は完全な再初期化
					initializeImages(imagePath);
				}
			};

			handleImagePathChange();
			previousImagePath = imagePath;
		}
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
		/>
	</div>

	<!-- リサイザー -->
	{#if isInfoPanelVisible}
		<div
			class="w-1 bg-base-300 cursor-col-resize hover:bg-primary transition-colors z-20 flex-shrink-0"
			onmousedown={handleMouseDown}
			role="button"
			tabindex="0"
			aria-label="情報ペインの幅を調整"
			title="ドラッグして幅を調整"
		></div>
	{/if}

	<!-- 情報ペイン -->
	{#if isInfoPanelVisible}
		<div 
			style="width: {infoPanelWidth}px"
			class="flex-shrink-0"
		>
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
