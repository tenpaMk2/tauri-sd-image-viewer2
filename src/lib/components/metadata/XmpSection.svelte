<script lang="ts">
	import { imageMetadataStore } from '../../stores/image-metadata-store.svelte';

	type Props = {
		imagePath: string;
	};
	const { imagePath }: Props = $props();

	const metadata = imageMetadataStore.getMetadata(imagePath);
</script>

<div class="rounded-lg bg-base-300 p-3">
	<h3 class="mb-2 text-sm font-semibold">XMP Data</h3>
	<div class="space-y-1.5 text-xs">
		<!-- Rating -->
		<div class="flex justify-between">
			<div class="text-base-content/70">Rating:</div>
			<div>
				{#await metadata.getRating()}
					Loading...
				{:then rating}
					{rating ?? 0}/5
				{:catch}
					Error
				{/await}
			</div>
		</div>
	</div>
</div>
