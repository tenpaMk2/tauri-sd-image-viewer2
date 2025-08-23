<script lang="ts">
	import { metadataRegistry } from '../../stores/metadata-registry.svelte';

	type Props = {
		imagePath: string;
	};
	const { imagePath }: Props = $props();

	// メタデータストアを取得（$stateオブジェクトなので$derivedは不要）
	const store = metadataRegistry.getOrCreateStore(imagePath);
	const metadata = store.state;

	// 初期化処理（コンポーネント作成時に一度だけ実行）
	if (metadata.loadingStatus === 'unloaded') {
		store.actions.ensureLoaded().catch((error) => {
			console.error('Failed to load metadata for ' + imagePath.split('/').pop() + ': ' + error);
		});
	}
</script>

<div class="rounded-lg bg-base-300 p-3">
	<h3 class="mb-2 text-sm font-semibold">Basic Info</h3>
	<div class="space-y-1.5 text-xs">
		<div class="flex justify-between">
			<div class="text-base-content/70">Filename:</div>
			<div class="overflow-wrap-anywhere max-w-[60%] text-right font-mono break-words">
				{metadata.filename}
			</div>
		</div>

		<div class="flex justify-between">
			<div class="text-base-content/70">Size:</div>
			<div>
				{#if metadata.loadingStatus === 'loaded'}
					{metadata.fileSize ? `${Math.round(metadata.fileSize / 1024)} KB` : 'Unknown'}
				{:else}
					Loading...
				{/if}
			</div>
		</div>

		<div class="flex justify-between">
			<div class="text-base-content/70">Resolution:</div>
			<div>
				{#if metadata.loadingStatus === 'loaded'}
					{metadata.width && metadata.height ? `${metadata.width} × ${metadata.height}` : 'Unknown'}
				{:else}
					Loading...
				{/if}
			</div>
		</div>

		<div class="flex justify-between">
			<div class="text-base-content/70">Format:</div>
			<div>
				{#if metadata.loadingStatus === 'loaded'}
					{metadata.mimeType || 'Unknown'}
				{:else}
					Loading...
				{/if}
			</div>
		</div>

		<div class="flex justify-between">
			<div class="text-base-content/70">Created:</div>
			<div class="text-right font-mono text-xs">TODO</div>
		</div>

		<div class="flex justify-between">
			<div class="text-base-content/70">Modified:</div>
			<div class="text-right font-mono text-xs">TODO</div>
		</div>
	</div>
</div>
