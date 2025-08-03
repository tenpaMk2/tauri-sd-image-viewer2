<script lang="ts">
	import { getImageFiles, loadImage } from './image/image-loader';
	import type { ImageData, ImageMetadata } from './image/types';
	import ImageDisplay from './ImageDisplay.svelte';
	import ImageInfoPanel from './ImageInfoPanel.svelte';
	import NavigationButtons from './NavigationButtons.svelte';
	import ToolbarOverlay from './ToolbarOverlay.svelte';

	const {
		metadata,
		imagePath,
		onImageChange,
		openFileDialog,
		onBack,
		onSwitchToGrid
	}: {
		metadata: ImageMetadata;
		imagePath: string;
		onImageChange: (newPath: string) => void;
		openFileDialog: () => void;
		onBack?: () => void;
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
		if (index > 0) {
			promises.push(
				preloadImageData(navigationState.files[index - 1])
					.then(() => {})
					.catch(() => {})
			);
		}

		// 次の画像をプリロード
		if (index < navigationState.files.length - 1) {
			promises.push(
				preloadImageData(navigationState.files[index + 1])
					.then(() => {})
					.catch(() => {})
			);
		}

		await Promise.all(promises);
	};

	const navigateToImage = async (index: number): Promise<void> => {
		if (index >= 0 && index < navigationState.files.length && !navigationState.isNavigating) {
			navigationState.isNavigating = true;
			navigationState.currentIndex = index;
			const newPath = navigationState.files[index];

			// 画像が既にキャッシュされている場合は即座に切り替え
			if (imageCache.has(newPath)) {
				imageState.url = imageCache.get(newPath)!;
				onImageChange(newPath);
				navigationState.isNavigating = false;
				// バックグラウンドで隣接画像をプリロード
				preloadAdjacentImages(index);
			} else {
				// キャッシュにない場合は読み込み状態を表示
				await loadCurrentImage(newPath);
				onImageChange(newPath);
				navigationState.isNavigating = false;
				// 読み込み完了後に隣接画像をプリロード
				preloadAdjacentImages(index);
			}
		}
	};

	const goToPrevious = async (): Promise<void> => {
		if (navigationState.currentIndex >= 1 && !navigationState.isNavigating) {
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
		// 同一ディレクトリの画像ファイル一覧を取得
		const dirname = path.substring(0, path.lastIndexOf('/'));
		navigationState.files = await getImageFiles(dirname);
		navigationState.currentIndex = navigationState.files.findIndex((file) => file === path);

		// 初期画像を読み込み
		await loadCurrentImage(path);

		// 初期化完了後に隣接画像をプリロード
		if (navigationState.currentIndex >= 0) {
			preloadAdjacentImages(navigationState.currentIndex);
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

	// 初期化とキーボードイベントリスナーの設定
	$effect(() => {
		initializeImages(imagePath);

		// キーボードイベントリスナーを追加
		document.addEventListener('keydown', handleKeydown);

		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	// imagePathが変更された時に再初期化
	$effect(() => {
		if (imagePath) {
			initializeImages(imagePath);
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
			{onBack}
			{onSwitchToGrid}
		/>

		<ImageDisplay
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

	<ImageInfoPanel {metadata} onFocus={handleInfoPanelFocus} onBlur={handleInfoPanelBlur} />
</div>
