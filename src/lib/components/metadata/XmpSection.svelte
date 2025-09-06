<script lang="ts">
	import InfoRow from '$lib/components/ui/InfoRow.svelte';
	import { metadataRegistry } from '$lib/services/metadata-registry';

	type Props = {
		imagePath: string;
	};
	const { imagePath }: Props = $props();

	const { state: metadataState, actions: metadataActions } =
		metadataRegistry.getOrCreateStore(imagePath);
	metadataActions.ensureLoaded();
</script>

<div class="rounded-lg bg-base-300 p-3">
	<h3 class="mb-2 text-sm font-semibold">XMP Data</h3>
	<div class="space-y-1.5 text-xs">
		<!-- Rating -->
		<InfoRow
			label="Rating"
			value={metadataState.loadingStatus === 'loaded'
				? `${metadataState.rating ?? 0}/5`
				: 'Loading...'}
		/>
	</div>
</div>
