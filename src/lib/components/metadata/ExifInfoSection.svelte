<script lang="ts">
	import type { ImageMetadata } from '../../image/types';
	import { unifiedMetadataService } from '../../services/unified-metadata-service.svelte';

	const {
		metadata,
		imagePath
	}: {
		metadata: ImageMetadata;
		imagePath?: string;
	} = $props();

	// Rating書き込み中かどうかをリアクティブにチェック（配列版）
	const isRatingWriting = $derived(
		imagePath ? unifiedMetadataService.currentWritingFiles.includes(imagePath) : false
	);
</script>

{#if metadata.exifInfo}
	<div class="rounded-lg bg-base-300 p-3">
		<h3 class="mb-2 text-sm font-semibold">Exif Info</h3>
		<div class="space-y-1.5 text-xs">
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
					<div class="flex items-center gap-2">
						{#if isRatingWriting}
							<!-- Rating書き込み中のスピナー -->
							<div class="flex items-center gap-1">
								<span class="loading loading-xs loading-spinner"></span>
								<span class="text-xs opacity-70">Saving...</span>
							</div>
						{:else}
							<!-- 通常のRating表示 -->
							<span>{metadata.exifInfo.rating || 0}/5</span>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
