import { navigationService } from '$lib/services/navigation-service.svelte';
import { open } from '@tauri-apps/plugin-dialog';
import { getImageFiles } from '../image/image-loader';
import { getDirectoryFromPath, isDirectory, isImageFile } from '../image/utils';
import type { ViewMode } from '../ui/types';
import { filterStore } from './filter-store.svelte';
import { gridStore } from './grid-store.svelte';
import { metadataRegistry } from './metadata-registry.svelte';
import { tagStore } from './tag-store.svelte';
import { thumbnailRegistry } from './thumbnail-registry.svelte';

export type ImageLoadingState = 'idle' | 'loading' | 'loaded';

export type ViewerState = {
	imageUrl: string;
	isLoading: boolean;
	error: string;
	ui: {
		isVisible: boolean;
		isInfoPanelVisible: boolean;
		isInfoPanelFocused: boolean;
		infoPanelWidth: number;
		isResizing: boolean;
	};
	autoNav: {
		isActive: boolean;
	};
};

export type AppState = {
	viewMode: ViewMode;
	selectedImagePath: string | null;
	selectedDirectory: string | null;
	viewer: ViewerState;
	// 画像ファイル管理
	imageFiles: string[];
	imageLoadingState: ImageLoadingState;
	imageFileLoadError: string | null;
};

export type AppActions = {
	openFileDialog: () => Promise<void>;
	openDirectoryDialog: () => Promise<void>;
	updateSelectedImage: (imagePath: string) => Promise<void>;
	handleImageChange: (newPath: string) => Promise<void>;
	handleSwitchToGrid: () => Promise<void>;
	handleImageSelect: (imagePath: string) => Promise<void>;
	handleBackToGrid: () => Promise<void>;
	handleBackToWelcome: () => Promise<void>;
	handleDroppedPaths: (paths: string[]) => Promise<void>;
	// 画像ファイル管理
	loadImageFiles: () => Promise<void>;
	clearImageFiles: () => void;
	// ViewerPage用のアクション
	loadImage: (imagePath: string) => Promise<void>;
	toggleInfoPanel: () => void;
	setInfoPanelFocus: (focused: boolean) => void;
	setInfoPanelWidth: (width: number) => void;
	setResizing: (isResizing: boolean) => void;
	showUI: () => void;
	hideUI: () => void;
	resetUITimer: () => void;
	startAutoNavigation: (onNavigate: () => Promise<void>) => void;
	stopAutoNavigation: () => void;
	// イベントハンドラー（@attachで使用）
	handleMouseMove: () => void;
	handleResize: (event: MouseEvent, minWidth: number, maxWidth: number) => void;
};

// Viewer用のタイマー管理
let uiTimer: number | null = null;
let autoNavTimer: number | null = null;

// Svelte 5の$stateを使用（オブジェクトラッパーパターン）
let appState: AppState = $state({
	viewMode: 'welcome',
	selectedImagePath: null,
	selectedDirectory: null,
	viewer: {
		imageUrl: '',
		isLoading: false,
		error: '',
		ui: {
			isVisible: true,
			isInfoPanelVisible: true,
			isInfoPanelFocused: false,
			infoPanelWidth: 320,
			isResizing: false
		},
		autoNav: {
			isActive: false
		}
	},
	// 画像ファイル管理
	imageFiles: [],
	imageLoadingState: 'idle',
	imageFileLoadError: null
});

// 画像ファイル管理のアクション
const loadImageFiles = async (): Promise<void> => {
	console.log(
		'🔄 loadImageFiles: 開始 selectedDirectory=' +
			appState.selectedDirectory +
			' currentImageFiles=' +
			appState.imageFiles.length
	);

	if (!appState.selectedDirectory) {
		console.log('❌ loadImageFiles: selectedDirectoryが空');
		appState.imageFiles = [];
		appState.imageLoadingState = 'idle';
		return;
	}

	console.log('🔄 loadImageFiles: ローディング状態を設定');
	appState.imageLoadingState = 'loading';
	appState.imageFileLoadError = null;

	try {
		console.log('🔄 loadImageFiles: getImageFiles呼び出し', appState.selectedDirectory);
		const files = await getImageFiles(appState.selectedDirectory);
		console.log(
			'✅ loadImageFiles: getImageFiles成功 directory=' +
				appState.selectedDirectory +
				' fileCount=' +
				files.length +
				' firstFile=' +
				(files[0] || 'none')
		);

		console.log('🔄 loadImageFiles: appState.imageFilesを更新');
		appState.imageFiles = files;
		console.log(
			'✅ loadImageFiles: appState.imageFiles更新完了 newLength=' +
				appState.imageFiles.length +
				' state=' +
				appState.imageLoadingState
		);
	} catch (error) {
		console.error('❌ loadImageFiles: getImageFilesでエラー', {
			directory: appState.selectedDirectory,
			error: error,
			errorMessage: error instanceof Error ? error.message : String(error),
			errorStack: error instanceof Error ? error.stack : undefined
		});
		appState.imageFileLoadError = error instanceof Error ? error.message : String(error);
		appState.imageFiles = [];
	} finally {
		console.log('🔄 loadImageFiles: finally - ローディング状態をloadedに');
		appState.imageLoadingState = 'loaded';
		console.log(
			'✅ loadImageFiles: 完了 finalImageFiles=' +
				appState.imageFiles.length +
				' state=' +
				appState.imageLoadingState +
				' error=' +
				appState.imageFileLoadError
		);
	}
};

const clearImageFiles = (): void => {
	appState.imageFiles = [];
	appState.imageLoadingState = 'idle';
	appState.imageFileLoadError = null;
};

const openFileDialog = async (): Promise<void> => {
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
			// リアクティブメタデータの事前読み込み
			const store = metadataRegistry.getStore(selected);
			console.log('📊 Reactive metadata created');
			if (store.state.loadingStatus === 'unloaded') {
				console.log('🔄 Loading metadata...');
				await store.actions.ensureLoaded();
				console.log('✅ Metadata loaded');
			}
			const selectedDirectory = await getDirectoryFromPath(selected);
			console.log('📂 Directory: ' + selectedDirectory);

			console.log('🔄 Updating app state to viewer mode');
			appState.selectedImagePath = selected;
			appState.selectedDirectory = selectedDirectory;
			appState.viewMode = 'viewer';
			console.log('✅ App state updated');

			// 画像を明示的に読み込み
			await loadImage(selected);
		} else {
			console.log('❌ No file selected or invalid selection');
		}
	} catch (error) {
		console.error('❌ ファイル選択エラー: ' + error);
	}
};

const openDirectoryDialog = async (): Promise<void> => {
	try {
		console.log('🔄 openDirectoryDialog: ダイアログを開く');
		const selected = await open({
			directory: true,
			multiple: false
		});

		console.log('📁 openDirectoryDialog: 選択結果', selected);

		if (selected && typeof selected === 'string') {
			// 古いデータとキューをクリア
			console.log('🗑️ openDirectoryDialog: 古いデータとキューをクリア');
			metadataRegistry.clearAll();
			thumbnailRegistry.clearAll();
			clearImageFiles();

			// 各ストアをリセット
			console.log('🔄 openDirectoryDialog: ストアをリセット');
			tagStore.actions.reset();
			filterStore.actions.reset();
			gridStore.actions.reset();
			metadataRegistry.reset();
			thumbnailRegistry.reset();

			console.log('🔄 openDirectoryDialog: appStateを更新');
			appState.selectedDirectory = selected;
			appState.viewMode = 'grid';

			console.log(
				'🔄 openDirectoryDialog: 現在のappState selectedDirectory=' +
					appState.selectedDirectory +
					' viewMode=' +
					appState.viewMode +
					' imageFiles=' +
					appState.imageFiles.length +
					' imageLoadingState=' +
					appState.imageLoadingState +
					' imageFileLoadError=' +
					appState.imageFileLoadError
			);

			// 画像ファイルを自動的にロード
			console.log('🔄 openDirectoryDialog: loadImageFiles開始');
			await loadImageFiles();
			console.log('✅ openDirectoryDialog: loadImageFiles完了');
		} else {
			console.log('❌ openDirectoryDialog: ディレクトリが選択されなかった');
		}
	} catch (error) {
		console.error('❌ openDirectoryDialog: エラー発生', error);
	}
};

const updateSelectedImage = async (imagePath: string): Promise<void> => {
	// リアクティブメタデータの事前読み込み
	const store = metadataRegistry.getStore(imagePath);
	if (store.state.loadingStatus === 'unloaded') {
		await store.actions.ensureLoaded();
	}

	appState.selectedImagePath = imagePath;
};

const handleImageChange = async (newPath: string): Promise<void> => {
	await updateSelectedImage(newPath);
	// ビューアーモードで画像パスが変更された場合は画像を読み込み
	if (appState.viewMode === 'viewer') {
		await loadImage(newPath);
	}
};

const handleSwitchToGrid = async (): Promise<void> => {
	// Rating書き込み処理を待機（クラッシュ防止）
	await metadataRegistry.waitForAllRatingWrites();

	// Viewerモードから離れる際のクリーンアップ
	if (appState.viewMode === 'viewer') {
		cleanupViewerState();
	}

	// グリッドモードに戻る
	appState.viewMode = 'grid';
};

const handleImageSelect = async (imagePath: string): Promise<void> => {
	// Rating書き込み処理を待機（クラッシュ防止）
	await metadataRegistry.waitForAllRatingWrites();

	await updateSelectedImage(imagePath);
	appState.viewMode = 'viewer';

	// 画像を明示的に読み込み
	await loadImage(imagePath);
};

const handleBackToGrid = async (): Promise<void> => {
	// Rating書き込み処理を待機（クラッシュ防止）
	await metadataRegistry.waitForAllRatingWrites();

	// Viewerモードから離れる際のクリーンアップ
	if (appState.viewMode === 'viewer') {
		cleanupViewerState();
	}

	appState.viewMode = 'grid';
};

const handleBackToWelcome = async (): Promise<void> => {
	// Rating書き込み処理を待機（クラッシュ防止）
	await metadataRegistry.waitForAllRatingWrites();

	// Viewerモードから離れる際のクリーンアップ
	if (appState.viewMode === 'viewer') {
		cleanupViewerState();
	}

	// 不要な処理を停止するためにストアをクリア

	// すべてをクリア
	clearImageFiles();
	metadataRegistry.clearAll();
	thumbnailRegistry.clearAll();

	// 各ストアをリセット
	tagStore.actions.reset();
	filterStore.actions.reset();
	gridStore.actions.reset();

	appState.viewMode = 'welcome';
	appState.selectedImagePath = null;
	appState.selectedDirectory = null;
};

const handleDroppedPaths = async (paths: string[]): Promise<void> => {
	if (paths.length === 0) return;

	const firstPath = paths[0];

	try {
		if (await isDirectory(firstPath)) {
			// 古いデータとキューをクリア
			metadataRegistry.clearAll();
			thumbnailRegistry.clearAll();
			clearImageFiles();

			// 各ストアをリセット
			tagStore.actions.reset();
			filterStore.actions.reset();
			gridStore.actions.reset();
			metadataRegistry.reset();
			thumbnailRegistry.reset();

			appState.selectedDirectory = firstPath;
			appState.viewMode = 'grid';

			// 画像ファイルを自動的にロード
			await loadImageFiles();
		} else if (isImageFile(firstPath)) {
			// リアクティブメタデータの事前読み込み
			const store = metadataRegistry.getStore(firstPath);
			if (store.state.loadingStatus === 'unloaded') {
				await store.actions.ensureLoaded();
			}
			const selectedDirectory = await getDirectoryFromPath(firstPath);

			appState.selectedImagePath = firstPath;
			appState.selectedDirectory = selectedDirectory;
			appState.viewMode = 'viewer';

			// 画像を明示的に読み込み
			await loadImage(firstPath);
		}
	} catch (error) {
		console.error('Error processing dropped path: ' + error);
	}
};

// ViewerPage用のアクション実装
const loadImage = async (imagePath: string): Promise<void> => {
	console.log(
		'📸 loadImage called with path: ' + (imagePath ? imagePath.split('/').pop() : 'null')
	);

	try {
		appState.viewer.error = '';

		console.log('🔄 Loading image...');
		const url = await navigationService.loadImage(imagePath);
		console.log('✅ Image loaded, URL: ' + (url ? 'blob:...' : 'null'));

		// 成功時の状態更新
		appState.viewer.imageUrl = url;
		appState.viewer.isLoading = false;
		appState.viewer.error = '';

		console.log('✅ Image state updated successfully');
	} catch (err) {
		console.error('❌ loadImage failed: ' + err);
		// エラー時の状態更新
		appState.viewer.imageUrl = '';
		appState.viewer.isLoading = false;
		appState.viewer.error = err instanceof Error ? err.message : 'Failed to load image';
	}
};

const toggleInfoPanel = (): void => {
	appState.viewer.ui.isInfoPanelVisible = !appState.viewer.ui.isInfoPanelVisible;
};

const setInfoPanelFocus = (focused: boolean): void => {
	appState.viewer.ui.isInfoPanelFocused = focused;
};

const setInfoPanelWidth = (width: number): void => {
	appState.viewer.ui.infoPanelWidth = width;
};

const setResizing = (isResizing: boolean): void => {
	appState.viewer.ui.isResizing = isResizing;
};

const showUI = (): void => {
	appState.viewer.ui.isVisible = true;
	resetUITimer();
};

const hideUI = (): void => {
	appState.viewer.ui.isVisible = false;
};

const resetUITimer = (): void => {
	if (uiTimer !== null) {
		clearTimeout(uiTimer);
	}
	uiTimer = setTimeout(() => {
		hideUI();
	}, 1500);
};

const startAutoNavigation = (onNavigate: () => Promise<void>): void => {
	if (appState.viewer.autoNav.isActive) {
		stopAutoNavigation();
	} else {
		appState.viewer.autoNav.isActive = true;
		autoNavTimer = setInterval(async () => {
			await onNavigate();
		}, 2000);
	}
};

const stopAutoNavigation = (): void => {
	if (autoNavTimer !== null) {
		clearInterval(autoNavTimer);
		autoNavTimer = null;
	}
	appState.viewer.autoNav.isActive = false;
};

// Viewerモードを離れる時のクリーンアップ処理
const cleanupViewerState = (): void => {
	// UIタイマーをクリア
	if (uiTimer !== null) {
		clearTimeout(uiTimer);
		uiTimer = null;
	}
	// 自動ナビゲーションを停止
	stopAutoNavigation();
	// Viewer状態をリセット
	appState.viewer = {
		imageUrl: '',
		isLoading: false,
		error: '',
		ui: {
			isVisible: true,
			isInfoPanelVisible: true,
			isInfoPanelFocused: false,
			infoPanelWidth: 320,
			isResizing: false
		},
		autoNav: {
			isActive: false
		}
	};
};

// マウス移動イベントハンドラー（@attachで使用）
const handleMouseMove = (): void => {
	if (appState.viewMode === 'viewer') {
		if (!appState.viewer.ui.isVisible) {
			showUI();
		} else {
			resetUITimer();
		}
	}
};

// リサイズイベントハンドラー（@attachで使用）
const handleResize = (event: MouseEvent, minWidth: number, maxWidth: number): void => {
	setResizing(true);
	event.preventDefault();

	const handleMouseMove = (e: MouseEvent): void => {
		if (!appState.viewer.ui.isResizing) return;

		const containerWidth = window.innerWidth;
		const newWidth = containerWidth - e.clientX;

		if (minWidth <= newWidth && newWidth <= maxWidth) {
			setInfoPanelWidth(newWidth);
		}
	};

	const handleMouseUp = (): void => {
		setResizing(false);
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);
	};

	document.addEventListener('mousemove', handleMouseMove);
	document.addEventListener('mouseup', handleMouseUp);
};

// 個別のプロパティをエクスポート（リアクティブ）
export const viewMode = () => appState.viewMode;
export const selectedImagePath = () => appState.selectedImagePath;
export const selectedDirectory = () => appState.selectedDirectory;
export const imageFiles = appState.imageFiles;
export const imageLoadingState = appState.imageLoadingState;
export const imageFileLoadError = appState.imageFileLoadError;
export const viewer = () => appState.viewer;

export const appStore = {
	state: appState,
	actions: {
		openFileDialog,
		openDirectoryDialog,
		updateSelectedImage,
		handleImageChange,
		handleSwitchToGrid,
		handleImageSelect,
		handleBackToGrid,
		handleBackToWelcome,
		handleDroppedPaths,
		// 画像ファイル管理
		loadImageFiles,
		clearImageFiles,
		// ViewerPage用のアクション
		loadImage,
		toggleInfoPanel,
		setInfoPanelFocus,
		setInfoPanelWidth,
		setResizing,
		showUI,
		hideUI,
		resetUITimer,
		startAutoNavigation,
		stopAutoNavigation,
		// イベントハンドラー（@attachで使用）
		handleMouseMove,
		handleResize
	}
};
