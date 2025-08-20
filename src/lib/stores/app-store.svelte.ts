import { navigationService } from '$lib/services/navigation-service.svelte';
import { open } from '@tauri-apps/plugin-dialog';
import { getDirectoryFromPath, isDirectory, isImageFile } from '../image/utils';
import type { AsyncThumbnailQueue } from '../services/async-thumbnail-queue';
import type { ViewMode } from '../ui/types';
import { imageMetadataStore } from './image-metadata-store.svelte';

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

// アクティブなサムネイルキューの管理
let activeQueue: AsyncThumbnailQueue | null = null;

// Viewer用のタイマー管理
let uiTimer: number | null = null;
let autoNavTimer: number | null = null;

export const setActiveQueue = (queue: AsyncThumbnailQueue): void => {
	// 以前のキューを停止
	if (activeQueue && activeQueue !== queue) {
		console.log('Stopping previous thumbnail queue');
		activeQueue.stop();
	}
	activeQueue = queue;
};

export const stopActiveQueue = (): void => {
	if (activeQueue) {
		console.log('Stopping active thumbnail queue');
		activeQueue.stop();
	}
};

export const clearActiveQueue = (): void => {
	if (activeQueue) {
		activeQueue.stop();
		activeQueue = null;
	}
};

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
	}
});

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
			// ファイル選択でビューアーモードに移行する時は、サムネイル生成キューを停止
			stopActiveQueue();
			console.log('🛑 Active queue stopped');

			// リアクティブメタデータの事前読み込み
			const reactiveMetadata = imageMetadataStore.getMetadata(selected);
			console.log('📊 Reactive metadata created');
			if (!reactiveMetadata.isLoaded && !reactiveMetadata.isLoading) {
				console.log('🔄 Loading metadata...');
				await reactiveMetadata.load();
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
		const selected = await open({
			directory: true,
			multiple: false
		});

		if (selected && typeof selected === 'string') {
			// 既存のキューを停止してクリア
			clearActiveQueue();
			
			// メタデータをクリア
			imageMetadataStore.clearAll();
			
			appState.selectedDirectory = selected;
			appState.viewMode = 'grid';
		}
	} catch (error) {
		console.error('フォルダ選択エラー: ' + error);
	}
};

const updateSelectedImage = async (imagePath: string): Promise<void> => {
	// リアクティブメタデータの事前読み込み
	const reactiveMetadata = imageMetadataStore.getMetadata(imagePath);
	if (!reactiveMetadata.isLoaded && !reactiveMetadata.isLoading) {
		await reactiveMetadata.load();
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
	await imageMetadataStore.waitForAllRatingWrites();

	// Viewerモードから離れる際のクリーンアップ
	if (appState.viewMode === 'viewer') {
		cleanupViewerState();
	}

	// グリッドモードに戻る時は、前のキューが動いていても継続させる
	appState.viewMode = 'grid';
};

const handleImageSelect = async (imagePath: string): Promise<void> => {
	// Rating書き込み処理を待機（クラッシュ防止）
	await imageMetadataStore.waitForAllRatingWrites();

	// ビューアーモードに切り替える時は、サムネイル生成キューを停止
	stopActiveQueue();

	await updateSelectedImage(imagePath);
	appState.viewMode = 'viewer';

	// 画像を明示的に読み込み
	await loadImage(imagePath);
};

const handleBackToGrid = async (): Promise<void> => {
	// Rating書き込み処理を待機（クラッシュ防止）
	await imageMetadataStore.waitForAllRatingWrites();

	appState.viewMode = 'grid';
};

const handleBackToWelcome = async (): Promise<void> => {
	// Rating書き込み処理を待機（クラッシュ防止）
	await imageMetadataStore.waitForAllRatingWrites();

	// ウェルカム画面に戻る時は、サムネイル生成キューを停止してクリア
	clearActiveQueue();
	appState.viewMode = 'welcome';
	appState.selectedImagePath = null;
	appState.selectedDirectory = null;
};

const handleDroppedPaths = async (paths: string[]): Promise<void> => {
	if (paths.length === 0) return;

	const firstPath = paths[0];

	try {
		if (await isDirectory(firstPath)) {
			clearActiveQueue();
			appState.selectedDirectory = firstPath;
			appState.viewMode = 'grid';
		} else if (isImageFile(firstPath)) {
			stopActiveQueue();

			// リアクティブメタデータの事前読み込み
			const reactiveMetadata = imageMetadataStore.getMetadata(firstPath);
			if (!reactiveMetadata.isLoaded && !reactiveMetadata.isLoading) {
				await reactiveMetadata.load();
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

export const appStore = {
	get state() {
		return appState;
	},
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
