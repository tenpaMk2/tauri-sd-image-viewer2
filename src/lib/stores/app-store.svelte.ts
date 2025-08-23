import { getDirectoryFromPath } from '../image/utils';
import type { ViewMode } from '../ui/types';
import { metadataQueue } from './metadata-queue';
import { metadataRegistry } from './metadata-registry.svelte';
import { navigationStore } from './navigation-store.svelte';
import { thumbnailQueue } from './thumbnail-queue';
import { thumbnailRegistry } from './thumbnail-registry.svelte';
import { viewerStore } from './viewer-store.svelte';

type MutableAppState = {
	viewMode: ViewMode;
	selectedImagePath: string | null;
	selectedDirectory: string | null;
};

type ViewModeTransitionOptions = {
	imagePath?: string | null;
	directory?: string | null;
	skipCleanup?: boolean;
};

export type AppState = Readonly<MutableAppState>;

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
	reset: () => void;
};

const INITIAL_APP_STATE: MutableAppState = {
	viewMode: 'welcome',
	selectedImagePath: null,
	selectedDirectory: null
};

let state = $state<MutableAppState>({
	viewMode: 'welcome',
	selectedImagePath: null,
	selectedDirectory: null
});

/**
 * 内部状態遷移API - 適切なクリーンアップと共に状態を変更
 */
const _transitionTo = async (
	newViewMode: ViewMode,
	options: ViewModeTransitionOptions = {}
): Promise<void> => {
	const currentMode = state.viewMode;
	const { imagePath, directory, skipCleanup = false } = options;

	console.log(`🔄 State transition: ${currentMode} -> ${newViewMode}`);

	// 遷移前のクリーンアップ
	if (!skipCleanup) {
		// Viewer離脱時のクリーンアップ
		if (currentMode === 'viewer' && newViewMode !== 'viewer') {
			console.log('🗑️ Viewer -> Other: Running viewer cleanup');
			viewerStore.actions.cleanup();
		}

		// Grid離脱してViewer遷移時のクリーンアップ
		if (currentMode === 'grid' && newViewMode === 'viewer') {
			console.log('🗑️ Grid -> Viewer: Clearing queues to prioritize viewer mode');
			metadataQueue.clear();
			thumbnailQueue.clear();

			const currentImageFiles = navigationStore.state.imageFiles || [];
			thumbnailRegistry.clearUnused(currentImageFiles);
		}

		// Welcome遷移時の全体クリーンアップ
		if (newViewMode === 'welcome') {
			console.log('🗑️ Any -> Welcome: Clearing all data');
			navigationStore.actions.clearAllData();
		}
	}

	// 状態更新
	state.viewMode = newViewMode;
	if (imagePath !== undefined) {
		state.selectedImagePath = imagePath;
	}
	if (directory !== undefined) {
		state.selectedDirectory = directory;
	}

	console.log(`✅ State transition completed: ${newViewMode}`);
};

const openFileDialog = async (): Promise<void> => {
	const selected = await navigationStore.actions.openFileDialog();

	if (selected) {
		// リアクティブメタデータの事前読み込み
		const store = metadataRegistry.getOrCreateStore(selected);
		console.log('📊 Reactive metadata created');
		if (store.state.loadingStatus === 'unloaded') {
			console.log('🔄 Loading metadata...');
			await store.actions.ensureLoaded();
			console.log('✅ Metadata loaded');
		}
		const selectedDirectory = await getDirectoryFromPath(selected);
		console.log('📂 Directory: ' + selectedDirectory);

		// 状態遷移API使用
		await _transitionTo('viewer', {
			imagePath: selected,
			directory: selectedDirectory
		});

		// 画像を明示的に読み込み
		await viewerStore.actions.loadImage(selected);
	}
};

const openDirectoryDialog = async (): Promise<void> => {
	const selected = await navigationStore.actions.openDirectoryDialog();

	if (selected) {
		// 古いデータとキューをクリア
		navigationStore.actions.clearAllData();

		console.log('🔄 openDirectoryDialog: Updating app state');

		// 状態遷移API使用
		await _transitionTo('grid', {
			directory: selected,
			skipCleanup: true // 既にclearAllDataで清掃済み
		});

		// 画像ファイルを自動的にロード
		console.log('🔄 openDirectoryDialog: loadImageFiles started');
		await navigationStore.actions.loadImageFiles(state.selectedDirectory!);
		console.log('✅ openDirectoryDialog: loadImageFiles completed');
	}
};

const updateSelectedImage = async (imagePath: string): Promise<void> => {
	// リアクティブメタデータの事前読み込み
	const store = metadataRegistry.getOrCreateStore(imagePath);
	if (store.state.loadingStatus === 'unloaded') {
		await store.actions.ensureLoaded();
	}

	state.selectedImagePath = imagePath;
};

const handleImageChange = async (newPath: string): Promise<void> => {
	await updateSelectedImage(newPath);
	// ビューアーモードで画像パスが変更された場合は画像を読み込み
	if (state.viewMode === 'viewer') {
		await viewerStore.actions.loadImage(newPath);
	}
};

const handleSwitchToGrid = async (): Promise<void> => {
	await _transitionTo('grid');
};

const handleImageSelect = async (imagePath: string): Promise<void> => {
	await updateSelectedImage(imagePath);
	await _transitionTo('viewer');

	// 画像を明示的に読み込み
	await viewerStore.actions.loadImage(imagePath);
};

const handleBackToGrid = async (): Promise<void> => {
	await _transitionTo('grid');
};

const handleBackToWelcome = async (): Promise<void> => {
	await _transitionTo('welcome', {
		imagePath: null,
		directory: null
	});
};

const handleDroppedPaths = async (paths: string[]): Promise<void> => {
	const result = await navigationStore.actions.handleDroppedPaths(paths);

	if (!result) return;

	if (result.isDirectory) {
		// 古いデータとキューをクリア
		navigationStore.actions.clearAllData();

		// 状態遷移API使用
		await _transitionTo('grid', {
			directory: result.path,
			skipCleanup: true // 既にclearAllDataで清掃済み
		});

		// 画像ファイルを自動的にロード
		await navigationStore.actions.loadImageFiles(state.selectedDirectory!);
	} else {
		// リアクティブメタデータの事前読み込み
		const store = metadataRegistry.getOrCreateStore(result.path);
		if (store.state.loadingStatus === 'unloaded') {
			await store.actions.ensureLoaded();
		}
		const selectedDirectory = await getDirectoryFromPath(result.path);

		// 状態遷移API使用
		await _transitionTo('viewer', {
			imagePath: result.path,
			directory: selectedDirectory
		});

		// 画像を明示的に読み込み
		await viewerStore.actions.loadImage(result.path);
	}
};

const reset = (): void => {
	// 状態遷移APIを使わずに直接リセット（同期的）
	state.viewMode = INITIAL_APP_STATE.viewMode;
	state.selectedImagePath = INITIAL_APP_STATE.selectedImagePath;
	state.selectedDirectory = INITIAL_APP_STATE.selectedDirectory;
};

export const appStore = {
	state: state as AppState,
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
		reset
	}
};
