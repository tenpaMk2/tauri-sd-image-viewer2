<script lang="ts">
	import { imageMetadataStore } from '../../stores/image-metadata-store.svelte';

	type Props = {
		imagePath: string;
	};
	const { imagePath }: Props = $props();

	const metadata = imageMetadataStore.getMetadata(imagePath);
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
				{#await metadata.getFileSize()}
					Loading...
				{:then size}
					{size ? `${Math.round(size / 1024)} KB` : 'Unknown'}
				{:catch}
					Unknown
				{/await}
			</div>
		</div>

		<div class="flex justify-between">
			<div class="text-base-content/70">Resolution:</div>
			<div>
				{#await Promise.all([metadata.getWidth(), metadata.getHeight()])}
					Loading...
				{:then [width, height]}
					{width && height ? `${width} × ${height}` : 'Unknown'}
				{:catch}
					Unknown
				{/await}
			</div>
		</div>

		<div class="flex justify-between">
			<div class="text-base-content/70">Format:</div>
			<div>
				{#await metadata.getMimeType()}
					Loading...
				{:then format}
					{format || 'Unknown'}
				{:catch}
					Unknown
				{/await}
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
