/**
 * Grid filtering store for rating and filename filtering
 */
import type { TagAggregationService } from '$lib/services/tag-aggregation';
import { filterFilesByGlob } from '$lib/utils/glob-utils';

export type RatingComparison = 'gte' | 'eq' | 'lte';

type MutableFilterState = {
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

export type FilterState = Readonly<MutableFilterState>;

const INITIAL_FILTER_STATE: MutableFilterState = {
	targetRating: 0, // Always active: 0 = unrated, 1-5 = rated
	ratingComparison: 'gte', // Default: >= 0 (show all)
	filenamePattern: '',
	selectedTags: [],
	isActive: false,
};

const _state = $state<MutableFilterState>({ ...INITIAL_FILTER_STATE });

// debouncing用のタイマー
let patternTimeout: number | undefined;

const updateRatingFilter = (rating: number, comparison: RatingComparison) => {
	// Always keep rating filter active: 0 = unrated, 1-5 = rated
	_state.targetRating = Math.max(0, Math.min(5, rating));
	_state.ratingComparison = comparison;
	updateActiveState();
};

const updateFilenamePattern = (pattern: string) => {
	_state.filenamePattern = pattern.trim();
	updateActiveState();
};

const updateFilenamePatternWithDebounce = (pattern: string) => {
	// Debounce pattern updates
	clearTimeout(patternTimeout);
	patternTimeout = setTimeout(() => {
		updateFilenamePattern(pattern);
	}, 300);
};

const addTag = (tagName: string) => {
	const normalizedTag = tagName.trim().toLowerCase();
	if (normalizedTag && !_state.selectedTags.includes(normalizedTag)) {
		_state.selectedTags = [..._state.selectedTags, normalizedTag];
		updateActiveState();
	}
};

const removeTag = (tagName: string) => {
	const normalizedTag = tagName.trim().toLowerCase();
	_state.selectedTags = _state.selectedTags.filter((tag) => tag !== normalizedTag);
	updateActiveState();
};

const clearAllTags = () => {
	_state.selectedTags = [];
	updateActiveState();
};

const clearFilters = () => {
	_state.targetRating = INITIAL_FILTER_STATE.targetRating;
	_state.ratingComparison = INITIAL_FILTER_STATE.ratingComparison;
	_state.filenamePattern = INITIAL_FILTER_STATE.filenamePattern;
	_state.selectedTags = INITIAL_FILTER_STATE.selectedTags;
	_state.isActive = INITIAL_FILTER_STATE.isActive;
};

const reset = () => {
	// 初期状態に完全リセット
	clearFilters();
};

const updateActiveState = () => {
	// Filename pattern and SD tags affect isActive (rating is always active)
	_state.isActive = _state.filenamePattern !== '' || _state.selectedTags.length > 0;
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
	tagAggregationService?: TagAggregationService,
): string[] => {
	let filtered = imagePaths;

	// Apply filename pattern filter
	if (_state.filenamePattern) {
		filtered = filterFilesByGlob(filtered, _state.filenamePattern);
	}

	// Apply rating filter (always active)
	filtered = filtered.filter((imagePath) => {
		const rating = ratingsMap.get(imagePath);
		// rating: undefined または 0 = unrated (星0扱い)
		const normalizedRating = rating === undefined ? 0 : rating;

		switch (_state.ratingComparison) {
			case 'gte':
				return normalizedRating >= _state.targetRating;
			case 'eq':
				return normalizedRating === _state.targetRating;
			case 'lte':
				return normalizedRating <= _state.targetRating;
			default:
				return true;
		}
	});

	// Apply SD tags filter (AND condition) - 同期処理で高速化
	if (_state.selectedTags.length > 0 && tagAggregationService) {
		filtered = filtered.filter((imagePath) => {
			return tagAggregationService.imageContainsAllTagsSync(imagePath, _state.selectedTags);
		});
	}

	return filtered;
};

/**
 * Get filter summary text for UI display
 */
const getFilterSummary = (totalCount: number, filteredCount: number): string => {
	if (!_state.isActive) return '';

	const filters = [];
	// Always show rating filter (only show if not default >= 0)
	if (!(_state.targetRating === 0 && _state.ratingComparison === 'gte')) {
		const comparisonSymbol =
			_state.ratingComparison === 'gte' ? '+' : _state.ratingComparison === 'eq' ? '' : '-';
		const ratingText =
			_state.targetRating === 0 ? 'Unrated' : `${_state.targetRating}${comparisonSymbol}`;
		filters.push(`Rating ${ratingText}`);
	}
	if (_state.filenamePattern) {
		filters.push(`"${_state.filenamePattern}"`);
	}
	if (_state.selectedTags.length > 0) {
		const tagText =
			_state.selectedTags.length === 1
				? `Tag: ${_state.selectedTags[0]}`
				: `Tags: ${_state.selectedTags.join(', ')}`;
		filters.push(tagText);
	}

	const filterText = filters.join(' & ');
	const hiddenCount = totalCount - filteredCount;

	return `${filterText} (${filteredCount} shown, ${hiddenCount} hidden)`;
};

export const filterStore = {
	state: _state as FilterState,
	actions: {
		updateRatingFilter,
		updateFilenamePattern,
		updateFilenamePatternWithDebounce,
		addTag,
		removeTag,
		clearAllTags,
		clearFilters,
		reset,
		filterImages,
		getFilterSummary,
	},
};
