<script lang="ts">
	import Icon from '@iconify/svelte';
	import { filterStore } from './stores/filter-store.svelte';

	const {
		isExpanded = false,
		totalImages = 0,
		filteredImages = 0
	}: {
		isExpanded?: boolean;
		totalImages?: number;
		filteredImages?: number;
	} = $props();

	let expanded = $state(isExpanded);
	let ratingValue = $state(filterStore.state.minRating.toString());
	let patternValue = $state(filterStore.state.filenamePattern);

	// Handle rating input changes
	const handleRatingChange = (event: Event) => {
		const target = event.target as HTMLSelectElement;
		const rating = parseInt(target.value);
		filterStore.updateMinRating(rating);
		ratingValue = target.value;
	};

	// Handle pattern input changes with debouncing
	let patternTimeout: number | undefined;
	const handlePatternChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		patternValue = target.value;
		
		// Debounce pattern updates
		clearTimeout(patternTimeout);
		patternTimeout = setTimeout(() => {
			filterStore.updateFilenamePattern(patternValue);
		}, 300);
	};

	// Clear all filters
	const clearAllFilters = () => {
		filterStore.clearFilters();
		ratingValue = '0';
		patternValue = '';
	};

	// Toggle panel expansion
	const toggleExpanded = () => {
		expanded = !expanded;
	};

	// Get filter summary
	const filterSummary = $derived(filterStore.getFilterSummary(totalImages, filteredImages));
	const hasActiveFilters = $derived(filterStore.state.isActive);
</script>

<div class="border-b border-base-300 bg-base-100">
	<!-- Filter Header -->
	<div class="flex items-center justify-between p-3">
		<div class="flex items-center gap-2">
			<button
				class="btn btn-ghost btn-xs"
				onclick={toggleExpanded}
				title={expanded ? 'Hide Filters' : 'Show Filters'}
			>
				<Icon
					icon={expanded ? 'lucide:chevron-up' : 'lucide:chevron-down'}
					class="h-4 w-4"
				/>
			</button>
			<span class="text-sm font-medium">Filters</span>
			{#if hasActiveFilters}
				<div class="badge badge-primary badge-xs"></div>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			{#if filterSummary}
				<span class="text-xs text-base-content/60">{filterSummary}</span>
			{/if}
			{#if hasActiveFilters}
				<button
					class="btn btn-ghost btn-xs"
					onclick={clearAllFilters}
					title="Clear All Filters"
				>
					<Icon icon="lucide:x" class="h-3 w-3" />
				</button>
			{/if}
		</div>
	</div>

	<!-- Filter Controls -->
	{#if expanded}
		<div class="border-t border-base-200 p-3">
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<!-- Rating Filter -->
				<div class="form-control">
					<label class="label" for="rating-filter">
						<span class="label-text text-sm">Rating</span>
					</label>
					<select
						id="rating-filter"
						class="select select-bordered select-sm"
						value={ratingValue}
						onchange={handleRatingChange}
					>
						<option value="0">All ratings</option>
						<option value="1">★ 1+ stars</option>
						<option value="2">★★ 2+ stars</option>
						<option value="3">★★★ 3+ stars</option>
						<option value="4">★★★★ 4+ stars</option>
						<option value="5">★★★★★ 5 stars only</option>
					</select>
				</div>

				<!-- Filename Pattern Filter -->
				<div class="form-control">
					<label class="label" for="filename-filter">
						<span class="label-text text-sm">Filename Pattern</span>
						<span class="label-text-alt text-xs text-base-content/60">
							Use * for wildcards
						</span>
					</label>
					<input
						id="filename-filter"
						type="text"
						placeholder="e.g., *.jpg, DSC*, test?"
						class="input input-bordered input-sm"
						value={patternValue}
						oninput={handlePatternChange}
					/>
				</div>
			</div>

			<!-- Filter Help -->
			<div class="mt-3">
				<details class="collapse collapse-arrow">
					<summary class="collapse-title min-h-0 py-2 text-xs text-base-content/60">
						Pattern examples
					</summary>
					<div class="collapse-content text-xs text-base-content/60">
						<ul class="space-y-1">
							<li><code>*.jpg</code> - All JPEG files</li>
							<li><code>IMG_*</code> - Files starting with "IMG_"</li>
							<li><code>DSC?????</code> - DSC followed by 5 characters</li>
							<li><code>*[0-9]*</code> - Files containing numbers</li>
							<li><code>photo*.*</code> - Files starting with "photo"</li>
						</ul>
					</div>
				</details>
			</div>
		</div>
	{/if}
</div>