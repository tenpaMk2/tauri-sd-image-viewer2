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

	const { state: metadataState, actions: metadataActions } =
		metadataRegistry.getOrCreateStore(imagePath);
	metadataActions.ensureLoaded();
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

{#if metadataState.loadingStatus === 'loaded'}
	{#if metadataState.sdParameters}
		<div class="rounded-lg bg-base-300 p-3">
			<h3 class="mb-2 flex items-center gap-2 text-sm font-semibold">
				Stable Diffusion
				<button
					class="btn btn-ghost btn-xs"
					onclick={async () => {
						await copyToClipboard(metadataState.sdParameters?.raw || '');
						toastStore.actions.showSuccessToast('SD parameters copied to clipboard');
					}}
					title="Copy raw text"
				>
					<Icon icon="lucide:copy" class="h-3 w-3" />
				</button>
			</h3>
			<div class="space-y-2 text-xs">
				<!-- ポジティブプロンプト -->
				{#if 0 < (metadataState.sdParameters?.positive_sd_tags.length ?? 0)}
					{@render promptSection(
						'Positive Prompt',
						metadataState.sdParameters?.positive_sd_tags ?? [],
						formatSdTags(metadataState.sdParameters?.positive_sd_tags ?? []),
					)}
				{/if}

				<!-- ネガティブプロンプト -->
				{#if 0 < (metadataState.sdParameters?.negative_sd_tags.length ?? 0)}
					{@render promptSection(
						'Negative Prompt',
						metadataState.sdParameters?.negative_sd_tags ?? [],
						formatSdTags(metadataState.sdParameters?.negative_sd_tags ?? []),
					)}
				{/if}

				<!-- パラメータ一覧 -->
				<div class="grid grid-cols-1 gap-1 text-xs">
					{#if metadataState.sdParameters?.steps}
						<InfoRow
							label="Steps"
							value={metadataState.sdParameters.steps.toString()}
							extraClass="font-mono"
						/>
					{/if}

					{#if metadataState.sdParameters?.sampler}
						<InfoRow
							label="Sampler"
							value={metadataState.sdParameters.sampler}
							extraClass="font-mono"
						/>
					{/if}

					{#if metadataState.sdParameters?.cfg_scale}
						<InfoRow
							label="CFG Scale"
							value={metadataState.sdParameters.cfg_scale.toString()}
							extraClass="font-mono"
						/>
					{/if}

					{#if metadataState.sdParameters?.seed}
						<InfoRow
							label="Seed"
							value={metadataState.sdParameters.seed.toString()}
							extraClass="font-mono"
						/>
					{/if}

					{#if metadataState.sdParameters?.size}
						<InfoRow label="Size" value={metadataState.sdParameters.size} extraClass="font-mono" />
					{/if}

					{#if metadataState.sdParameters?.model}
						<InfoRow
							label="Model"
							value={metadataState.sdParameters.model}
							extraClass="font-mono break-all"
						/>
					{/if}

					{#if metadataState.sdParameters?.denoising_strength}
						<InfoRow
							label="Denoising Strength"
							value={metadataState.sdParameters.denoising_strength.toString()}
							extraClass="font-mono"
						/>
					{/if}

					{#if metadataState.sdParameters?.clip_skip}
						<InfoRow
							label="Clip Skip"
							value={metadataState.sdParameters.clip_skip.toString()}
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
