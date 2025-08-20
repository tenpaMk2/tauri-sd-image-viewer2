<script lang="ts">
	import { imageMetadataStore } from '../../stores/image-metadata-store.svelte';

	type Props = {
		imagePath: string;
	};
	const { imagePath }: Props = $props();

	// リアクティブなメタデータオブジェクト取得
	const metadata = $derived(imageMetadataStore.getMetadata(imagePath));

	// リアクティブな値を取得
	const fileSize = $derived(metadata.fileSizeValue);
	const width = $derived(metadata.widthValue);
	const height = $derived(metadata.heightValue);
	const mimeType = $derived(metadata.mimeTypeValue);
</script>

<div class="rounded-lg bg-base-300 p-3">
	<h3 class="mb-2 text-sm font-semibold">Basic Info</h3>
	<div class="space-y-1.5 text-xs">
		<div class="flex justify-between">
			<div class="text-base-content/70">Filename:</div>
			<div class="overflow-wrap-anywhere max-w-[60%] text-right font-mono break-words">
				{metadata.filename}
			</div>
		</div>

		<div class="flex justify-between">
			<div class="text-base-content/70">Size:</div>
			<div>
				{#if metadata.loadingStatus === 'loaded'}
					{fileSize ? `${Math.round(fileSize / 1024)} KB` : 'Unknown'}
				{:else}
					Loading...
				{/if}
			</div>
		</div>

		<div class="flex justify-between">
			<div class="text-base-content/70">Resolution:</div>
			<div>
				{#if metadata.loadingStatus === 'loaded'}
					{width && height ? `${width} × ${height}` : 'Unknown'}
				{:else}
					Loading...
				{/if}
			</div>
		</div>

		<div class="flex justify-between">
			<div class="text-base-content/70">Format:</div>
			<div>
				{#if metadata.loadingStatus === 'loaded'}
					{mimeType || 'Unknown'}
				{:else}
					Loading...
				{/if}
			</div>
		</div>

		<div class="flex justify-between">
			<div class="text-base-content/70">Created:</div>
			<div class="text-right font-mono text-xs">TODO</div>
		</div>

		<div class="flex justify-between">
			<div class="text-base-content/70">Modified:</div>
			<div class="text-right font-mono text-xs">TODO</div>
		</div>
	</div>
</div>
