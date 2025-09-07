import { SUPPORTED_IMAGE_EXTS } from '$lib/services/mime-type';
import { join } from '@tauri-apps/api/path';
import { readDir } from '@tauri-apps/plugin-fs';

type MutableDirectoryImagePathsState = {
	currentDirectory: string | null;
	imagePaths: string[] | null;
	loadingStatus: 'unloaded' | 'loading' | 'loaded' | 'error';
	loadingError: string | null;
};

export type DirectoryImagePathsState = Readonly<MutableDirectoryImagePathsState>;

const INITIAL_DIRECTORY_IMAGE_PATHS_STATE: DirectoryImagePathsState = {
	currentDirectory: null,
	imagePaths: null,
	loadingStatus: 'unloaded',
	loadingError: null,
};

const _state = $state<MutableDirectoryImagePathsState>({ ...INITIAL_DIRECTORY_IMAGE_PATHS_STATE });

/**
 * ディレクトリ内の画像ファイル一覧を取得
 */
const getImagePaths = async (directoryPath: string): Promise<string[]> => {
	try {
		console.log('Reading directory: ' + directoryPath);
		const entries = await readDir(directoryPath);
		console.log('Directory entry count: ' + entries.length);

		const imageExtensions = SUPPORTED_IMAGE_EXTS.map((ext) => `.${ext}`);
		const imageEntries = entries.filter(
			(entry) =>
				entry.isFile && imageExtensions.some((ext) => entry.name.toLowerCase().endsWith(ext)),
		);
		console.log('Filtered image entries count:', imageEntries.length);

		// path.joinを使って正しいパスを構築
		const imageFiles = await Promise.all(
			imageEntries
				.sort((a, b) => a.name.localeCompare(b.name, 'ja', { numeric: true }))
				.map(async (entry): Promise<string> => await join(directoryPath, entry.name)),
		);

		console.log('Image file list completed: ' + imageFiles.length + ' files');
		return imageFiles;
	} catch (error) {
		console.error('Failed to read directory: ' + directoryPath + ' Error:', error);
		throw new Error(`Failed to load directory: ${directoryPath}. Original error: ${error}`);
	}
};

const loadImagePaths = async (dir: string) => {
	_state.loadingError = null;
	_state.loadingStatus = 'loading';
	try {
		_state.imagePaths = await getImagePaths(dir);
	} catch (error) {
		_state.loadingStatus = 'error';
		if (error instanceof Error) {
			_state.loadingError = error.message;
		} else {
			_state.loadingError = 'Unknown error';
		}
		_state.currentDirectory = null;
	} finally {
		_state.loadingStatus = 'loaded';
		_state.currentDirectory = dir;
		_state.loadingError = null;
	}
};

export const directoryImagePathsStore = {
	state: _state as DirectoryImagePathsState,
	deriveds: {},
	actions: {
		loadImagePaths,
	},
};
