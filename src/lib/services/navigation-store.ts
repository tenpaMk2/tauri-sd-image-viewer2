import { path } from '@tauri-apps/api';
import { navigateToGrid, navigateToViewer } from './app-navigation';
import { autoNavStore } from './auto-nav-store.svelte';
import { imageCacheStore } from './image-cache-store';
import { getDirectoryImages } from './image-directory-service';
import { toastStore } from './toast-store.svelte';

export type NavigationState = {
	previousImagePath: string | null;
	nextImagePath: string | null;
	currentImagePath: string;
	currentIndex: number;
	parentDir: string;
	totalImages: number;
};

export type NavigationActions = {
	navigateToNext: () => void;
	navigateToPrevious: () => void;
	preloadNextImage: () => Promise<string | null>;
	preloadPreviousImage: () => Promise<string | null>;
	refreshAndNavigateToLatest: () => Promise<void>;
	navigateToParentGrid: () => Promise<void>;
};

export type NavigationStore = {
	state: NavigationState;
	actions: NavigationActions;
};

export const createNavigationStore = async (imagePath: string): Promise<NavigationStore> => {
	const directory = await path.dirname(imagePath);
	const imageFiles = await getDirectoryImages(directory);

	const currentIndex = imageFiles.findIndex((file) => file === imagePath);
	if (currentIndex === -1) {
		throw new Error(`Current image not found in directory: ${imagePath}`);
	}

	const previousImagePath = imageFiles.at((currentIndex - 1) % imageFiles.length)!;
	const nextImagePath = imageFiles.at((currentIndex + 1) % imageFiles.length)!;

	const refreshAndGetLastImagePath = async (): Promise<string | null> => {
		const updatedImageFiles = await getDirectoryImages(directory);
		return 0 < updatedImageFiles.length ? updatedImageFiles.at(-1)! : null;
	};

	const loadImageAsUrl = async (imagePath: string): Promise<string | null> => {
		return imageCacheStore.actions.load(imagePath);
	};

	const preloadNextImage = async (): Promise<string | null> => {
		return nextImagePath ? await loadImageAsUrl(nextImagePath) : null;
	};

	const preloadPreviousImage = async (): Promise<string | null> => {
		return previousImagePath ? await loadImageAsUrl(previousImagePath) : null;
	};

	const navigateToNext = () => {
		if (!nextImagePath) return;

		autoNavStore.actions.stop();

		// Navigate to new page
		navigateToViewer(nextImagePath);

		// Check if wrapping from last to first
		if (currentIndex === imageFiles.length - 1) {
			toastStore.actions.showInfoToast('Moved to first image');
		}
	};

	const navigateToPrevious = () => {
		if (!previousImagePath) return;

		autoNavStore.actions.stop();

		// Navigate to new page
		navigateToViewer(previousImagePath);

		// Check if wrapping from first to last
		if (currentIndex === 0) {
			toastStore.actions.showInfoToast('Moved to last image');
		}
	};

	const refreshAndNavigateToLatest = async (): Promise<void> => {
		try {
			const latestImagePath = await refreshAndGetLastImagePath();
			if (!latestImagePath) return;
			navigateToViewer(latestImagePath);
		} catch (error) {
			console.error('Failed to refresh and navigate to latest: ' + error);
		}
	};

	const navigateToParentGrid = async (): Promise<void> => {
		try {
			if (!directory) return;
			navigateToGrid(directory);
		} catch (error) {
			console.error('Failed to navigate to parent grid: ' + error);
		}
	};

	return {
		state: {
			previousImagePath,
			nextImagePath,
			currentImagePath: imagePath,
			currentIndex,
			parentDir: directory,
			totalImages: imageFiles.length,
		},
		actions: {
			navigateToNext,
			navigateToPrevious,
			preloadNextImage,
			preloadPreviousImage,
			refreshAndNavigateToLatest,
			navigateToParentGrid,
		},
	};
};
