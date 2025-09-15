import { goto } from '$app/navigation';

/**
 * Centralized navigation utilities for the application.
 * Provides type-safe and consistent navigation methods.
 */

/**
 * Navigate to the Welcome page
 */
export const navigateToWelcome = (): void => {
	goto('/');
};

/**
 * Navigate to the Grid view for a specific directory
 * @param directoryPath - The directory path to display
 */
export const navigateToGrid = (directoryPath: string): void => {
	goto(`/grid/${encodeURIComponent(directoryPath)}`);
};

/**
 * Navigate to the Viewer for a specific image
 * @param imagePath - The image path to display
 */
export const navigateToViewer = (imagePath: string): void => {
	goto(`/viewer/${encodeURIComponent(imagePath)}`);
};
