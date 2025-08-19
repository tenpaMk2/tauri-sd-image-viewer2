<script lang="ts">
	import type { ImageMetadata } from '../../image/utils';

	const {
		metadata
	}: {
		metadata: ImageMetadata;
	} = $props();
</script>

<div class="rounded-lg bg-base-300 p-4">
	<h3 class="mb-3 text-base font-semibold">Date & Time</h3>
	<div class="space-y-2 text-sm">
		<div class="flex flex-col gap-1">
			<div class="text-base-content/70">Created:</div>
			<div class="font-mono text-xs">{metadata.created}</div>
		</div>

		<div class="flex flex-col gap-1">
			<div class="text-base-content/70">Modified:</div>
			<div class="font-mono text-xs">{metadata.modified}</div>
		</div>
	</div>
</div>
