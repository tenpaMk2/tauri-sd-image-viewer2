import { getDirectoryFromPath } from '../image/utils';
import type { ViewMode } from '../ui/types';
import { metadataRegistry } from './metadata-registry.svelte';
import { navigationStore } from './navigation-store.svelte';
import { viewerStore } from './viewer-store.svelte';

type MutableAppState = {
	viewMode: ViewMode;
	selectedImagePath: string | null;
	selectedDirectory: string | null;
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

		console.log('🔄 Updating app state to viewer mode');
		state.selectedImagePath = selected;
		state.selectedDirectory = selectedDirectory;
		state.viewMode = 'viewer';
		console.log('✅ App state updated');

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
		state.selectedDirectory = selected;
		state.viewMode = 'grid';

		// 画像ファイルを自動的にロード
		console.log('🔄 openDirectoryDialog: loadImageFiles started');
		await navigationStore.actions.loadImageFiles(state.selectedDirectory);
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
	// Viewerモードから離れる際のクリーンアップ
	if (state.viewMode === 'viewer') {
		viewerStore.actions.cleanup();
	}

	// グリッドモードに戻る
	state.viewMode = 'grid';
};

const handleImageSelect = async (imagePath: string): Promise<void> => {
	await updateSelectedImage(imagePath);
	state.viewMode = 'viewer';

	// 画像を明示的に読み込み
	await viewerStore.actions.loadImage(imagePath);
};

const handleBackToGrid = async (): Promise<void> => {
	// Viewerモードから離れる際のクリーンアップ
	if (state.viewMode === 'viewer') {
		viewerStore.actions.cleanup();
	}

	state.viewMode = 'grid';
};

const handleBackToWelcome = async (): Promise<void> => {
	// Viewerモードから離れる際のクリーンアップ
	if (state.viewMode === 'viewer') {
		viewerStore.actions.cleanup();
	}

	// 不要な処理を停止するためにストアをクリア
	navigationStore.actions.clearAllData();

	state.viewMode = 'welcome';
	state.selectedImagePath = null;
	state.selectedDirectory = null;
};

const handleDroppedPaths = async (paths: string[]): Promise<void> => {
	const result = await navigationStore.actions.handleDroppedPaths(paths);
	
	if (!result) return;

	if (result.isDirectory) {
		// 古いデータとキューをクリア
		navigationStore.actions.clearAllData();

		state.selectedDirectory = result.path;
		state.viewMode = 'grid';

		// 画像ファイルを自動的にロード
		await navigationStore.actions.loadImageFiles(state.selectedDirectory);
	} else {
		// リアクティブメタデータの事前読み込み
		const store = metadataRegistry.getOrCreateStore(result.path);
		if (store.state.loadingStatus === 'unloaded') {
			await store.actions.ensureLoaded();
		}
		const selectedDirectory = await getDirectoryFromPath(result.path);

		state.selectedImagePath = result.path;
		state.selectedDirectory = selectedDirectory;
		state.viewMode = 'viewer';

		// 画像を明示的に読み込み
		await viewerStore.actions.loadImage(result.path);
	}
};

const reset = (): void => {
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
