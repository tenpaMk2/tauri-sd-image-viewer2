<script lang="ts">
	import type { ImageMetadata } from '../../image/types';

	const {
		metadata
	}: {
		metadata: ImageMetadata;
	} = $props();
</script>

<div class="rounded-lg bg-base-300 p-3">
	<h3 class="mb-2 text-sm font-semibold">Basic Info</h3>
	<div class="space-y-1.5 text-xs">
		<div class="flex justify-between">
			<div class="text-base-content/70">Filename:</div>
			<div class="text-right font-mono max-w-[60%] break-words overflow-wrap-anywhere">{metadata.filename}</div>
		</div>

		<div class="flex justify-between">
			<div class="text-base-content/70">Size:</div>
			<div>{metadata.size}</div>
		</div>

		<div class="flex justify-between">
			<div class="text-base-content/70">Resolution:</div>
			<div>{metadata.dimensions}</div>
		</div>

		<div class="flex justify-between">
			<div class="text-base-content/70">Format:</div>
			<div>{metadata.format}</div>
		</div>

		<div class="flex justify-between">
			<div class="text-base-content/70">Created:</div>
			<div class="text-right font-mono text-xs">{metadata.created}</div>
		</div>

		<div class="flex justify-between">
			<div class="text-base-content/70">Modified:</div>
			<div class="text-right font-mono text-xs">{metadata.modified}</div>
		</div>
	</div>
</div>
