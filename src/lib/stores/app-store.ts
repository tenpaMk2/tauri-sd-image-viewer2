import { open } from '@tauri-apps/plugin-dialog';
import { writable } from 'svelte/store';
import type { ImageMetadata } from '../image/types';
import { getDirectoryFromPath, isDirectory, isImageFile } from '../image/utils';
import { unifiedMetadataService } from '../services/unified-metadata-service.svelte';
import { globalThumbnailService } from '../services/global-thumbnail-service';
import type { ViewMode } from '../ui/types';

export type AppState = {
	viewMode: ViewMode;
	selectedImagePath: string | null;
	imageMetadata: ImageMetadata | null;
	selectedDirectory: string | null;
};

export type AppActions = {
	openFileDialog: () => Promise<void>;
	openDirectoryDialog: () => Promise<void>;
	updateSelectedImage: (imagePath: string) => Promise<void>;
	handleImageChange: (newPath: string) => Promise<void>;
	handleSwitchToGrid: () => void;
	handleImageSelect: (imagePath: string) => Promise<void>;
	handleBackToGrid: () => void;
	handleBackToWelcome: () => void;
	refreshCurrentImageMetadata: () => Promise<void>;
	handleDroppedPaths: (paths: string[]) => Promise<void>;
};

// 従来のwritableストアを使用
const initialState: AppState = {
	viewMode: 'welcome',
	selectedImagePath: null,
	imageMetadata: null,
	selectedDirectory: null
};

const appState = writable(initialState);

const openFileDialog = async (): Promise<void> => {
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

		if (selected && typeof selected === 'string') {
			// ファイル選択でビューアーモードに移行する時は、サムネイル生成キューを停止
			globalThumbnailService.stopActiveQueue();

			const imageMetadata = await unifiedMetadataService.getImageMetadataUnsafe(selected);
			const selectedDirectory = await getDirectoryFromPath(selected);

			appState.update((state) => ({
				...state,
				selectedImagePath: selected,
				imageMetadata,
				selectedDirectory,
				viewMode: 'viewer'
			}));
		}
	} catch (error) {
		console.error('ファイル選択エラー:', error);
	}
};

const openDirectoryDialog = async (): Promise<void> => {
	try {
		const selected = await open({
			directory: true,
			multiple: false
		});

		if (selected && typeof selected === 'string') {
			appState.update((state) => ({
				...state,
				selectedDirectory: selected,
				viewMode: 'grid'
			}));
		}
	} catch (error) {
		console.error('フォルダ選択エラー:', error);
	}
};

const updateSelectedImage = async (imagePath: string): Promise<void> => {
	const newMetadata = await unifiedMetadataService.getImageMetadataUnsafe(imagePath);

	appState.update((state) => ({
		...state,
		selectedImagePath: imagePath,
		imageMetadata: newMetadata
	}));
};

const handleImageChange = async (newPath: string): Promise<void> => {
	await updateSelectedImage(newPath);
};

const handleSwitchToGrid = (): void => {
	// グリッドモードに戻る時は、前のキューが動いていても継続させる
	appState.update((state) => ({
		...state,
		viewMode: 'grid'
	}));
};

const handleImageSelect = async (imagePath: string): Promise<void> => {
	// ビューアーモードに切り替える時は、サムネイル生成キューを停止
	globalThumbnailService.stopActiveQueue();

	await updateSelectedImage(imagePath);
	appState.update((state) => ({
		...state,
		viewMode: 'viewer'
	}));
};

const handleBackToGrid = (): void => {
	appState.update((state) => ({
		...state,
		viewMode: 'grid'
	}));
};

const handleBackToWelcome = (): void => {
	// ウェルカム画面に戻る時は、サムネイル生成キューを停止してクリア
	globalThumbnailService.clearActiveService();
	appState.set(initialState);
};

const refreshCurrentImageMetadata = async (): Promise<void> => {
	let currentImagePath: string | null = null;

	appState.subscribe((state) => {
		currentImagePath = state.selectedImagePath;
	})();

	if (currentImagePath) {
		const refreshedMetadata = await unifiedMetadataService.refreshMetadataUnsafe(currentImagePath);
		appState.update((state) => ({
			...state,
			imageMetadata: refreshedMetadata
		}));
	}
};

const handleDroppedPaths = async (paths: string[]): Promise<void> => {
	if (paths.length === 0) return;

	const firstPath = paths[0];

	try {
		if (await isDirectory(firstPath)) {
			globalThumbnailService.clearActiveService();
			appState.update((state) => ({
				...state,
				selectedDirectory: firstPath,
				viewMode: 'grid'
			}));
		} else if (isImageFile(firstPath)) {
			globalThumbnailService.stopActiveQueue();

			const imageMetadata = await unifiedMetadataService.getImageMetadataUnsafe(firstPath);
			const selectedDirectory = await getDirectoryFromPath(firstPath);

			appState.update((state) => ({
				...state,
				selectedImagePath: firstPath,
				imageMetadata,
				selectedDirectory,
				viewMode: 'viewer'
			}));
		}
	} catch (error) {
		console.error('Error processing dropped path:', error);
	}
};

export const appStore = {
	subscribe: appState.subscribe,
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
