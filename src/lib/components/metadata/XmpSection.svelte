<script lang="ts">
	import InfoRow from '$lib/components/ui/InfoRow.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import { metadataRegistry } from '$lib/services/metadata-registry';

	type Props = {
		imagePath: string;
	};
	const { imagePath }: Props = $props();

	const { state: metadataState, actions: metadataActions } = $derived(
		metadataRegistry.getOrCreateStore(imagePath),
	);

	$effect.pre(() => {
		metadataActions.ensureLoaded();
	});
</script>

<div class="rounded-lg bg-base-300 p-3">
	<h3 class="mb-2 text-sm font-semibold">XMP Data</h3>
	{#if metadataState.loadingStatus === 'loaded'}
		<div class="space-y-1.5 text-xs">
			<!-- Rating -->
			<InfoRow label="Rating" value={`${metadataState.rating ?? 0}/5`} />
		</div>
	{:else}
		<LoadingState status={metadataState.loadingStatus} />
	{/if}
</div>
