export const FILTERED_IMAGE_PATHS_CONTEXT = Symbol('filteredImagePathsContext');

export type FilteredImagePathsContext = {
	state: {
		imagePaths: string[];
	};
};
