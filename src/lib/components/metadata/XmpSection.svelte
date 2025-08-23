<script lang="ts">
	import { metadataRegistry } from '../../services/metadata-registry';

	type Props = {
		imagePath: string;
	};
	const { imagePath }: Props = $props();

	// メタデータストアを取得（imagePathが変更されるたびに新しいストアを取得）
	const store = $derived(metadataRegistry.getOrCreateStore(imagePath));
	const metadata = $derived(store.state);

	// imagePathが変わるたびにメタデータの初期化を確認
	$effect(() => {
		if (store.state.loadingStatus === 'unloaded') {
			store.actions.ensureLoaded().catch((error) => {
				console.error('Failed to load metadata for ' + imagePath.split('/').pop() + ': ' + error);
			});
		}
	});
</script>

<div class="rounded-lg bg-base-300 p-3">
	<h3 class="mb-2 text-sm font-semibold">XMP Data</h3>
	<div class="space-y-1.5 text-xs">
		<!-- Rating -->
		<div class="flex justify-between">
			<div class="text-base-content/70">Rating:</div>
			<div>
				{#if metadata.loadingStatus === 'loaded'}
					{metadata.rating ?? 0}/5
				{:else}
					Loading...
				{/if}
			</div>
		</div>
	</div>
</div>
