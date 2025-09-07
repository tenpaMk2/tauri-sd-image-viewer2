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

	$effect(() => {
		metadataActions.ensureLoaded();
	});
</script>

<div class="rounded-lg bg-base-300 p-3">
	<h3 class="mb-2 text-sm font-semibold">Basic Info</h3>
	{#if metadataState.loadingStatus === 'loaded'}
		<div class="space-y-1.5 text-xs">
			<InfoRow
				label="Filename"
				value={metadataState.filename || 'Unknown'}
				extraClass="overflow-wrap-anywhere max-w-[60%] text-right font-mono break-words"
			/>

			<InfoRow
				label="Size"
				value={metadataState.fileSize
					? `${Math.round(metadataState.fileSize / 1024)} KB`
					: 'Unknown'}
			/>

			<InfoRow
				label="Resolution"
				value={metadataState.width && metadataState.height
					? `${metadataState.width} × ${metadataState.height}`
					: 'Unknown'}
			/>

			<InfoRow label="Format" value={metadataState.mimeType || 'Unknown'} />

			<InfoRow label="Created" value="TODO" extraClass="text-right font-mono text-xs" />

			<InfoRow label="Modified" value="TODO" extraClass="text-right font-mono text-xs" />
		</div>
	{:else}
		<LoadingState status={metadataState.loadingStatus} />
	{/if}
</div>
