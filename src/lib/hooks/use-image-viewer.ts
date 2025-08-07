import type { ImageMetadata } from '../image/types';
import { NavigationService, type NavigationState } from '../services/navigation-service';

type ImageState = {
	url: string;
	isLoading: boolean;
	error: string;
};

type ImageViewerHook = {
	imageState: ImageState;
	navigationState: NavigationState;
	isInfoPanelVisible: boolean;
	infoPanelWidth: number;
	actions: {
		goToPrevious: () => Promise<void>;
		goToNext: () => Promise<void>;
		navigateToImage: (index: number) => Promise<void>;
		toggleInfoPanel: () => void;
		setInfoPanelWidth: (width: number) => void;
		refreshCurrentImage: () => Promise<void>;
	};
};

export const createImageViewerHook = (
	metadata: ImageMetadata,
	imagePath: string,
	onImageChange: (newPath: string) => Promise<void>
): ImageViewerHook => {
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

	let isInfoPanelVisible = $state<boolean>(true);
	let infoPanelWidth = $state<number>(320);

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

	const preloadAdjacentImages = async (index: number) => {
		await navigationService.preloadAdjacentImages(navigationState.files, index);
	};

	const navigateToImage = async (index: number): Promise<void> => {
		if (0 <= index && index < navigationState.files.length && !navigationState.isNavigating) {
			navigationState.isNavigating = true;
			navigationState.currentIndex = index;
			const newPath = navigationState.files[index];

			if (navigationService.isCached(newPath)) {
				imageState.url = navigationService.getCachedImageUrl(newPath)!;
				await onImageChange(newPath);
				navigationState.isNavigating = false;
				preloadAdjacentImages(index);
			} else {
				await loadCurrentImage(newPath);
				await onImageChange(newPath);
				navigationState.isNavigating = false;
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

	const toggleInfoPanel = (): void => {
		isInfoPanelVisible = !isInfoPanelVisible;
	};

	const setInfoPanelWidth = (width: number): void => {
		infoPanelWidth = width;
	};

	const refreshCurrentImage = async (): Promise<void> => {
		const currentPath = navigationState.files[navigationState.currentIndex];
		if (currentPath) {
			await onImageChange(currentPath);
		}
	};

	const initializeImages = async (path: string): Promise<void> => {
		try {
			navigationState = await navigationService.initializeNavigation(path);
			await loadCurrentImage(path);

			if (0 <= navigationState.currentIndex) {
				preloadAdjacentImages(navigationState.currentIndex);
			}
		} catch (error) {
			imageState.error =
				error instanceof Error ? error.message : 'ディレクトリの読み込みに失敗しました';
			console.error('画像の初期化に失敗:', error);
		}
	};

	// 初期化
	$effect(() => {
		initializeImages(imagePath);
	});

	// パス変更時の処理
	let previousImagePath = '';
	$effect(() => {
		if (imagePath && imagePath !== previousImagePath) {
			const handleImagePathChange = async () => {
				const currentDir = await navigationService.getDirname(imagePath);
				const previousDir = previousImagePath
					? await navigationService.getDirname(previousImagePath)
					: '';

				if (currentDir === previousDir && 0 < navigationState.files.length) {
					navigationState.currentIndex = navigationState.files.findIndex(
						(file) => file === imagePath
					);
					loadCurrentImage(imagePath);
				} else {
					initializeImages(imagePath);
				}
			};

			handleImagePathChange();
			previousImagePath = imagePath;
		}
	});

	// クリーンアップ
	$effect(() => {
		return () => {
			navigationService.clearCache();
		};
	});

	return {
		imageState,
		navigationState,
		isInfoPanelVisible,
		infoPanelWidth,
		actions: {
			goToPrevious,
			goToNext,
			navigateToImage,
			toggleInfoPanel,
			setInfoPanelWidth,
			refreshCurrentImage
		}
	};
};
