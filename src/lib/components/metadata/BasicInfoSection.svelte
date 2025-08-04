<script lang="ts">
	import type { ImageMetadata } from '../../image/types';

	const {
		metadata
	}: {
		metadata: ImageMetadata;
	} = $props();
</script>

<div class="rounded-lg bg-base-300 p-4">
	<h3 class="mb-3 text-base font-semibold">基本情報</h3>
	<div class="space-y-2 text-sm">
		<div class="flex justify-between">
			<div class="text-base-content/70">サイズ:</div>
			<div>{metadata.size}</div>
		</div>

		<div class="flex justify-between">
			<div class="text-base-content/70">解像度:</div>
			<div>{metadata.dimensions}</div>
		</div>

		<div class="flex justify-between">
			<div class="text-base-content/70">形式:</div>
			<div>{metadata.format}</div>
		</div>
	</div>
</div>
