<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { ImageMetadata } from '../../image/types';
	import { copyToClipboard } from '../../utils/ui-utils';
	import { formatSdTags } from '../../utils/image-utils';

	const {
		metadata
	}: {
		metadata: ImageMetadata;
	} = $props();
</script>

{#if metadata.sdParameters}
	<div class="rounded-lg bg-base-300 p-4">
		<h3 class="mb-3 flex items-center gap-2 text-base font-semibold">
			Stable Diffusion
			<button
				class="badge badge-outline text-xs hover:badge-primary"
				onclick={() => copyToClipboard(metadata.sdParameters?.raw || '')}
				title="原文をコピー"
			>
				<Icon icon="lucide:copy" class="mr-1 h-3 w-3" />
				コピー
			</button>
		</h3>
		<div class="space-y-3 text-sm">
			<!-- プロンプト -->
			{#if metadata.sdParameters.positive_sd_tags.length > 0}
				<div class="space-y-1">
					<div class="flex items-center gap-2">
						<div class="font-medium text-base-content/70">プロンプト:</div>
						<button
							class="btn btn-ghost btn-xs"
							onclick={() =>
								copyToClipboard(formatSdTags(metadata.sdParameters?.positive_sd_tags || []))}
							title="プロンプトをコピー"
						>
							<Icon icon="lucide:copy" class="h-3 w-3" />
						</button>
					</div>
					<div class="rounded bg-base-100 p-2 font-mono text-xs leading-relaxed">
						{formatSdTags(metadata.sdParameters.positive_sd_tags)}
					</div>
				</div>
			{/if}

			<!-- ネガティブプロンプト -->
			{#if metadata.sdParameters.negative_sd_tags.length > 0}
				<div class="space-y-1">
					<div class="flex items-center gap-2">
						<div class="font-medium text-base-content/70">ネガティブプロンプト:</div>
						<button
							class="btn btn-ghost btn-xs"
							onclick={() =>
								copyToClipboard(formatSdTags(metadata.sdParameters?.negative_sd_tags || []))}
							title="ネガティブプロンプトをコピー"
						>
							<Icon icon="lucide:copy" class="h-3 w-3" />
						</button>
					</div>
					<div class="rounded bg-base-100 p-2 font-mono text-xs leading-relaxed">
						{formatSdTags(metadata.sdParameters.negative_sd_tags)}
					</div>
				</div>
			{/if}

			<!-- パラメータ一覧 -->
			<div class="grid grid-cols-1 gap-2 text-xs">
				{#if metadata.sdParameters.steps}
					<div class="flex justify-between">
						<div class="text-base-content/70">Steps:</div>
						<div class="font-mono">{metadata.sdParameters.steps}</div>
					</div>
				{/if}

				{#if metadata.sdParameters.sampler}
					<div class="flex justify-between">
						<div class="text-base-content/70">Sampler:</div>
						<div class="font-mono">{metadata.sdParameters.sampler}</div>
					</div>
				{/if}

				{#if metadata.sdParameters.cfg_scale}
					<div class="flex justify-between">
						<div class="text-base-content/70">CFG Scale:</div>
						<div class="font-mono">{metadata.sdParameters.cfg_scale}</div>
					</div>
				{/if}

				{#if metadata.sdParameters.seed}
					<div class="flex justify-between">
						<div class="text-base-content/70">Seed:</div>
						<div class="font-mono">{metadata.sdParameters.seed}</div>
					</div>
				{/if}

				{#if metadata.sdParameters.size}
					<div class="flex justify-between">
						<div class="text-base-content/70">Size:</div>
						<div class="font-mono">{metadata.sdParameters.size}</div>
					</div>
				{/if}

				{#if metadata.sdParameters.model}
					<div class="flex justify-between">
						<div class="text-base-content/70">Model:</div>
						<div class="font-mono break-all">{metadata.sdParameters.model}</div>
					</div>
				{/if}

				{#if metadata.sdParameters.denoising_strength}
					<div class="flex justify-between">
						<div class="text-base-content/70">Denoising Strength:</div>
						<div class="font-mono">{metadata.sdParameters.denoising_strength}</div>
					</div>
				{/if}

				{#if metadata.sdParameters.clip_skip}
					<div class="flex justify-between">
						<div class="text-base-content/70">Clip Skip:</div>
						<div class="font-mono">{metadata.sdParameters.clip_skip}</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
