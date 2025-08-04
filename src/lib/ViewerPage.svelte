<script lang="ts">
	import { dirname } from '@tauri-apps/api/path';
	import { getImageFiles, loadImage } from './image/image-loader';
	import type { ImageData, ImageMetadata } from './image/types';
	import ImageCanvas from './ImageCanvas.svelte';
	import MetadataPanel from './MetadataPanel.svelte';
	import NavigationButtons from './NavigationButtons.svelte';
	import ToolbarOverlay from './ToolbarOverlay.svelte';

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

	// ナビゲーション関連の状態
	type NavigationState = {
		files: string[];
		currentIndex: number;
		isNavigating: boolean;
	};

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

	// プリロード用のキャッシュ
	const imageCache = new Map<string, string>();

	// プリロード機能付きの画像読み込み
	const preloadImageData = async (path: string): Promise<string> => {
		// キャッシュに存在する場合はそれを返す
		if (imageCache.has(path)) {
			return imageCache.get(path)!;
		}

		const imageData: ImageData = await loadImage(path);
		imageCache.set(path, imageData.url);
		return imageData.url;
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
		const promises: Promise<void>[] = [];

		// 前の画像をプリロード
		if (0 < index) {
			promises.push(
				preloadImageData(navigationState.files[index - 1])
					.then(() => {})
					.catch((error) => {
						console.warn(`前の画像のプリロードに失敗: ${navigationState.files[index - 1]}`, error);
					})
			);
		}

		// 次の画像をプリロード
		if (index < navigationState.files.length - 1) {
			promises.push(
				preloadImageData(navigationState.files[index + 1])
					.then(() => {})
					.catch((error) => {
						console.warn(`次の画像のプリロードに失敗: ${navigationState.files[index + 1]}`, error);
					})
			);
		}

		await Promise.all(promises);
	};

	const navigateToImage = async (index: number): Promise<void> => {
		if (0 <= index && index < navigationState.files.length && !navigationState.isNavigating) {
			navigationState.isNavigating = true;
			navigationState.currentIndex = index;
			const newPath = navigationState.files[index];

			// 画像が既にキャッシュされている場合は即座に切り替え
			if (imageCache.has(newPath)) {
				imageState.url = imageCache.get(newPath)!;
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
			// 同一ディレクトリの画像ファイル一覧を取得
			const dirPath = await dirname(path);
			navigationState.files = await getImageFiles(dirPath);
			navigationState.currentIndex = navigationState.files.findIndex((file) => file === path);

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
	const handleKeydown = (event: KeyboardEvent): void => {
		// 情報ペインにフォーカスがある場合はナビゲーションを無効化
		if (isInfoPanelFocused) return;

		switch (event.key) {
			case 'ArrowLeft':
				event.preventDefault();
				goToPrevious();
				break;
			case 'ArrowRight':
				event.preventDefault();
				goToNext();
				break;
		}
	};

	// 情報ペインのフォーカス状態を管理
	const handleInfoPanelFocus = (): void => {
		isInfoPanelFocused = true;
	};

	const handleInfoPanelBlur = (): void => {
		isInfoPanelFocused = false;
	};

	// 現在の画像情報を再読み込み
	const refreshCurrentImage = async (): Promise<void> => {
		if (navigationState.files[navigationState.currentIndex]) {
			// 親コンポーネントに画像変更を通知（メタデータも再取得される）
			await onImageChange(navigationState.files[navigationState.currentIndex]);
		}
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
				const currentDir = await dirname(imagePath);
				const previousDir = previousImagePath
					? await dirname(previousImagePath)
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
		/>

		<ImageCanvas
			imageUrl={imageState.url}
			isLoading={imageState.isLoading}
			error={imageState.error}
			{metadata}
		/>
		<NavigationButtons
			imageFiles={navigationState.files}
			currentIndex={navigationState.currentIndex}
			isNavigating={navigationState.isNavigating}
			{goToPrevious}
			{goToNext}
		/>
	</div>

	<MetadataPanel 
		{metadata} 
		imagePath={navigationState.files[navigationState.currentIndex]}
		onRatingUpdate={() => refreshCurrentImage()}
		onFocus={handleInfoPanelFocus} 
		onBlur={handleInfoPanelBlur} 
	/>
</div>
