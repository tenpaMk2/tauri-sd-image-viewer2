import { dirname } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { getImageFiles } from '../image/image-loader';
import { getDirectoryFromPath, isDirectory, isImageFile } from '../image/utils';
import { imageCacheService } from '../services/image-cache-service';
import { filterStore } from './filter-store.svelte';
import { gridStore } from './grid-store.svelte';
import { metadataRegistry } from './metadata-registry.svelte';
import { tagStore } from './tag-store.svelte';
import { thumbnailRegistry } from './thumbnail-registry.svelte';

export type ImageLoadingState = 'idle' | 'loading' | 'loaded';

type MutableNavigationState = {
	imageFiles: string[];
	currentFilePath: string;
	isNavigating: boolean;
	imageLoadingState: ImageLoadingState;
	imageFileLoadError: string | null;
};

export type NavigationState = Readonly<MutableNavigationState>;

const INITIAL_NAVIGATION_STATE: MutableNavigationState = {
	imageFiles: [],
	currentFilePath: '',
	isNavigating: false,
	imageLoadingState: 'idle',
	imageFileLoadError: null
};

let state = $state<MutableNavigationState>({
	imageFiles: [],
	currentFilePath: '',
	isNavigating: false,
	imageLoadingState: 'idle',
	imageFileLoadError: null
});

// imageFilesのセッター関数（tagStoreとの連携を自動化）
const setImageFiles = (files: string[]): void => {
	state.imageFiles = files;
	// 画像ファイルが変更されたらタグストアに通知
	tagStore.actions.handleImageFilesChange(files);
};

const loadImageFiles = async (selectedDirectory: string | null): Promise<void> => {
	console.log(
		'🔄 loadImageFiles: Started selectedDirectory=' +
			selectedDirectory +
			' currentImageFiles=' +
			state.imageFiles.length
	);

	if (!selectedDirectory) {
		console.log('❌ loadImageFiles: selectedDirectory is empty');
		setImageFiles([]);
		state.imageLoadingState = 'idle';
		return;
	}

	console.log('🔄 loadImageFiles: Setting loading state');
	state.imageLoadingState = 'loading';
	state.imageFileLoadError = null;

	try {
		console.log('🔄 loadImageFiles: Calling getImageFiles', selectedDirectory);
		const files = await getImageFiles(selectedDirectory);
		console.log(
			'✅ loadImageFiles: getImageFiles success directory=' +
				selectedDirectory +
				' fileCount=' +
				files.length +
				' firstFile=' +
				(files[0] || 'none')
		);

		console.log('🔄 loadImageFiles: Updating state.imageFiles');
		setImageFiles(files);
		console.log(
			'✅ loadImageFiles: state.imageFiles update completed newLength=' +
				state.imageFiles.length +
				' state=' +
				state.imageLoadingState
		);
	} catch (error) {
		console.error('❌ loadImageFiles: getImageFiles error', {
			directory: selectedDirectory,
			error: error,
			errorMessage: error instanceof Error ? error.message : String(error),
			errorStack: error instanceof Error ? error.stack : undefined
		});
		state.imageFileLoadError = error instanceof Error ? error.message : String(error);
		setImageFiles([]);
	} finally {
		console.log('🔄 loadImageFiles: finally - Setting loading state to loaded');
		state.imageLoadingState = 'loaded';
		console.log(
			'✅ loadImageFiles: Completed finalImageFiles=' +
				state.imageFiles.length +
				' state=' +
				state.imageLoadingState +
				' error=' +
				state.imageFileLoadError
		);
	}
};

const clearImageFiles = (): void => {
	setImageFiles([]);
	state.currentFilePath = '';
	state.isNavigating = false;
	state.imageLoadingState = 'idle';
	state.imageFileLoadError = null;
};

// 計算プロパティ
const getCurrentIndex = (): number => {
	const files = state.imageFiles;
	const currentPath = state.currentFilePath;
	if (!files.length || !currentPath) return -1;
	return files.findIndex((path) => path === currentPath);
};

const getHasPrevious = (): boolean => {
	return 0 < getCurrentIndex();
};

const getHasNext = (): boolean => {
	const currentIndex = getCurrentIndex();
	return 0 <= currentIndex && currentIndex < state.imageFiles.length - 1;
};

// ナビゲーション関連アクション
const navigateNext = async (): Promise<void> => {
	console.log('🔄 NavigationStore.navigateNext called');
	if (!getHasNext()) {
		console.log('❌ No next image available');
		return;
	}

	const nextIndex = getCurrentIndex() + 1;
	const nextPath = state.imageFiles[nextIndex];
	console.log('🔄 Next image path: ' + nextPath.split('/').pop());

	// ナビゲーション開始
	state.isNavigating = true;

	try {
		// 次の画像をプリロード（完了を待つ）
		console.log('🔄 Preloading next image...');
		await imageCacheService.loadImage(nextPath);
		console.log('✅ Next image preloaded');

		// プリロード完了後にパスを更新
		state.currentFilePath = nextPath;

		// 隣接する画像もプリロード（非同期で実行）
		imageCacheService.preloadAdjacentImages(state.imageFiles, nextIndex).catch((error: any) => {
			console.warn('Failed to preload adjacent images: ' + error);
		});
	} finally {
		state.isNavigating = false;
	}
};

const navigatePrevious = async (): Promise<void> => {
	console.log('🔄 NavigationStore.navigatePrevious called');
	if (!getHasPrevious()) {
		console.log('❌ No previous image available');
		return;
	}

	const prevIndex = getCurrentIndex() - 1;
	const prevPath = state.imageFiles[prevIndex];
	console.log('🔄 Previous image path: ' + prevPath.split('/').pop());

	// ナビゲーション開始
	state.isNavigating = true;

	try {
		// 前の画像をプリロード（完了を待つ）
		console.log('🔄 Preloading previous image...');
		await imageCacheService.loadImage(prevPath);
		console.log('✅ Previous image preloaded');

		// プリロード完了後にパスを更新
		state.currentFilePath = prevPath;

		// 隣接する画像もプリロード（非同期で実行）
		imageCacheService.preloadAdjacentImages(state.imageFiles, prevIndex).catch((error: any) => {
			console.warn('Failed to preload adjacent images: ' + error);
		});
	} finally {
		state.isNavigating = false;
	}
};

const initializeNavigation = async (imagePath: string): Promise<void> => {
	state.isNavigating = true;

	try {
		const dirPath = await dirname(imagePath);
		const files = await getImageFiles(dirPath);

		setImageFiles(files);
		state.currentFilePath = imagePath;

		// 初期化時に現在の画像の隣接する画像をプリロード
		const currentIndex = files.findIndex((path) => path === imagePath);
		if (0 <= currentIndex) {
			imageCacheService.preloadAdjacentImages(files, currentIndex).catch((error: any) => {
				console.warn('Failed to preload adjacent images on initialization: ' + error);
			});
		}
	} finally {
		state.isNavigating = false;
	}
};

const loadImage = async (path: string): Promise<string> => {
	return await imageCacheService.loadImage(path);
};

const preloadImage = async (path: string): Promise<void> => {
	await imageCacheService.loadImage(path);
};

const openFileDialog = async (): Promise<string | null> => {
	console.log('🔄 openFileDialog called');
	try {
		const selected = await open({
			multiple: false,
			filters: [
				{
					name: 'Image Files',
					extensions: ['png', 'jpg', 'jpeg', 'webp']
				}
			]
		});

		console.log('📁 File selected: ' + selected);

		if (selected && typeof selected === 'string') {
			const selectedDirectory = await getDirectoryFromPath(selected);
			console.log('📂 Directory: ' + selectedDirectory);

			return selected;
		} else {
			console.log('❌ No file selected or invalid selection');
			return null;
		}
	} catch (error) {
		console.error('❌ File selection error: ' + error);
		return null;
	}
};

const openDirectoryDialog = async (): Promise<string | null> => {
	try {
		console.log('🔄 openDirectoryDialog: Opening dialog');
		const selected = await open({
			directory: true,
			multiple: false
		});

		console.log('📁 openDirectoryDialog: Selection result', selected);

		if (selected && typeof selected === 'string') {
			return selected;
		} else {
			console.log('❌ openDirectoryDialog: No directory selected');
			return null;
		}
	} catch (error) {
		console.error('❌ openDirectoryDialog: Error occurred', error);
		return null;
	}
};

const handleDroppedPaths = async (
	paths: string[]
): Promise<{ path: string; isDirectory: boolean } | null> => {
	if (paths.length === 0) return null;

	const firstPath = paths[0];

	try {
		if (await isDirectory(firstPath)) {
			return { path: firstPath, isDirectory: true };
		} else if (isImageFile(firstPath)) {
			return { path: firstPath, isDirectory: false };
		}
		return null;
	} catch (error) {
		console.error('Error processing dropped path: ' + error);
		return null;
	}
};

const clearAllData = (): void => {
	console.log('🗑️ clearAllData: Clearing old data and queues');
	metadataRegistry.clearAll();
	thumbnailRegistry.clearAll();
	imageCacheService.clear();
	clearImageFiles();

	console.log('🔄 clearAllData: Resetting stores');
	tagStore.actions.reset();
	filterStore.actions.reset();
	gridStore.actions.reset();
	metadataRegistry.reset();
	thumbnailRegistry.reset();
};

const reset = (): void => {
	setImageFiles(INITIAL_NAVIGATION_STATE.imageFiles);
	state.currentFilePath = INITIAL_NAVIGATION_STATE.currentFilePath;
	state.isNavigating = INITIAL_NAVIGATION_STATE.isNavigating;
	state.imageLoadingState = INITIAL_NAVIGATION_STATE.imageLoadingState;
	state.imageFileLoadError = INITIAL_NAVIGATION_STATE.imageFileLoadError;
};

export const navigationStore = {
	state: state as NavigationState,

	// 計算プロパティ（getters）
	getters: {
		get currentIndex(): number {
			return getCurrentIndex();
		},
		get hasPrevious(): boolean {
			return getHasPrevious();
		},
		get hasNext(): boolean {
			return getHasNext();
		},
		isImageLoaded: (path: string): boolean => {
			return imageCacheService.has(path);
		}
	},

	actions: {
		// ファイル管理
		loadImageFiles,
		clearImageFiles,
		openFileDialog,
		openDirectoryDialog,
		handleDroppedPaths,
		clearAllData,
		reset,
		// ナビゲーション関連
		navigateNext,
		navigatePrevious,
		initializeNavigation,
		// 画像操作（実装の詳細を隠蔽）
		loadImage,
		preloadImage
	}
};
