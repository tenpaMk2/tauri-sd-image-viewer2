import { getImagePaths } from '$lib/services/image-loader';

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
