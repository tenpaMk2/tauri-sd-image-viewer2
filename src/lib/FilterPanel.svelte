<script lang="ts">
	import Icon from '@iconify/svelte';
	import { filterStore, type RatingComparison } from './stores/filter-store.svelte';

	const {
		isExpanded = false,
		totalImages = 0,
		filteredImages = 0
	}: {
		isExpanded?: boolean;
		totalImages?: number;
		filteredImages?: number;
	} = $props();

	let selectedRating = $state(filterStore.state.targetRating);
	let selectedComparison = $state(filterStore.state.ratingComparison);
	let patternValue = $state(filterStore.state.filenamePattern);
	let showHelpModal = $state(false);

	// Handle star rating selection
	const handleStarClick = (rating: number) => {
		// 現在選択中の星を再度クリックしたら星0になる
		selectedRating = selectedRating === rating ? 0 : rating;
		updateRatingFilter();
	};

	// Handle comparison operator change
	const handleComparisonChange = (event: Event) => {
		const target = event.target as HTMLSelectElement;
		selectedComparison = target.value as RatingComparison;
		updateRatingFilter();
	};

	// Update rating filter
	const updateRatingFilter = () => {
		filterStore.updateRatingFilter(selectedRating, selectedComparison);
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
		selectedRating = 0;
		selectedComparison = 'gte';
		patternValue = '';
	};

	// Show help modal
	const showHelp = () => {
		showHelpModal = true;
	};

	// Close help modal
	const closeHelpModal = () => {
		showHelpModal = false;
	};

	// Get filter summary
	const filterSummary = $derived(filterStore.getFilterSummary(totalImages, filteredImages));
	const hasActiveFilters = $derived(filterStore.state.isActive);
</script>

<div class="border-b border-base-300 bg-base-100 p-3">
	<div class="flex items-center justify-between gap-4">
		<!-- Filter Summary -->
		<div class="flex items-center gap-2">
			{#if filterSummary}
				<span class="text-xs text-base-content/60">{filterSummary}</span>
			{/if}
		</div>

		<!-- Clear Button -->
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

	<!-- Compact Filter Controls -->
	<div class="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
		<!-- Rating Filter -->
		<div class="flex items-center gap-2">
			<span class="text-sm font-medium min-w-[4rem]">Rating</span>
			<select
				class="select select-bordered select-sm w-16"
				value={selectedComparison}
				onchange={handleComparisonChange}
			>
				<option value="gte">≥</option>
				<option value="eq">=</option>
				<option value="lte">≤</option>
			</select>
			
			<!-- DaisyUI Rating Component -->
			<div class="rating rating-sm">
				{#each [1, 2, 3, 4, 5] as rating}
					<input
						type="radio"
						name="rating-filter"
						class="mask mask-star-2 bg-orange-400"
						checked={selectedRating === rating}
						onclick={() => handleStarClick(rating)}
						title={`${rating} star${rating !== 1 ? 's' : ''} (click again for unrated)`}
					/>
				{/each}
			</div>
		</div>

		<!-- Filename Pattern Filter -->
		<div class="flex items-center gap-2">
			<span class="text-sm font-medium min-w-[4rem]">Pattern</span>
			<input
				type="text"
				placeholder="e.g., IMG, test, *.jpg"
				class="input input-bordered input-sm flex-1"
				value={patternValue}
				oninput={handlePatternChange}
			/>
			<button
				class="btn btn-ghost btn-xs"
				onclick={showHelp}
				title="Pattern Help"
			>
				<Icon icon="lucide:help-circle" class="h-4 w-4" />
			</button>
		</div>
	</div>
</div>

<!-- Help Modal -->
<div class="modal {showHelpModal ? 'modal-open' : ''}">
	<div class="modal-box">
		<h3 class="text-lg font-bold">Filename Pattern Help</h3>
		<p class="py-2">Filter files by partial matching or glob patterns:</p>
		
		<div class="mb-4">
			<h4 class="font-semibold">Partial Matching</h4>
			<p class="text-sm text-base-content/70 mb-2">Simply type part of the filename (case-insensitive):</p>
			<ul class="text-sm space-y-1 ml-4">
				<li>• <code>IMG</code> matches IMG_0001.jpg, image.png</li>
				<li>• <code>test</code> matches test.jpg, mytest.png</li>
				<li>• <code>001</code> matches IMG_001.jpg, photo001.png</li>
			</ul>
		</div>

		<div class="overflow-x-auto">
			<h4 class="font-semibold mb-2">Glob Patterns (Advanced)</h4>
			<table class="table table-sm">
				<thead>
					<tr>
						<th>Pattern</th>
						<th>Description</th>
						<th>Example</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>*</code></td>
						<td>Any characters</td>
						<td><code>*.jpg</code> matches all JPEG files</td>
					</tr>
					<tr>
						<td><code>?</code></td>
						<td>Single character</td>
						<td><code>IMG_????.jpg</code> matches IMG_0001.jpg</td>
					</tr>
					<tr>
						<td><code>[...]</code></td>
						<td>Character set</td>
						<td><code>*[0-9]*</code> matches files with numbers</td>
					</tr>
					<tr>
						<td><code>IMG_*</code></td>
						<td>Starts with "IMG_"</td>
						<td>Matches IMG_001.png, IMG_test.jpg</td>
					</tr>
				</tbody>
			</table>
		</div>
		
		<div class="modal-action">
			<button class="btn" onclick={closeHelpModal}>Close</button>
		</div>
	</div>
	<div class="modal-backdrop" onclick={closeHelpModal} onkeydown={closeHelpModal} role="button" tabindex="0"></div>
</div>