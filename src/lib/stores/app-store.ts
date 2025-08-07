import { writable } from 'svelte/store';
import type { ImageMetadata } from '../image/types';
import type { ViewMode } from '../ui/types';
import { getDirectoryFromPath } from '../image/utils';
import { imageMetadataService } from '../services/image-metadata-service';
import { open } from '@tauri-apps/plugin-dialog';

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
			const imageMetadata = await imageMetadataService.getImageMetadataUnsafe(selected);
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
	const newMetadata = await imageMetadataService.getImageMetadataUnsafe(imagePath);

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
	appState.update((state) => ({
		...state,
		viewMode: 'grid'
	}));
};

const handleImageSelect = async (imagePath: string): Promise<void> => {
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
	appState.set(initialState);
};

const refreshCurrentImageMetadata = async (): Promise<void> => {
	let currentImagePath: string | null = null;

	appState.subscribe((state) => {
		currentImagePath = state.selectedImagePath;
	})();

	if (currentImagePath) {
		const refreshedMetadata = await imageMetadataService.refreshMetadataUnsafe(currentImagePath);
		appState.update((state) => ({
			...state,
			imageMetadata: refreshedMetadata
		}));
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
		refreshCurrentImageMetadata
	}
};
