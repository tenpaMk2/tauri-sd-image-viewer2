export const DIRECTORY_IMAGE_PATHS_CONTEXT = Symbol('directoryImagePathsContext');

export type DirectoryImagePathsContext = {
	state: { imagePaths: string[] };
	actions: { refresh: () => Promise<void> };
};
