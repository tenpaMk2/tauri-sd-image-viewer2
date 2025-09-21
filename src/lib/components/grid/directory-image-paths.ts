export const DIRECTORY_IMAGE_PATHS_STATE = Symbol('directoryImagePathsState');
export const DIRECTORY_IMAGE_PATHS_ACTIONS = Symbol('directoryImagePathsActions');

export type DirectoryImagePathsState = {
	imagePaths: string[];
};

export type DirectoryImagePathsActions = {
	refresh: () => Promise<void>;
};
