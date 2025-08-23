import { path } from '@tauri-apps/api';
import { imageCacheService } from '../services/image-cache';
import { getImageFiles } from '../services/image-loader';

export type ImageLoadingStatus = 'idle' | 'loading' | 'loaded';

// currentFilePathの変更コールバック型
export type CurrentFilePathChangeCallback = (newPath: string) => void | Promise<void>;

type MutableNavigationState = {
	directoryImagePaths: string[];
	currentImagePath: string;
	currentImageUrl: string;
	isNavigating: boolean;
	imageLoadingStatus: ImageLoadingStatus;
	imageFileLoadError: string | null;
};

export type NavigationState = Readonly<MutableNavigationState>;

const INITIAL_NAVIGATION_STATE: NavigationState = {
	directoryImagePaths: [],
	currentImagePath: '',
	isNavigating: false,
	imageLoadingStatus: 'idle',
	imageFileLoadError: null,
	currentImageUrl: '',
};

let state = $state<MutableNavigationState>({ ...INITIAL_NAVIGATION_STATE });

const currentIndex = $derived.by(() => {
	const paths = state.directoryImagePaths;
	const targetPath = state.currentImagePath;
	return paths.findIndex((path) => path === targetPath);
});
const hasPrevious = $derived(0 < currentIndex);
const hasNext = $derived(0 <= currentIndex && currentIndex < state.directoryImagePaths.length - 1);

// ナビゲーション関連アクション
const navigateNext = async (): Promise<void> => {
	console.log('🔄 NavigationStore.navigateNext called');
	if (!hasNext) {
		console.log('❌ No next image available');
		return;
	}

	const nextIndex = currentIndex + 1;
	const nextPath = state.directoryImagePaths[nextIndex];
	console.log('🔄 Next image path: ' + nextPath.split('/').pop());

	// ナビゲーション開始
	state.isNavigating = true;

	state.currentImagePath = nextPath;
	_loadImage(nextPath).then(() => (state.isNavigating = false));

	// プリロード（非同期で実行）
	if (hasNext) {
		_preloadImage(state.directoryImagePaths[currentIndex + 1]);
	}
};

const navigatePrevious = async (): Promise<void> => {
	console.log('🔄 NavigationStore.navigatePrevious called');
	if (!hasPrevious) {
		console.log('❌ No previous image available');
		return;
	}

	const prevIndex = currentIndex - 1;
	const prevPath = state.directoryImagePaths[prevIndex];
	console.log('🔄 Previous image path: ' + prevPath.split('/').pop());

	// ナビゲーション開始
	state.isNavigating = true;

	state.currentImagePath = prevPath;
	_loadImage(prevPath).then(() => (state.isNavigating = false));

	// プリロード（非同期で実行）
	if (hasPrevious) {
		_preloadImage(state.directoryImagePaths[prevIndex]);
	}
};

const initializeNavigation = async (imagePath: string): Promise<void> => {
	state.isNavigating = true;

	try {
		const dirPath = await path.dirname(imagePath);
		const files = await getImageFiles(dirPath);

		state.directoryImagePaths = files;
		state.currentImagePath = imagePath;

		_loadImage(imagePath).catch((error: any) => {
			console.error('Failed to load the image on initialization: ' + error);
		});

		if (hasNext) {
			_preloadImage(state.directoryImagePaths[currentIndex + 1]);
		}
		if (hasPrevious) {
			_preloadImage(state.directoryImagePaths[currentIndex - 1]);
		}

		// 初期化時に現在の画像の隣接する画像をプリロード
		if (0 <= currentIndex) {
			imageCacheService
				.preloadAdjacentImages(state.directoryImagePaths, currentIndex)
				.catch((error: any) => {
					console.warn('Failed to preload adjacent images on initialization: ' + error);
				});
		}
	} catch (error) {
		state.imageFileLoadError = error instanceof Error ? error.message : String(error);
		state.directoryImagePaths = [];
		state.currentImagePath = '';
	} finally {
		state.isNavigating = false;
	}
};

const _loadImage = async (path: string): Promise<void> => {
	state.imageLoadingStatus = 'loading';
	state.currentImageUrl = await imageCacheService.loadImage(path);
	state.imageLoadingStatus = 'loaded';

	return;
};

const _preloadImage = async (path: string): Promise<void> => {
	await imageCacheService.loadImage(path);
	return;
};

export const navigationStore = {
	state: state as NavigationState,

	// 計算プロパティ（getters）
	getters: {
		get currentIndex() {
			return currentIndex;
		},
		get hasPrevious() {
			return hasPrevious;
		},
		get hasNext() {
			return hasNext;
		},
	},

	actions: {
		// ナビゲーション関連
		navigateNext,
		navigatePrevious,
		initializeNavigation,
	},
};
