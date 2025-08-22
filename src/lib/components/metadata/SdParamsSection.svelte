<script lang="ts">
	import Icon from '@iconify/svelte';
	import { metadataRegistry } from '../../stores/metadata-registry.svelte';
	import { toastStore } from '../../stores/toast-store.svelte';
	import { formatSdTags } from '../../utils/image-utils';
	import { copyToClipboard } from '../../utils/ui-utils';

	type Props = {
		imagePath: string;
	};

	const { imagePath }: Props = $props();

	// メタデータストアを取得（$stateオブジェクトなので$derivedは不要）
	const store = metadataRegistry.getOrCreateStore(imagePath);
	const metadata = store.state;

	// コンポーネントマウント時に明示的にロード開始
	$effect(() => {
		if (metadata.loadingStatus === 'unloaded') {
			store.actions.ensureLoaded().catch((error) => {
				console.error('Failed to load metadata for ' + imagePath.split('/').pop() + ': ' + error);
			});
		}
	});
</script>

{#if metadata.loadingStatus === 'loaded'}
	{#if metadata.sdParameters}
		<div class="rounded-lg bg-base-300 p-3">
			<h3 class="mb-2 flex items-center gap-2 text-sm font-semibold">
				Stable Diffusion
				<button
					class="btn btn-ghost btn-xs"
					onclick={async () => {
						await copyToClipboard(metadata.sdParameters?.raw || '');
						toastStore.actions.showSuccessToast('SD parameters copied to clipboard');
					}}
					title="Copy raw text"
				>
					<Icon icon="lucide:copy" class="h-3 w-3" />
				</button>
			</h3>
			<div class="space-y-2 text-xs">
				<!-- ポジティブプロンプト -->
				{#if 0 < (metadata.sdParameters?.positive_sd_tags.length ?? 0)}
					<div class="space-y-1">
						<div class="flex items-center gap-2">
							<div class="font-medium text-base-content/70">Positive Prompt:</div>
							<button
								class="btn btn-ghost btn-xs"
								onclick={async () => {
									await copyToClipboard(
										formatSdTags(metadata.sdParameters?.positive_sd_tags ?? [])
									);
									toastStore.actions.showSuccessToast('Positive prompt copied to clipboard');
								}}
								title="Copy positive prompt"
							>
								<Icon icon="lucide:copy" class="h-3 w-3" />
							</button>
						</div>
						<div class="flex flex-wrap gap-1 p-1">
							{#each metadata.sdParameters?.positive_sd_tags ?? [] as tag}
								<span class="badge badge-soft badge-sm">
									{tag.name}{tag.weight ? `:${tag.weight}` : ''}
								</span>
							{/each}
						</div>
					</div>
				{/if}

				<!-- ネガティブプロンプト -->
				{#if 0 < (metadata.sdParameters?.negative_sd_tags.length ?? 0)}
					<div class="space-y-1">
						<div class="flex items-center gap-2">
							<div class="font-medium text-base-content/70">Negative Prompt:</div>
							<button
								class="btn btn-ghost btn-xs"
								onclick={async () => {
									await copyToClipboard(
										formatSdTags(metadata.sdParameters?.negative_sd_tags ?? [])
									);
									toastStore.actions.showSuccessToast('Negative prompt copied to clipboard');
								}}
								title="Copy negative prompt"
							>
								<Icon icon="lucide:copy" class="h-3 w-3" />
							</button>
						</div>
						<div class="flex flex-wrap gap-1 p-1">
							{#each metadata.sdParameters?.negative_sd_tags ?? [] as tag}
								<span class="badge badge-soft badge-sm">
									{tag.name}{tag.weight ? `:${tag.weight}` : ''}
								</span>
							{/each}
						</div>
					</div>
				{/if}

				<!-- パラメータ一覧 -->
				<div class="grid grid-cols-1 gap-1 text-xs">
					{#if metadata.sdParameters?.steps}
						<div class="flex justify-between">
							<div class="text-base-content/70">Steps:</div>
							<div class="font-mono">{metadata.sdParameters.steps}</div>
						</div>
					{/if}

					{#if metadata.sdParameters?.sampler}
						<div class="flex justify-between">
							<div class="text-base-content/70">Sampler:</div>
							<div class="font-mono">{metadata.sdParameters.sampler}</div>
						</div>
					{/if}

					{#if metadata.sdParameters?.cfg_scale}
						<div class="flex justify-between">
							<div class="text-base-content/70">CFG Scale:</div>
							<div class="font-mono">{metadata.sdParameters.cfg_scale}</div>
						</div>
					{/if}

					{#if metadata.sdParameters?.seed}
						<div class="flex justify-between">
							<div class="text-base-content/70">Seed:</div>
							<div class="font-mono">{metadata.sdParameters.seed}</div>
						</div>
					{/if}

					{#if metadata.sdParameters?.size}
						<div class="flex justify-between">
							<div class="text-base-content/70">Size:</div>
							<div class="font-mono">{metadata.sdParameters.size}</div>
						</div>
					{/if}

					{#if metadata.sdParameters?.model}
						<div class="flex justify-between">
							<div class="text-base-content/70">Model:</div>
							<div class="font-mono break-all">{metadata.sdParameters.model}</div>
						</div>
					{/if}

					{#if metadata.sdParameters?.denoising_strength}
						<div class="flex justify-between">
							<div class="text-base-content/70">Denoising Strength:</div>
							<div class="font-mono">{metadata.sdParameters.denoising_strength}</div>
						</div>
					{/if}

					{#if metadata.sdParameters?.clip_skip}
						<div class="flex justify-between">
							<div class="text-base-content/70">Clip Skip:</div>
							<div class="font-mono">{metadata.sdParameters.clip_skip}</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
{:else}
	<div class="rounded-lg bg-base-300 p-3">
		<h3 class="mb-2 text-sm font-semibold">Stable Diffusion</h3>
		<div class="text-xs text-base-content/70">Loading...</div>
	</div>
{/if}
