<script lang="ts">
	import { metadataRegistry } from '../../stores/metadata-registry.svelte';

	type Props = {
		imagePath: string;
	};
	const { imagePath }: Props = $props();

	// メタデータストアを取得（$stateオブジェクトなので$derivedは不要）
	const store = metadataRegistry.getOrCreateStore(imagePath);
	const metadata = store.state;

	// imagePathが変わるたびにメタデータの初期化を確認
	$effect(() => {
		const currentStore = metadataRegistry.getOrCreateStore(imagePath);
		if (currentStore.state.loadingStatus === 'unloaded') {
			currentStore.actions.ensureLoaded().catch((error) => {
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
