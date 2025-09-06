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
	<h3 class="mb-2 text-sm font-semibold">Basic Info</h3>
	<div class="space-y-1.5 text-xs">
		<InfoRow
			label="Filename"
			value={metadataState.filename || 'Unknown'}
			extraClass="overflow-wrap-anywhere max-w-[60%] text-right font-mono break-words"
		/>

		<InfoRow
			label="Size"
			value={metadataState.loadingStatus === 'loaded'
				? metadataState.fileSize
					? `${Math.round(metadataState.fileSize / 1024)} KB`
					: 'Unknown'
				: 'Loading...'}
		/>

		<InfoRow
			label="Resolution"
			value={metadataState.loadingStatus === 'loaded'
				? metadataState.width && metadataState.height
					? `${metadataState.width} × ${metadataState.height}`
					: 'Unknown'
				: 'Loading...'}
		/>

		<InfoRow
			label="Format"
			value={metadataState.loadingStatus === 'loaded'
				? metadataState.mimeType || 'Unknown'
				: 'Loading...'}
		/>

		<InfoRow label="Created" value="TODO" extraClass="text-right font-mono text-xs" />

		<InfoRow label="Modified" value="TODO" extraClass="text-right font-mono text-xs" />
	</div>
</div>
