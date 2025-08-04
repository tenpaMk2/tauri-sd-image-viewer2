<script lang="ts">
	import type { ImageMetadata } from '../../image/types';

	const {
		metadata
	}: {
		metadata: ImageMetadata;
	} = $props();
</script>

{#if metadata.camera || metadata.lens || metadata.settings}
	<div class="rounded-lg bg-base-300 p-3">
		<h3 class="mb-2 text-sm font-semibold">撮影情報</h3>
		<div class="space-y-1.5 text-xs">
			{#if metadata.camera}
				<div class="flex justify-between">
					<div class="text-base-content/70">カメラ:</div>
					<div>{metadata.camera}</div>
				</div>
			{/if}

			{#if metadata.lens}
				<div class="flex justify-between">
					<div class="text-base-content/70">レンズ:</div>
					<div>{metadata.lens}</div>
				</div>
			{/if}

			{#if metadata.settings}
				<div class="flex flex-col gap-1">
					<div class="text-base-content/70">設定:</div>
					<div class="font-mono text-xs">{metadata.settings}</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
