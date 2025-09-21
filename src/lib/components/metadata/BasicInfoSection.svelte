<script lang="ts">
	import InfoRow from '$lib/components/metadata/InfoRow.svelte';
	import type { MetadataStore } from '$lib/components/metadata/metadata-store.svelte';
	import {
		VIEWER_PAGE_DATA_CONTEXT,
		type ViewerPageDataContext,
	} from '$lib/components/viewer/viewer-page-data';
	import { getContext } from 'svelte';
	import BaseMetadataSection from './BaseMetadataSection.svelte';

	const viewerPageData = $derived(
		getContext<() => ViewerPageDataContext>(VIEWER_PAGE_DATA_CONTEXT)().state,
	);
	const imagePath = $derived(viewerPageData.imagePath);
	const filename = $derived(imagePath.split('/').pop() || 'Unknown');

	const formatFileSize = (bytes: number): string => {
		const formatter = new Intl.NumberFormat(undefined, {
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		});

		return `${formatter.format(bytes)} Byte`;
	};

	const formatTimestamp = (timestamp: number): string => {
		const date = new Date(timestamp * 1000); // JavaScript Dateはミリ秒なので*1000

		// Intl.DateTimeFormatでISO 8601形式（YYYY-MM-DD hh:mm:ss）
		const formatter = new Intl.DateTimeFormat('ja-JP', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
		});

		// ja-JPロケールは「/」区切りなので「-」に変換
		return formatter.format(date).replace(/\//g, '-');
	};
</script>

<BaseMetadataSection title="Basic Info">
	{#snippet metadataContent(metadataState: MetadataStore['state'])}
		<InfoRow
			label="Filename"
			value={filename}
			extraClass="overflow-wrap-anywhere max-w-[60%] text-right font-mono break-words"
		/>

		<InfoRow label="Size" value={formatFileSize(metadataState!.metadata!.file_size)} />

		<InfoRow
			label="Resolution"
			value={`${metadataState!.metadata!.width} × ${metadataState!.metadata!.height}`}
		/>

		<InfoRow
			label="Created"
			value={metadataState!.metadata!.created_time
				? formatTimestamp(metadataState!.metadata!.created_time)
				: 'Unknown'}
			extraClass="text-right font-mono text-xs"
		/>

		<InfoRow
			label="Modified"
			value={formatTimestamp(metadataState!.metadata!.modified_time)}
			extraClass="text-right font-mono text-xs"
		/>
	{/snippet}
</BaseMetadataSection>
