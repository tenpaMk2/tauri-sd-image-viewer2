import { open } from '@tauri-apps/plugin-dialog';
import { getDirectoryFromPath, isDirectory, isImageFile } from '../image/utils';
import type { AsyncThumbnailQueue } from '../services/async-thumbnail-queue';
import { imageMetadataStore } from './image-metadata-store.svelte';
import { metadataService } from '../services/metadata-service.svelte';
import type { ViewMode } from '../ui/types';

export type AppState = {
	viewMode: ViewMode;
	selectedImagePath: string | null;
	selectedDirectory: string | null;
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
	refreshCurrentImageMetadata: () => Promise<void>;
	handleDroppedPaths: (paths: string[]) => Promise<void>;
};

// アクティブなサムネイルキューの管理
let activeQueue: AsyncThumbnailQueue | null = null;

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
let appState = $state<AppState>({
	viewMode: 'welcome',
	selectedImagePath: null,
	selectedDirectory: null
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
			const reactiveMetadata = metadataService.getReactiveMetadata(selected);
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
			appState.selectedDirectory = selected;
			appState.viewMode = 'grid';
		}
	} catch (error) {
		console.error('フォルダ選択エラー: ' + error);
	}
};

const updateSelectedImage = async (imagePath: string): Promise<void> => {
	// リアクティブメタデータの事前読み込み
	const reactiveMetadata = metadataService.getReactiveMetadata(imagePath);
	if (!reactiveMetadata.isLoaded && !reactiveMetadata.isLoading) {
		await reactiveMetadata.load();
	}

	appState.selectedImagePath = imagePath;
};

const handleImageChange = async (newPath: string): Promise<void> => {
	await updateSelectedImage(newPath);
};

const handleSwitchToGrid = async (): Promise<void> => {
	// Rating書き込み処理を待機（クラッシュ防止）
	await imageMetadataStore.waitForAllRatingWrites();

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

const refreshCurrentImageMetadata = async (): Promise<void> => {
	const currentImagePath = appState.selectedImagePath;

	if (currentImagePath) {
		const reactiveMetadata = metadataService.getReactiveMetadata(currentImagePath);
		// リフレッシュ実行
		await reactiveMetadata.forceReload();
		// リアクティブシステムでは自動更新されるため、状態更新は不要
	}
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
			const reactiveMetadata = metadataService.getReactiveMetadata(firstPath);
			if (!reactiveMetadata.isLoaded && !reactiveMetadata.isLoading) {
				await reactiveMetadata.load();
			}
			const selectedDirectory = await getDirectoryFromPath(firstPath);

			appState.selectedImagePath = firstPath;
			appState.selectedDirectory = selectedDirectory;
			appState.viewMode = 'viewer';
		}
	} catch (error) {
		console.error('Error processing dropped path: ' + error);
	}
};

export const appStore = {
	get state() { return appState; },
	actions: {
		openFileDialog,
		openDirectoryDialog,
		updateSelectedImage,
		handleImageChange,
		handleSwitchToGrid,
		handleImageSelect,
		handleBackToGrid,
		handleBackToWelcome,
		refreshCurrentImageMetadata,
		handleDroppedPaths
	}
};
