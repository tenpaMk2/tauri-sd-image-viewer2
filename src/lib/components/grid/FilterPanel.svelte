<script lang="ts">
	import { getContext } from 'svelte';
	import IconButton from '../ui/IconButton.svelte';
	import { FILTER_CONTEXT, type FilterContext } from './filter';

	const filterContext = $derived(getContext<() => FilterContext>(FILTER_CONTEXT)());

	const ratingValue = $derived(filterContext.state.ratingValue);
	const ratingOperator = $derived(filterContext.state.ratingOperator);
	const patternValue = $derived(filterContext.state.filenamePattern);

	// Handle rating value changes (star clicks)
	const handleRatingStarClick = (clickedRating: number) => {
		// 同じ星をクリックした場合は0に戻す、そうでなければ新しいRating値を設定
		const newRating = ratingValue === clickedRating ? 0 : clickedRating;
		filterContext.actions.setRatingValue(newRating);
	};

	// Handle rating operator changes
	const handleRatingOperatorChange = (event: Event) => {
		const target = event.target as HTMLSelectElement;
		const operator = target.value as '<=' | '=' | '>=';
		filterContext.actions.setRatingOperator(operator);
	};

	// Handle pattern input changes with debouncing
	let patternTimeout: number | undefined;
	const handlePatternChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		const value = target.value;

		// Debounce pattern updates
		clearTimeout(patternTimeout);
		patternTimeout = setTimeout(() => {
			filterContext.actions.setFilenamePattern(value);
		}, 300);
	};

	// Clear all filters
	const clearAllFilters = () => {
		filterContext.actions.clearFilters();
	};

	// Pattern help modal
	let patternHelpModal = $state<HTMLDialogElement | null>(null);
</script>

{#if filterContext.state.isFilterPanelVisible}
	<div class="border-b border-base-300 bg-base-100 p-3">
		<div class="flex justify-between gap-4">
			<!-- Rating Filter -->
			<div class="flex items-center gap-2">
				<!-- Rating Stars -->
				<div class="rating-sm rating">
					{#each Array(5) as _, i}
						<input
							type="radio"
							name="rating-filter"
							class="mask bg-white mask-star-2"
							class:opacity-100={i + 1 <= ratingValue}
							class:opacity-30={ratingValue < i + 1}
							checked={i + 1 === ratingValue}
							onclick={() => handleRatingStarClick(i + 1)}
							aria-label={`${i + 1} star rating`}
						/>
					{/each}
				</div>

				<!-- Rating Operator Selector -->
				<select
					class="select w-14 select-sm"
					value={ratingOperator}
					onchange={handleRatingOperatorChange}
				>
					<option value="<=">≤</option>
					<option value="=">=</option>
					<option value=">=">≥</option>
				</select>
			</div>

			<!-- Filename Pattern Filter -->
			<div class="flex grow items-center gap-2">
				<input
					id="filename-filter"
					type="text"
					placeholder="e.g., DSC, IMG, .jpg"
					class="input input-sm w-full"
					value={patternValue}
					oninput={handlePatternChange}
				/>
				<IconButton
					icon="help-circle"
					title="Pattern Examples"
					onClick={() => patternHelpModal?.showModal()}
				/>
			</div>
		</div>

		<!-- Pattern Help Modal -->
		<dialog bind:this={patternHelpModal} class="modal">
			<div class="modal-box">
				<form method="dialog">
					<button class="btn absolute top-2 right-2 btn-circle btn-ghost btn-sm">✕</button>
				</form>
				<h3 class="mb-4 text-lg font-bold">Pattern Examples</h3>

				<div class="space-y-3">
					<div>
						<h4 class="mb-2 text-base font-semibold">Basic Patterns</h4>
						<div class="space-y-1 text-sm">
							<div><code class="rounded bg-base-200 px-1">DSC</code> - Files containing "DSC"</div>
							<div><code class="rounded bg-base-200 px-1">IMG</code> - Files containing "IMG"</div>
							<div>
								<code class="rounded bg-base-200 px-1">.jpg</code> - Files ending with ".jpg"
							</div>
						</div>
					</div>

					<div>
						<h4 class="mb-2 text-base font-semibold">Advanced Patterns</h4>
						<div class="space-y-1 text-sm">
							<div>
								<code class="rounded bg-base-200 px-1">IMG_*</code> - Files starting with "IMG_"
							</div>
							<div><code class="rounded bg-base-200 px-1">*.png</code> - All PNG files</div>
							<div>
								<code class="rounded bg-base-200 px-1">photo_???.jpg</code> - "photo_" + 3 characters
								+ ".jpg"
							</div>
						</div>
					</div>

					<div>
						<h4 class="mb-2 text-base font-semibold">Special Characters</h4>
						<div class="space-y-1 text-sm">
							<div><code class="rounded bg-base-200 px-1">*</code> - Match any characters</div>
							<div><code class="rounded bg-base-200 px-1">?</code> - Match single character</div>
							<div><code class="rounded bg-base-200 px-1">**</code> - Match across directories</div>
						</div>
					</div>
				</div>
			</div>
			<form method="dialog" class="modal-backdrop">
				<button>close</button>
			</form>
		</dialog>
	</div>
{/if}
