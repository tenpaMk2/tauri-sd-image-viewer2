<script lang="ts">
	import InfoRow from '$lib/components/ui/InfoRow.svelte';
	import { metadataRegistry } from '$lib/services/metadata-registry';

	type Props = {
		imagePath: string;
	};
	const { imagePath }: Props = $props();

	// メタデータストアを取得（imagePathが変更されるたびに新しいストアを取得）
	const store = $derived(metadataRegistry.getOrCreateStore(imagePath));
	const metadata = $derived(store.state);
</script>

<div class="rounded-lg bg-base-300 p-3">
	<h3 class="mb-2 text-sm font-semibold">Basic Info</h3>
	<div class="space-y-1.5 text-xs">
		<InfoRow
			label="Filename"
			value={metadata.filename || 'Unknown'}
			extraClass="overflow-wrap-anywhere max-w-[60%] text-right font-mono break-words"
		/>

		<InfoRow
			label="Size"
			value={metadata.loadingStatus === 'loaded'
				? metadata.fileSize
					? `${Math.round(metadata.fileSize / 1024)} KB`
					: 'Unknown'
				: 'Loading...'}
		/>

		<InfoRow
			label="Resolution"
			value={metadata.loadingStatus === 'loaded'
				? metadata.width && metadata.height
					? `${metadata.width} × ${metadata.height}`
					: 'Unknown'
				: 'Loading...'}
		/>

		<InfoRow
			label="Format"
			value={metadata.loadingStatus === 'loaded' ? metadata.mimeType || 'Unknown' : 'Loading...'}
		/>

		<InfoRow label="Created" value="TODO" extraClass="text-right font-mono text-xs" />

		<InfoRow label="Modified" value="TODO" extraClass="text-right font-mono text-xs" />
	</div>
</div>
