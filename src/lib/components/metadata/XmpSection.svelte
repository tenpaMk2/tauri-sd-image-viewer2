<script lang="ts">
	import type { ReactiveImageMetadata } from '../../stores/image-metadata-store.svelte';

	const {
		metadata
	}: {
		metadata: ReactiveImageMetadata;
	} = $props();
</script>

<div class="rounded-lg bg-base-300 p-3">
	<h3 class="mb-2 text-sm font-semibold">XMP Data</h3>
	<div class="space-y-1.5 text-xs">
		<!-- Rating -->
		<div class="flex justify-between">
			<div class="text-base-content/70">Rating:</div>
			<div>{metadata.rating ?? 0}/5</div>
		</div>
	</div>
</div>
