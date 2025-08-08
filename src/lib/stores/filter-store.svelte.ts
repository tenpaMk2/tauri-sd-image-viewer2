/**
 * Grid filtering store for rating and filename filtering
 */
import { filterFilesByGlob } from '../utils/glob-utils';
import type { ThumbnailService } from '../services/thumbnail-service';

export type FilterState = {
	/** Rating filter: 0 = show all, 1-5 = show only that rating or higher */
	minRating: number;
	/** Filename glob pattern filter */
	filenamePattern: string;
	/** Whether filters are active */
	isActive: boolean;
};

const createFilterStore = () => {
	let state = $state<FilterState>({
		minRating: 0,
		filenamePattern: '',
		isActive: false
	});

	const updateMinRating = (rating: number) => {
		state.minRating = Math.max(0, Math.min(5, rating));
		updateActiveState();
	};

	const updateFilenamePattern = (pattern: string) => {
		state.filenamePattern = pattern.trim();
		updateActiveState();
	};

	const clearFilters = () => {
		state.minRating = 0;
		state.filenamePattern = '';
		state.isActive = false;
	};

	const updateActiveState = () => {
		state.isActive = state.minRating > 0 || state.filenamePattern !== '';
	};

	/**
	 * Filter image files based on current filter settings
	 * @param imagePaths - array of image file paths
	 * @param thumbnailService - service to get rating information
	 * @returns filtered array of image paths
	 */
	const filterImages = (imagePaths: string[], thumbnailService: ThumbnailService): string[] => {
		let filtered = imagePaths;

		// Apply filename pattern filter
		if (state.filenamePattern) {
			filtered = filterFilesByGlob(filtered, state.filenamePattern);
		}

		// Apply rating filter
		if (state.minRating > 0) {
			filtered = filtered.filter(imagePath => {
				const rating = thumbnailService.getImageRating(imagePath);
				return rating !== undefined && rating >= state.minRating;
			});
		}

		return filtered;
	};

	/**
	 * Get filter summary text for UI display
	 */
	const getFilterSummary = (totalCount: number, filteredCount: number): string => {
		if (!state.isActive) return '';

		const filters = [];
		if (state.minRating > 0) {
			filters.push(`Rating ${state.minRating}+`);
		}
		if (state.filenamePattern) {
			filters.push(`"${state.filenamePattern}"`);
		}

		const filterText = filters.join(' & ');
		const hiddenCount = totalCount - filteredCount;
		
		return `${filterText} (${filteredCount} shown, ${hiddenCount} hidden)`;
	};

	return {
		get state() { return state; },
		updateMinRating,
		updateFilenamePattern,
		clearFilters,
		filterImages,
		getFilterSummary
	};
};

export const filterStore = createFilterStore();