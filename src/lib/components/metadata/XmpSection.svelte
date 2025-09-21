<script lang="ts">
	import InfoRow from '$lib/components/metadata/InfoRow.svelte';
	import type { MetadataStore } from '$lib/components/metadata/metadata-store';
	import BaseMetadataSection from './BaseMetadataSection.svelte';
</script>

<BaseMetadataSection title="XMP Data">
	{#snippet metadataContent(metadataState: MetadataStore['state'])}
		<!-- Rating -->
		<InfoRow label="Rating" value={`${metadataState.rating ?? 0}/5`} />
	{/snippet}
</BaseMetadataSection>
