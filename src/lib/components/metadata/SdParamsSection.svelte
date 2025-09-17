<script lang="ts">
	import InfoRow from '$lib/components/metadata/InfoRow.svelte';
	import { copyText } from '$lib/services/clipboard';
	import type { MetadataStore } from '$lib/services/metadata-store';
	import type { SdTag } from '$lib/types/shared-types';
	import IconButton from '../ui/IconButton.svelte';
	import BaseMetadataSection from './BaseMetadataSection.svelte';

	const formatSdTags = (tags: SdTag[]): string => {
		return tags.map((tag) => (tag.weight ? `(${tag.name}:${tag.weight})` : tag.name)).join(', ');
	};
</script>

{#snippet promptSection(
	title: string,
	tags: Array<{ name: string; weight?: number }>,
	copiedText: string,
)}
	<div class="flex items-center gap-2">
		<div class="font-medium text-base-content/70">{title}:</div>
		<IconButton
			icon="copy"
			title="Copy {title.toLowerCase()}"
			size="small"
			onClick={async () => await copyText(copiedText)}
		/>
	</div>
	<div class="flex flex-wrap gap-1 p-1">
		{#each tags as tag}
			<span class="badge badge-soft badge-sm">
				{tag.name}{tag.weight ? `:${tag.weight}` : ''}
			</span>
		{/each}
	</div>
{/snippet}

<BaseMetadataSection title="Stable Diffusion">
	{#snippet metadataContent(metadataState: MetadataStore['state'])}
		{@const sdParameters = metadataState?.sd_parameters}
		<div class="space-y-2 text-xs">
			<!-- ポジティブプロンプト -->
			{#if 0 < (sdParameters?.positive_sd_tags.length ?? 0)}
				{@render promptSection(
					'Positive Prompt',
					sdParameters?.positive_sd_tags ?? [],
					formatSdTags(sdParameters?.positive_sd_tags ?? []),
				)}
			{/if}

			<!-- ネガティブプロンプト -->
			{#if 0 < (sdParameters?.negative_sd_tags.length ?? 0)}
				{@render promptSection(
					'Negative Prompt',
					sdParameters?.negative_sd_tags ?? [],
					formatSdTags(sdParameters?.negative_sd_tags ?? []),
				)}
			{/if}

			<!-- パラメータ一覧 -->
			<div class="grid grid-cols-1 gap-1 text-xs">
				{#if sdParameters?.steps}
					<InfoRow label="Steps" value={sdParameters.steps.toString()} extraClass="font-mono" />
				{/if}

				{#if sdParameters?.sampler}
					<InfoRow label="Sampler" value={sdParameters.sampler} extraClass="font-mono" />
				{/if}

				{#if sdParameters?.cfg_scale}
					<InfoRow
						label="CFG Scale"
						value={sdParameters.cfg_scale.toString()}
						extraClass="font-mono"
					/>
				{/if}

				{#if sdParameters?.seed}
					<InfoRow label="Seed" value={sdParameters.seed.toString()} extraClass="font-mono" />
				{/if}

				{#if sdParameters?.size}
					<InfoRow label="Size" value={sdParameters.size} extraClass="font-mono" />
				{/if}

				{#if sdParameters?.model}
					<InfoRow label="Model" value={sdParameters.model} extraClass="font-mono break-all" />
				{/if}

				{#if sdParameters?.denoising_strength}
					<InfoRow
						label="Denoising Strength"
						value={sdParameters.denoising_strength.toString()}
						extraClass="font-mono"
					/>
				{/if}

				{#if sdParameters?.clip_skip}
					<InfoRow
						label="Clip Skip"
						value={sdParameters.clip_skip.toString()}
						extraClass="font-mono"
					/>
				{/if}
			</div>

			{#if sdParameters?.raw}
				<div class="flex items-center gap-2">
					<div class="font-medium text-base-content/70">Raw:</div>
					<IconButton
						icon="copy"
						title="Copy raw SD parameters"
						size="small"
						onClick={async () => await copyText(sdParameters.raw)}
					/>
				</div>
				<textarea class="min-h-16 w-full font-mono">{sdParameters.raw}</textarea>
			{/if}
		</div>
	{/snippet}
</BaseMetadataSection>
