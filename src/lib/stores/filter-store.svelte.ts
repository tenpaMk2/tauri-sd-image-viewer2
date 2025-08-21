/**
 * Grid filtering store for rating and filename filtering
 */
import type { TagAggregationService } from '../services/tag-aggregation-service';
import { filterFilesByGlob } from '../utils/glob-utils';

export type RatingComparison = 'gte' | 'eq' | 'lte';

export type FilterState = {
	/** Target rating value (0 = not filtering, 1-5 = rating value) */
	targetRating: number;
	/** Rating comparison type: 'gte' = >=, 'eq' = ==, 'lte' = <= */
	ratingComparison: RatingComparison;
	/** Filename glob pattern filter */
	filenamePattern: string;
	/** Selected SD tags for filtering (AND condition) */
	selectedTags: string[];
	/** Whether filters are active */
	isActive: boolean;
};

const createFilterStore = () => {
	let state = $state<FilterState>({
		targetRating: 0, // Always active: 0 = unrated, 1-5 = rated
		ratingComparison: 'gte', // Default: >= 0 (show all)
		filenamePattern: '',
		selectedTags: [],
		isActive: false
	});

	const updateRatingFilter = (rating: number, comparison: RatingComparison) => {
		// Always keep rating filter active: 0 = unrated, 1-5 = rated
		state.targetRating = Math.max(0, Math.min(5, rating));
		state.ratingComparison = comparison;
		updateActiveState();
	};

	const updateFilenamePattern = (pattern: string) => {
		state.filenamePattern = pattern.trim();
		updateActiveState();
	};

	const addTag = (tagName: string) => {
		const normalizedTag = tagName.trim().toLowerCase();
		if (normalizedTag && !state.selectedTags.includes(normalizedTag)) {
			state.selectedTags = [...state.selectedTags, normalizedTag];
			updateActiveState();
		}
	};

	const removeTag = (tagName: string) => {
		const normalizedTag = tagName.trim().toLowerCase();
		state.selectedTags = state.selectedTags.filter((tag) => tag !== normalizedTag);
		updateActiveState();
	};

	const clearAllTags = () => {
		state.selectedTags = [];
		updateActiveState();
	};

	const clearFilters = () => {
		state.targetRating = 0; // Reset to >= 0 (show all)
		state.ratingComparison = 'gte';
		state.filenamePattern = '';
		state.selectedTags = [];
		state.isActive = false;
	};

	const updateActiveState = () => {
		// Filename pattern and SD tags affect isActive (rating is always active)
		state.isActive = state.filenamePattern !== '' || state.selectedTags.length > 0;
	};

	/**
	 * Filter image files based on current filter settings
	 * @param imagePaths - array of image file paths
	 * @param ratingsMap - preloaded ratings map for synchronous access
	 * @param tagAggregationService - service to check SD tags
	 * @returns filtered array of image paths
	 */
	const filterImages = (
		imagePaths: string[],
		ratingsMap: Map<string, number | undefined>,
		tagAggregationService?: TagAggregationService
	): string[] => {
		let filtered = imagePaths;

		// Apply filename pattern filter
		if (state.filenamePattern) {
			filtered = filterFilesByGlob(filtered, state.filenamePattern);
		}

		// Apply rating filter (always active)
		filtered = filtered.filter((imagePath) => {
			const rating = ratingsMap.get(imagePath);
			// rating: undefined または 0 = unrated (星0扱い)
			const normalizedRating = rating === undefined ? 0 : rating;

			switch (state.ratingComparison) {
				case 'gte':
					return normalizedRating >= state.targetRating;
				case 'eq':
					return normalizedRating === state.targetRating;
				case 'lte':
					return normalizedRating <= state.targetRating;
				default:
					return true;
			}
		});

		// Apply SD tags filter (AND condition) - 同期処理で高速化
		if (state.selectedTags.length > 0 && tagAggregationService) {
			filtered = filtered.filter((imagePath) => {
				return tagAggregationService.imageContainsAllTagsSync(imagePath, state.selectedTags);
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
		// Always show rating filter (only show if not default >= 0)
		if (!(state.targetRating === 0 && state.ratingComparison === 'gte')) {
			const comparisonSymbol =
				state.ratingComparison === 'gte' ? '+' : state.ratingComparison === 'eq' ? '' : '-';
			const ratingText =
				state.targetRating === 0 ? 'Unrated' : `${state.targetRating}${comparisonSymbol}`;
			filters.push(`Rating ${ratingText}`);
		}
		if (state.filenamePattern) {
			filters.push(`"${state.filenamePattern}"`);
		}
		if (state.selectedTags.length > 0) {
			const tagText =
				state.selectedTags.length === 1
					? `Tag: ${state.selectedTags[0]}`
					: `Tags: ${state.selectedTags.join(', ')}`;
			filters.push(tagText);
		}

		const filterText = filters.join(' & ');
		const hiddenCount = totalCount - filteredCount;

		return `${filterText} (${filteredCount} shown, ${hiddenCount} hidden)`;
	};

	return {
		get state() {
			return state;
		},
		updateRatingFilter,
		updateFilenamePattern,
		addTag,
		removeTag,
		clearAllTags,
		clearFilters,
		filterImages,
		getFilterSummary
	};
};

export const filterStore = createFilterStore();
