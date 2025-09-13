import { path } from '@tauri-apps/api';
import * as fs from '@tauri-apps/plugin-fs';
import { SUPPORTED_IMAGE_EXTS } from './mime-type';

export type NavigationState = {
	previousImagePath: string | null;
	nextImagePath: string | null;
	currentImagePath: string;
	currentIndex: number;
	parentDir: string;
	totalImages: number;
};

export type NavigationActions = {
	getLastImagePath: () => Promise<string | null>;
};

export type NavigationStore = {
	state: NavigationState;
	actions: NavigationActions;
};

const getDirectoryImages = async (directoryPath: string): Promise<string[]> => {
	try {
		const entries = await fs.readDir(directoryPath);
		const imageExtensions = SUPPORTED_IMAGE_EXTS.map((ext) => `.${ext}`);

		const imageEntries = entries.filter(
			(entry) =>
				entry.isFile && imageExtensions.some((ext) => entry.name.toLowerCase().endsWith(ext)),
		);

		const imagePaths = await Promise.all(
			imageEntries
				.sort((a, b) => a.name.localeCompare(b.name, 'ja', { numeric: true }))
				.map(async (entry): Promise<string> => await path.join(directoryPath, entry.name)),
		);

		return imagePaths;
	} catch (error) {
		console.error('Failed to read directory: ' + directoryPath + ' ' + error);
		throw new Error(`Failed to load directory: ${directoryPath}`);
	}
};

export const createNavigationStore = async (imagePath: string): Promise<NavigationStore> => {
	const directory = await path.dirname(imagePath);
	const imageFiles = await getDirectoryImages(directory);

	const currentIndex = imageFiles.findIndex((file) => file === imagePath);
	if (currentIndex === -1) {
		throw new Error(`Current image not found in directory: ${imagePath}`);
	}

	const previousImagePath = 0 < currentIndex ? imageFiles[currentIndex - 1] : null;
	const nextImagePath = currentIndex < imageFiles.length - 1 ? imageFiles[currentIndex + 1] : null;

	const getLastImagePath = async (): Promise<string | null> => {
		const updatedImageFiles = await getDirectoryImages(directory);
		return 0 < updatedImageFiles.length ? updatedImageFiles.at(-1)! : null;
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
			getLastImagePath,
		},
	};
};
