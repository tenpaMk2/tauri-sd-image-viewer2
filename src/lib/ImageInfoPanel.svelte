<script lang="ts">
	type ImageMetadata = {
		filename: string;
		size: string;
		dimensions: string;
		format: string;
		created: string;
		modified: string;
		camera?: string;
		lens?: string;
		settings?: string;
	};

	const {
		metadata
	}: {
		metadata: ImageMetadata;
	} = $props();
</script>

<!-- 右側: 情報ペイン (固定幅) -->
<div class="w-80 overflow-y-auto bg-base-200 shadow-2xl">
	<div class="p-4">
		<h2 class="mb-4 text-lg font-bold">画像情報</h2>
		<div class="space-y-4">
			<!-- 基本情報 -->
			<div class="rounded-lg bg-base-300 p-4">
				<h3 class="mb-3 text-base font-semibold">基本情報</h3>
				<div class="space-y-2 text-sm">
					<div class="flex flex-col gap-1">
						<div class="text-base-content/70">ファイル名:</div>
						<div class="font-mono text-xs break-all">{metadata.filename}</div>
					</div>

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