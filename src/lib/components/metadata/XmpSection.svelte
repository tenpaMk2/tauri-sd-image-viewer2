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
	<h3 class="mb-2 text-sm font-semibold">XMP Data</h3>
	<div class="space-y-1.5 text-xs">
		<!-- Rating -->
		<InfoRow
			label="Rating"
			value={metadata.loadingStatus === 'loaded' ? `${metadata.rating ?? 0}/5` : 'Loading...'}
		/>
	</div>
</div>
