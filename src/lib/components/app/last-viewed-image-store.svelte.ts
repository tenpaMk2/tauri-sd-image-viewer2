/**
 * Last viewed image store
 * Manages the last viewed image state for scroll-to-thumbnail functionality
 */

type LastViewedImageState = {
	imagePath: string;
	directoryPath: string;
} | null;

const createLastViewedImageStore = () => {
	let state = $state<LastViewedImageState>(null);

	const actions = {
		/**
		 * Set the last viewed image
		 */
		setLastViewedImage: (imagePath: string, directoryPath: string) => {
			state = { imagePath, directoryPath };
		},

		/**
		 * Get the last viewed image if it belongs to the specified directory
		 * Returns the image path if directory matches, null otherwise
		 */
		getLastViewedImageInDirectory: (directoryPath: string): string | null => {
			if (state?.directoryPath === directoryPath) {
				return state.imagePath;
			}
			return null;
		},

		/**
		 * Clear the last viewed image state
		 */
		clear: () => {
			state = null;
		},
	};

	return {
		get state() {
			return state;
		},
		actions,
	};
};

export const lastViewedImageStore = createLastViewedImageStore();
