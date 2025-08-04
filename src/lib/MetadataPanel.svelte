<script lang="ts">
	import type { ImageMetadata } from './image/types';
	import type { SdTag } from './types/shared-types';

	const {
		metadata,
		onFocus,
		onBlur
	}: {
		metadata: ImageMetadata;
		onFocus?: () => void;
		onBlur?: () => void;
	} = $props();

	// クリップボードコピー機能
	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
		} catch (error) {
			console.error('クリップボードへのコピーに失敗:', error);
		}
	};

	// タグをフォーマット
	const formatTags = (tags: SdTag[]): string => {
		return tags
			.map((tag) => (tag.weight ? `(${tag.name}:${tag.weight})` : tag.name))
			.join(', ');
	};
</script>

<!-- 右側: 情報ペイン (固定幅) -->
<div
	class="w-80 overflow-y-auto bg-base-200 shadow-2xl"
	tabindex="0"
	role="tabpanel"
	aria-label="画像情報パネル"
	onfocus={onFocus}
	onblur={onBlur}
>
	<div class="p-4">
		<h2 class="mb-4 text-lg font-bold">画像情報</h2>
		<div class="space-y-4">
			<!-- 基本情報 -->
			<div class="rounded-lg bg-base-300 p-4">
				<h3 class="mb-3 text-base font-semibold">基本情報</h3>
				<div class="space-y-2 text-sm">
					<div class="flex justify-between">
						<div class="text-base-content/70">サイズ:</div>
						<div>{metadata.size}</div>
					</div>

					<div class="flex justify-between">
						<div class="text-base-content/70">解像度:</div>
						<div>{metadata.dimensions}</div>
					</div>

					<div class="flex justify-between">
						<div class="text-base-content/70">形式:</div>
						<div>{metadata.format}</div>
					</div>
				</div>
			</div>

			<!-- 日時情報 -->
			<div class="rounded-lg bg-base-300 p-4">
				<h3 class="mb-3 text-base font-semibold">日時情報</h3>
				<div class="space-y-2 text-sm">
					<div class="flex flex-col gap-1">
						<div class="text-base-content/70">作成日時:</div>
						<div class="font-mono text-xs">{metadata.created}</div>
					</div>

					<div class="flex flex-col gap-1">
						<div class="text-base-content/70">更新日時:</div>
						<div class="font-mono text-xs">{metadata.modified}</div>
					</div>
				</div>
			</div>

			<!-- Stable Diffusion情報 (任意) -->
			{#if metadata.sdParameters}
				<div class="rounded-lg bg-base-300 p-4">
					<h3 class="mb-3 flex items-center gap-2 text-base font-semibold">
						Stable Diffusion
						<button
							class="badge badge-outline text-xs hover:badge-primary"
							onclick={() => copyToClipboard(metadata.sdParameters?.raw || '')}
							title="原文をコピー"
						>
							コピー
						</button>
					</h3>
					<div class="space-y-3 text-sm">
						<!-- プロンプト -->
						{#if metadata.sdParameters.positive_sd_tags.length > 0}
							<div class="space-y-1">
								<div class="flex items-center gap-2">
									<div class="text-base-content/70 font-medium">プロンプト:</div>
									<button
										class="btn btn-ghost btn-xs"
										onclick={() => copyToClipboard(formatTags(metadata.sdParameters?.positive_sd_tags || []))}
										title="プロンプトをコピー"
									>
										📋
									</button>
								</div>
								<div class="bg-base-100 rounded p-2 font-mono text-xs leading-relaxed">
									{formatTags(metadata.sdParameters.positive_sd_tags)}
								</div>
							</div>
						{/if}

						<!-- ネガティブプロンプト -->
						{#if metadata.sdParameters.negative_sd_tags.length > 0}
							<div class="space-y-1">
								<div class="flex items-center gap-2">
									<div class="text-base-content/70 font-medium">ネガティブプロンプト:</div>
									<button
										class="btn btn-ghost btn-xs"
										onclick={() => copyToClipboard(formatTags(metadata.sdParameters?.negative_sd_tags || []))}
										title="ネガティブプロンプトをコピー"
									>
										📋
									</button>
								</div>
								<div class="bg-base-100 rounded p-2 font-mono text-xs leading-relaxed">
									{formatTags(metadata.sdParameters.negative_sd_tags)}
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

			<!-- 撮影情報 (任意) -->
			{#if metadata.camera || metadata.lens || metadata.settings}
				<div class="rounded-lg bg-base-300 p-4">
					<h3 class="mb-3 text-base font-semibold">撮影情報</h3>
					<div class="space-y-2 text-sm">
						{#if metadata.camera}
							<div class="flex justify-between">
								<div class="text-base-content/70">カメラ:</div>
								<div>{metadata.camera}</div>
							</div>
						{/if}

						{#if metadata.lens}
							<div class="flex justify-between">
								<div class="text-base-content/70">レンズ:</div>
								<div>{metadata.lens}</div>
							</div>
						{/if}

						{#if metadata.settings}
							<div class="flex flex-col gap-1">
								<div class="text-base-content/70">設定:</div>
								<div class="font-mono text-xs">{metadata.settings}</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
