<script lang="ts">
	import Icon from '@iconify/svelte';
	import { imageMetadataStore } from '../../stores/image-metadata-store.svelte';
	import { showSuccessToast } from '../../stores/toast.svelte';
	import { formatSdTags } from '../../utils/image-utils';
	import { copyToClipboard } from '../../utils/ui-utils';

	type Props = {
		imagePath: string;
	};

	const { imagePath }: Props = $props();

	const metadata = imageMetadataStore.getMetadata(imagePath);
</script>

{#await metadata.getSdParameters()}
	<div class="rounded-lg bg-base-300 p-3">
		<h3 class="mb-2 text-sm font-semibold">Stable Diffusion</h3>
		<div class="text-xs text-base-content/70">Loading...</div>
	</div>
{:then sdParams}
	<div class="rounded-lg bg-base-300 p-3">
		<h3 class="mb-2 flex items-center gap-2 text-sm font-semibold">
			Stable Diffusion
			<button
				class="btn btn-ghost btn-xs"
				onclick={async () => {
					await copyToClipboard(sdParams?.raw || '');
					showSuccessToast('SD parameters copied to clipboard');
				}}
				title="Copy raw text"
			>
				<Icon icon="lucide:copy" class="h-3 w-3" />
			</button>
		</h3>
		<div class="space-y-2 text-xs">
			<!-- ポジティブプロンプト -->
			{#if 0 < (sdParams?.positive_sd_tags.length ?? 0)}
				<div class="space-y-1">
					<div class="flex items-center gap-2">
						<div class="font-medium text-base-content/70">Positive Prompt:</div>
						<button
							class="btn btn-ghost btn-xs"
							onclick={async () => {
								await copyToClipboard(formatSdTags(sdParams?.positive_sd_tags ?? []));
								showSuccessToast('Positive prompt copied to clipboard');
							}}
							title="Copy positive prompt"
						>
							<Icon icon="lucide:copy" class="h-3 w-3" />
						</button>
					</div>
					<div class="flex flex-wrap gap-1 p-1">
						{#each sdParams?.positive_sd_tags ?? [] as tag}
							<span class="badge badge-soft badge-sm">
								{tag.name}{tag.weight ? `:${tag.weight}` : ''}
							</span>
						{/each}
					</div>
				</div>
			{/if}

			<!-- ネガティブプロンプト -->
			{#if 0 < (sdParams?.negative_sd_tags.length ?? 0)}
				<div class="space-y-1">
					<div class="flex items-center gap-2">
						<div class="font-medium text-base-content/70">Negative Prompt:</div>
						<button
							class="btn btn-ghost btn-xs"
							onclick={async () => {
								await copyToClipboard(formatSdTags(sdParams?.negative_sd_tags ?? []));
								showSuccessToast('Negative prompt copied to clipboard');
							}}
							title="Copy negative prompt"
						>
							<Icon icon="lucide:copy" class="h-3 w-3" />
						</button>
					</div>
					<div class="flex flex-wrap gap-1 p-1">
						{#each sdParams?.negative_sd_tags ?? [] as tag}
							<span class="badge badge-soft badge-sm">
								{tag.name}{tag.weight ? `:${tag.weight}` : ''}
							</span>
						{/each}
					</div>
				</div>
			{/if}

			<!-- パラメータ一覧 -->
			<div class="grid grid-cols-1 gap-1 text-xs">
				{#if sdParams?.steps}
					<div class="flex justify-between">
						<div class="text-base-content/70">Steps:</div>
						<div class="font-mono">{sdParams.steps}</div>
					</div>
				{/if}

				{#if sdParams?.sampler}
					<div class="flex justify-between">
						<div class="text-base-content/70">Sampler:</div>
						<div class="font-mono">{sdParams.sampler}</div>
					</div>
				{/if}

				{#if sdParams?.cfg_scale}
					<div class="flex justify-between">
						<div class="text-base-content/70">CFG Scale:</div>
						<div class="font-mono">{sdParams.cfg_scale}</div>
					</div>
				{/if}

				{#if sdParams?.seed}
					<div class="flex justify-between">
						<div class="text-base-content/70">Seed:</div>
						<div class="font-mono">{sdParams.seed}</div>
					</div>
				{/if}

				{#if sdParams?.size}
					<div class="flex justify-between">
						<div class="text-base-content/70">Size:</div>
						<div class="font-mono">{sdParams.size}</div>
					</div>
				{/if}

				{#if sdParams?.model}
					<div class="flex justify-between">
						<div class="text-base-content/70">Model:</div>
						<div class="font-mono break-all">{sdParams.model}</div>
					</div>
				{/if}

				{#if sdParams?.denoising_strength}
					<div class="flex justify-between">
						<div class="text-base-content/70">Denoising Strength:</div>
						<div class="font-mono">{sdParams.denoising_strength}</div>
					</div>
				{/if}

				{#if sdParams?.clip_skip}
					<div class="flex justify-between">
						<div class="text-base-content/70">Clip Skip:</div>
						<div class="font-mono">{sdParams.clip_skip}</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{:catch}
	<div class="rounded-lg bg-base-300 p-3">
		<h3 class="mb-2 text-sm font-semibold">Stable Diffusion</h3>
		<div class="text-xs text-red-600">Failed to load SD parameters</div>
	</div>
{/await}
