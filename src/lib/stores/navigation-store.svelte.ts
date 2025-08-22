import { open } from '@tauri-apps/plugin-dialog';
import { getImageFiles } from '../image/image-loader';
import { getDirectoryFromPath, isDirectory, isImageFile } from '../image/utils';
import { filterStore } from './filter-store.svelte';
import { gridStore } from './grid-store.svelte';
import { metadataRegistry } from './metadata-registry.svelte';
import { tagStore } from './tag-store.svelte';
import { thumbnailRegistry } from './thumbnail-registry.svelte';

export type ImageLoadingState = 'idle' | 'loading' | 'loaded';

type MutableNavigationState = {
	imageFiles: string[];
	imageLoadingState: ImageLoadingState;
	imageFileLoadError: string | null;
};

export type NavigationState = Readonly<MutableNavigationState>;

const INITIAL_NAVIGATION_STATE: MutableNavigationState = {
	imageFiles: [],
	imageLoadingState: 'idle',
	imageFileLoadError: null
};

let state = $state<MutableNavigationState>({
	imageFiles: [],
	imageLoadingState: 'idle',
	imageFileLoadError: null
});

const loadImageFiles = async (selectedDirectory: string | null): Promise<void> => {
	console.log(
		'🔄 loadImageFiles: Started selectedDirectory=' +
			selectedDirectory +
			' currentImageFiles=' +
			state.imageFiles.length
	);

	if (!selectedDirectory) {
		console.log('❌ loadImageFiles: selectedDirectory is empty');
		state.imageFiles = [];
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
		state.imageFiles = files;
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
		state.imageFiles = [];
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
	state.imageFiles = [];
	state.imageLoadingState = 'idle';
	state.imageFileLoadError = null;
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

const handleDroppedPaths = async (paths: string[]): Promise<{ path: string; isDirectory: boolean } | null> => {
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
	clearImageFiles();

	console.log('🔄 clearAllData: Resetting stores');
	tagStore.actions.reset();
	filterStore.actions.reset();
	gridStore.actions.reset();
	metadataRegistry.reset();
	thumbnailRegistry.reset();
};

const reset = (): void => {
	state.imageFiles = INITIAL_NAVIGATION_STATE.imageFiles;
	state.imageLoadingState = INITIAL_NAVIGATION_STATE.imageLoadingState;
	state.imageFileLoadError = INITIAL_NAVIGATION_STATE.imageFileLoadError;
};

export const navigationStore = {
	state: state as NavigationState,
	actions: {
		loadImageFiles,
		clearImageFiles,
		openFileDialog,
		openDirectoryDialog,
		handleDroppedPaths,
		clearAllData,
		reset
	}
};