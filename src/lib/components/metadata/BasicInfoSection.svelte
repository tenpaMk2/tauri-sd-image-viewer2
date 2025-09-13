<script lang="ts">
	import InfoRow from '$lib/components/metadata/InfoRow.svelte';
	import type { MetadataStore } from '$lib/services/metadata-store';
	import { formatTimestamp } from '$lib/utils/date-format';
	import { formatFileSize } from '$lib/utils/file-size-format';
	import { getContext } from 'svelte';
	import BaseMetadataSection from './BaseMetadataSection.svelte';

	const imagePath = $derived(getContext<() => string>('imagePath')());
	const filename = $derived(imagePath.split('/').pop() || 'Unknown');
</script>

<BaseMetadataSection title="Basic Info">
	{#snippet metadataContent(metadataState: MetadataStore['state'])}
		<InfoRow
			label="Filename"
			value={filename}
			extraClass="overflow-wrap-anywhere max-w-[60%] text-right font-mono break-words"
		/>

		<InfoRow label="Size" value={formatFileSize(metadataState!.file_size)} />

		<InfoRow label="Resolution" value={`${metadataState!.width} × ${metadataState!.height}`} />

		<InfoRow
			label="Created"
			value={metadataState!.created_time ? formatTimestamp(metadataState!.created_time) : 'Unknown'}
			extraClass="text-right font-mono text-xs"
		/>

		<InfoRow
			label="Modified"
			value={formatTimestamp(metadataState!.modified_time)}
			extraClass="text-right font-mono text-xs"
		/>
	{/snippet}
</BaseMetadataSection>
