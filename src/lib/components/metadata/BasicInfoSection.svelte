<script lang="ts">
	import type { ImageMetadata } from '../../image/types';

	const {
		metadata
	}: {
		metadata: ImageMetadata;
	} = $props();
</script>

<div class="rounded-lg bg-base-300 p-3">
	<h3 class="mb-2 text-sm font-semibold">基本情報</h3>
	<div class="space-y-1.5 text-xs">
		<div class="flex justify-between">
			<div class="text-base-content/70">ファイル名:</div>
			<div class="text-right font-mono">{metadata.filename}</div>
		</div>

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

		<div class="flex justify-between">
			<div class="text-base-content/70">作成日時:</div>
			<div class="text-right font-mono text-xs">{metadata.created}</div>
		</div>

		<div class="flex justify-between">
			<div class="text-base-content/70">更新日時:</div>
			<div class="text-right font-mono text-xs">{metadata.modified}</div>
		</div>
	</div>
</div>
