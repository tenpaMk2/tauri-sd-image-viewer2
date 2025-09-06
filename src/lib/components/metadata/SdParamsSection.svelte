<script lang="ts">
	import InfoRow from '$lib/components/ui/InfoRow.svelte';
	import { metadataRegistry } from '$lib/services/metadata-registry';
	import { toastStore } from '$lib/stores/toast-store.svelte';
	import { copyToClipboard } from '$lib/utils/copy-utils';
	import { formatSdTags } from '$lib/utils/image-utils';
	import Icon from '@iconify/svelte';

	type Props = {
		imagePath: string;
	};

	const { imagePath }: Props = $props();

	// メタデータストアを取得（imagePathが変更されるたびに新しいストアを取得）
	const store = $derived(metadataRegistry.getOrCreateStore(imagePath));
	const metadata = $derived(store.state);
</script>

{#snippet promptSection(
	title: string,
	tags: Array<{ name: string; weight?: number }>,
	copyText: string,
)}
	<div class="space-y-1">
		<div class="flex items-center gap-2">
			<div class="font-medium text-base-content/70">{title}:</div>
			<button
				class="btn btn-ghost btn-xs"
				onclick={async () => {
					await copyToClipboard(copyText);
					toastStore.actions.showSuccessToast(`${title} copied to clipboard`);
				}}
				title="Copy {title.toLowerCase()}"
			>
				<Icon icon="lucide:copy" class="h-3 w-3" />
			</button>
		</div>
		<div class="flex flex-wrap gap-1 p-1">
			{#each tags as tag}
				<span class="badge badge-soft badge-sm">
					{tag.name}{tag.weight ? `:${tag.weight}` : ''}
				</span>
			{/each}
		</div>
	</div>
{/snippet}

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
					{@render promptSection(
						'Positive Prompt',
						metadata.sdParameters?.positive_sd_tags ?? [],
						formatSdTags(metadata.sdParameters?.positive_sd_tags ?? []),
					)}
				{/if}

				<!-- ネガティブプロンプト -->
				{#if 0 < (metadata.sdParameters?.negative_sd_tags.length ?? 0)}
					{@render promptSection(
						'Negative Prompt',
						metadata.sdParameters?.negative_sd_tags ?? [],
						formatSdTags(metadata.sdParameters?.negative_sd_tags ?? []),
					)}
				{/if}

				<!-- パラメータ一覧 -->
				<div class="grid grid-cols-1 gap-1 text-xs">
					{#if metadata.sdParameters?.steps}
						<InfoRow
							label="Steps"
							value={metadata.sdParameters.steps.toString()}
							extraClass="font-mono"
						/>
					{/if}

					{#if metadata.sdParameters?.sampler}
						<InfoRow label="Sampler" value={metadata.sdParameters.sampler} extraClass="font-mono" />
					{/if}

					{#if metadata.sdParameters?.cfg_scale}
						<InfoRow
							label="CFG Scale"
							value={metadata.sdParameters.cfg_scale.toString()}
							extraClass="font-mono"
						/>
					{/if}

					{#if metadata.sdParameters?.seed}
						<InfoRow
							label="Seed"
							value={metadata.sdParameters.seed.toString()}
							extraClass="font-mono"
						/>
					{/if}

					{#if metadata.sdParameters?.size}
						<InfoRow label="Size" value={metadata.sdParameters.size} extraClass="font-mono" />
					{/if}

					{#if metadata.sdParameters?.model}
						<InfoRow
							label="Model"
							value={metadata.sdParameters.model}
							extraClass="font-mono break-all"
						/>
					{/if}

					{#if metadata.sdParameters?.denoising_strength}
						<InfoRow
							label="Denoising Strength"
							value={metadata.sdParameters.denoising_strength.toString()}
							extraClass="font-mono"
						/>
					{/if}

					{#if metadata.sdParameters?.clip_skip}
						<InfoRow
							label="Clip Skip"
							value={metadata.sdParameters.clip_skip.toString()}
							extraClass="font-mono"
						/>
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
