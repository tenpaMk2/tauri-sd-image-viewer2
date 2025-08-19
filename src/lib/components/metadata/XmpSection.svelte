<script lang="ts">
	import type { ReactiveImageMetadata } from '../../stores/image-metadata-store.svelte';

	const {
		metadata
	}: {
		metadata: ReactiveImageMetadata;
	} = $props();
</script>

<div class="collapse-arrow collapse bg-base-100">
	<input type="checkbox" checked />
	<div class="collapse-title text-lg font-medium">XMP Data</div>
	<div class="collapse-content">
		<div class="space-y-2">
			<!-- Rating -->
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium">Rating:</span>
				<span class="text-sm">
					{metadata.autoRating ?? 0}/5
				</span>
			</div>
		</div>
	</div>
</div>
