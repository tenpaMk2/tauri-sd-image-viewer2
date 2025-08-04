<script lang="ts">
	import type { ImageMetadata } from '../../image/types';

	const {
		metadata
	}: {
		metadata: ImageMetadata;
	} = $props();
</script>

{#if metadata.exifInfo}
	<div class="rounded-lg bg-base-300 p-4">
		<h3 class="mb-3 text-base font-semibold">Exif情報</h3>
		<div class="space-y-2 text-sm">
			{#if metadata.exifInfo.date_time_original}
				<div class="flex justify-between">
					<div class="text-base-content/70">Date/Time Original:</div>
					<div class="font-mono text-xs">{metadata.exifInfo.date_time_original}</div>
				</div>
			{/if}

			{#if metadata.exifInfo.create_date}
				<div class="flex justify-between">
					<div class="text-base-content/70">Create Date:</div>
					<div class="font-mono text-xs">{metadata.exifInfo.create_date}</div>
				</div>
			{/if}

			{#if metadata.exifInfo.modify_date}
				<div class="flex justify-between">
					<div class="text-base-content/70">Modify Date:</div>
					<div class="font-mono text-xs">{metadata.exifInfo.modify_date}</div>
				</div>
			{/if}

			{#if metadata.exifInfo.rating !== undefined && metadata.exifInfo.rating !== null}
				<div class="flex justify-between">
					<div class="text-base-content/70">Rating:</div>
					<div>{metadata.exifInfo.rating || 0}/5</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
