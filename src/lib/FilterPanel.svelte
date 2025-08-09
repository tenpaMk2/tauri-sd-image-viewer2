<script lang="ts">
	import Icon from '@iconify/svelte';
	import { filterStore, type RatingComparison } from './stores/filter-store.svelte';
	import type { TagAggregationResult } from './services/tag-aggregation-service';

	const {
		isExpanded = false,
		totalImages = 0,
		filteredImages = 0,
		tagData = null
	}: {
		isExpanded?: boolean;
		totalImages?: number;
		filteredImages?: number;
		tagData?: TagAggregationResult | null;
	} = $props();

	let selectedRating = $state(filterStore.state.targetRating);
	let selectedComparison = $state(filterStore.state.ratingComparison);
	let patternValue = $state(filterStore.state.filenamePattern);
	let selectedTags = $state(filterStore.state.selectedTags);
	let tagInput = $state('');
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

	// Handle tag input changes
	const handleTagInputChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		tagInput = target.value;
	};

	// Handle tag input enter key or selection
	const handleTagInputSubmit = (event: Event) => {
		if (event instanceof KeyboardEvent && event.key !== 'Enter') return;

		const tagName = tagInput.trim();
		if (tagName && tagData?.uniqueTagNames.includes(tagName.toLowerCase())) {
			filterStore.addTag(tagName);
			selectedTags = filterStore.state.selectedTags;
			tagInput = '';
		}
	};

	// Handle tag removal
	const removeTag = (tagName: string) => {
		filterStore.removeTag(tagName);
		selectedTags = filterStore.state.selectedTags;
	};

	// Clear all tags
	const clearAllTags = () => {
		filterStore.clearAllTags();
		selectedTags = filterStore.state.selectedTags;
	};

	// Show help modal
	const showHelp = () => {
		showHelpModal = true;
	};

	// Close help modal
	const closeHelpModal = () => {
		showHelpModal = false;
	};
</script>

<div class="border-b border-base-300 bg-base-100 p-4">
	<!-- Compact Filter Controls -->
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
		<!-- Rating Filter -->
		<div class="flex items-center gap-2">
			<!-- DaisyUI Rating Component -->
			<div class="rating-sm rating">
				{#each [1, 2, 3, 4, 5] as rating}
					<input
						type="radio"
						name="rating-filter"
						class="mask bg-orange-400 mask-star-2"
						checked={selectedRating === rating}
						onclick={() => handleStarClick(rating)}
						title={`${rating} star${rating !== 1 ? 's' : ''} (click again for unrated)`}
					/>
				{/each}
			</div>

			<select
				class="select-bordered select w-16 select-sm"
				value={selectedComparison}
				onchange={handleComparisonChange}
			>
				<option value="lte">≤</option>
				<option value="eq">=</option>
				<option value="gte">≥</option>
			</select>
		</div>

		<!-- Filename Pattern Filter -->
		<div class="flex items-center gap-2">
			<input
				type="search"
				placeholder="Filter by filename..."
				class="input-bordered input input-sm flex-1"
				value={patternValue}
				oninput={handlePatternChange}
			/>
			<button class="btn btn-ghost btn-xs" onclick={showHelp} title="Pattern Help">
				<Icon icon="lucide:help-circle" class="h-4 w-4" />
			</button>
		</div>

		<!-- SD Tags Filter -->
		<div class="flex flex-col gap-2">
			<div class="flex items-center gap-2">
				<input
					type="text"
					placeholder={tagData ? 'Filter by SD tags...' : 'Loading SD tags...'}
					class="input-bordered input input-sm flex-1"
					list="sd-tags"
					bind:value={tagInput}
					oninput={handleTagInputChange}
					onkeydown={handleTagInputSubmit}
					disabled={tagData && tagData.uniqueTagNames.length === 0}
				/>
				{#if tagData && tagData.uniqueTagNames.length > 0}
					<datalist id="sd-tags">
						{#each tagData.uniqueTagNames as tagName}
							<option value={tagName}>{tagName}</option>
						{/each}
					</datalist>
				{/if}
				{#if selectedTags.length > 0}
					<button class="btn btn-ghost btn-xs" onclick={clearAllTags} title="Clear All Tags">
						<Icon icon="lucide:x" class="h-3 w-3" />
					</button>
				{/if}
			</div>

			<!-- Selected tags display -->
			{#if selectedTags.length > 0}
				<div class="flex flex-wrap gap-1">
					{#each selectedTags as tagName}
						<div class="badge gap-1 badge-sm badge-primary">
							{tagName}
							<button
								class="btn h-3 h-auto min-h-0 w-3 p-0 btn-ghost btn-xs"
								onclick={() => removeTag(tagName)}
								title="Remove tag"
							>
								<Icon icon="lucide:x" class="h-2 w-2" />
							</button>
						</div>
					{/each}
				</div>
			{/if}
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
			<p class="mb-2 text-sm text-base-content/70">
				Simply type part of the filename (case-insensitive):
			</p>
			<ul class="ml-4 space-y-1 text-sm">
				<li>• <code>IMG</code> matches IMG_0001.jpg, image.png</li>
				<li>• <code>test</code> matches test.jpg, mytest.png</li>
				<li>• <code>001</code> matches IMG_001.jpg, photo001.png</li>
			</ul>
		</div>

		<div class="overflow-x-auto">
			<h4 class="mb-2 font-semibold">Glob Patterns (Advanced)</h4>
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
	<div
		class="modal-backdrop"
		onclick={closeHelpModal}
		onkeydown={closeHelpModal}
		role="button"
		tabindex="0"
	></div>
</div>
